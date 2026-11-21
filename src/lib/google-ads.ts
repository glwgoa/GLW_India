import "server-only";
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

// Google Ads REST client. Credentials come from server env vars only:
// GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
// GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID (digits only),
// optional GOOGLE_ADS_LOGIN_CUSTOMER_ID (manager account).

const API = "https://googleads.googleapis.com/v24";

export type AdCampaign = {
  accountId: string;
  accountName: string;
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | string;
  budgetId: string;
  dailyBudget: number; // rupees (account currency)
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
};

type Creds = {
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
  oauth?: { clientId: string; clientSecret: string; refreshToken: string };
  serviceAccount?: { email: string; privateKey: string };
};

// Service account key: GOOGLE_ADS_SERVICE_ACCOUNT_JSON (the whole JSON, for Vercel)
// or GOOGLE_ADS_JSON_KEY_FILE_PATH (a file, for local dev).
function readServiceAccount() {
  try {
    const raw =
      process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON ||
      (process.env.GOOGLE_ADS_JSON_KEY_FILE_PATH ? readFileSync(process.env.GOOGLE_ADS_JSON_KEY_FILE_PATH, "utf8") : "");
    if (!raw) return undefined;
    const k = JSON.parse(raw) as { client_email?: string; private_key?: string };
    return k.client_email && k.private_key ? { email: k.client_email, privateKey: k.private_key } : undefined;
  } catch {
    return undefined;
  }
}

function env(): Creds | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/\D/g, "");
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/\D/g, "") || undefined;
  if (!developerToken || !customerId) return null;

  const serviceAccount = readServiceAccount();
  const { GOOGLE_ADS_CLIENT_ID: clientId, GOOGLE_ADS_CLIENT_SECRET: clientSecret, GOOGLE_ADS_REFRESH_TOKEN: refreshToken } =
    process.env;
  const oauth = clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : undefined;
  if (!serviceAccount && !oauth) return null;
  return { developerToken, customerId, loginCustomerId, oauth, serviceAccount };
}

export function isGoogleAdsConfigured() {
  return env() !== null;
}

const b64 = (v: object | Buffer) => Buffer.from(v instanceof Buffer ? v : JSON.stringify(v)).toString("base64url");

async function accessToken(e: Creds): Promise<string> {
  let params: URLSearchParams;
  if (e.serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
      iss: e.serviceAccount.email,
      scope: "https://www.googleapis.com/auth/adwords",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      ...(process.env.GOOGLE_ADS_IMPERSONATED_EMAIL ? { sub: process.env.GOOGLE_ADS_IMPERSONATED_EMAIL } : {}),
    })}`;
    const sig = createSign("RSA-SHA256").update(unsigned).sign(e.serviceAccount.privateKey);
    params = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64(sig)}`,
    });
  } else {
    params = new URLSearchParams({
      client_id: e.oauth!.clientId,
      client_secret: e.oauth!.clientSecret,
      refresh_token: e.oauth!.refreshToken,
      grant_type: "refresh_token",
    });
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Google Ads sign-in failed. Check the service account or refresh token.");
  return token.access_token;
}

async function call(path: string, body: unknown, customerId?: string) {
  const e = env();
  if (!e) throw new Error("Google Ads is not connected yet.");
  const res = await fetch(`${API}/customers/${customerId ?? e.customerId}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken(e)}`,
      "developer-token": e.developerToken,
      "Content-Type": "application/json",
      ...(e.loginCustomerId ? { "login-customer-id": e.loginCustomerId } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Google Ads request failed.");
  return json;
}

/** Enabled client accounts under the configured account (or the account itself if it isn't a manager). */
async function clientAccounts(): Promise<{ id: string; name: string }[]> {
  const json = await call("googleAds:search", {
    query: `SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager
      FROM customer_client WHERE customer_client.status = 'ENABLED'`,
  });
  return (json.results ?? [])
    .filter((r: { customerClient: { manager?: boolean } }) => !r.customerClient.manager)
    .map((r: { customerClient: { id: string; descriptiveName?: string } }) => ({
      id: String(r.customerClient.id),
      name: r.customerClient.descriptiveName ?? String(r.customerClient.id),
    }));
}

/** Campaigns (last 30 days) from every client account. */
export async function fetchCampaigns(start: string, end: string): Promise<AdCampaign[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error("Invalid date range.");
  const accounts = await clientAccounts();
  const perAccount = await Promise.all(
    accounts.map(async (a) => {
      const json = await call(
        "googleAds:search",
        {
          query: `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.id,
      campaign_budget.amount_micros, metrics.cost_micros, metrics.clicks,
      metrics.impressions, metrics.conversions
      FROM campaign WHERE campaign.status = 'ENABLED' AND campaign.primary_status NOT IN ('ENDED', 'PENDING', 'REMOVED') AND segments.date BETWEEN '${start}' AND '${end}'
      ORDER BY metrics.cost_micros DESC`,
        },
        a.id,
      );
      return (json.results ?? []).map((r: Record<string, Record<string, string | number>>) => ({
        accountId: a.id,
        accountName: a.name,
        id: String(r.campaign.id),
        name: String(r.campaign.name),
        status: String(r.campaign.status),
        budgetId: String(r.campaignBudget.id),
        dailyBudget: Number(r.campaignBudget.amountMicros) / 1e6,
        cost: Number(r.metrics.costMicros ?? 0) / 1e6,
        clicks: Number(r.metrics.clicks ?? 0),
        impressions: Number(r.metrics.impressions ?? 0),
        conversions: Number(r.metrics.conversions ?? 0),
      }));
    }),
  );
  return perAccount.flat().sort((a, b) => b.cost - a.cost);
}

export async function setCampaignStatus(accountId: string, campaignId: string, status: "ENABLED" | "PAUSED") {
  const e = env();
  if (!e) throw new Error("Google Ads is not connected yet.");
  await call("campaigns:mutate", {
    operations: [
      {
        update: { resourceName: `customers/${accountId}/campaigns/${campaignId}`, status },
        updateMask: "status",
      },
    ],
  }, accountId);
}

export async function setBudgetAmount(accountId: string, budgetId: string, dailyAmount: number) {
  const e = env();
  if (!e) throw new Error("Google Ads is not connected yet.");
  await call("campaignBudgets:mutate", {
    operations: [
      {
        update: {
          resourceName: `customers/${accountId}/campaignBudgets/${budgetId}`,
          amountMicros: String(Math.round(dailyAmount * 1e6)),
        },
        updateMask: "amountMicros",
      },
    ],
  }, accountId);
}
