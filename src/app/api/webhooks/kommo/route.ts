import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { normalizeLeadSource, phoneDigits } from "@/lib/lead-source";

/**
 * Kommo "lead added / lead status changed" webhook: /api/webhooks/kommo?secret=...
 * One Kommo account and one Goa pipeline (KOMMO_PIPELINE_LOY_WZ) serve both brands;
 * the lead's source decides the brand. Each brand has keywords (KOMMO_BRAND_LOY / KOMMO_BRAND_WZ,
 * comma-separated; defaults below) matched against the source name, tags and custom field values.
 * Kommo wants a reply within ~2s, so we answer at once and fetch the full lead afterwards.
 */

const BRAND_KEYWORDS: { name: string; envKey: string; defaults: string }[] = [
  {
    name: "Life on Yachts",
    envKey: "KOMMO_BRAND_LOY",
    defaults: "loy,life on yachts,lifeonyachts",
  },
  { name: "Waterz Goa", envKey: "KOMMO_BRAND_WZ", defaults: "wz,waterz" },
];

/** Whole-word, case-insensitive match, so "wz" doesn't hit inside other words. */
function hasKeyword(text: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text);
}

/** Brand from the lead's source text, or null when no brand (or both brands) match. */
function brandFromSource(texts: (string | null | undefined)[]) {
  const text = texts.filter(Boolean).join(" | ");
  const matches = BRAND_KEYWORDS.filter(({ envKey, defaults }) =>
    (process.env[envKey] || defaults)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .some((k) => hasKeyword(text, k)),
  );
  return matches.length === 1 ? matches[0].name : null;
}

/**
 * Pipeline IDs we save leads from (KOMMO_PIPELINE_LOY_WZ, comma-separated). Empty means every pipeline.
 * Each entry may be the ID or the pipeline's URL (".../leads/pipeline/6262459"); the last number is used.
 */
function allowedPipeline(pipelineId: number | undefined) {
  const ids = (process.env.KOMMO_PIPELINE_LOY_WZ ?? "")
    .split(",")
    .map((x) => x.trim().match(/(\d+)\/?$/)?.[1])
    .filter((x): x is string => Boolean(x))
    .map(Number);
  return ids.length === 0 || (pipelineId != null && ids.includes(pipelineId));
}

type KommoCustomField = {
  field_code?: string | null;
  field_name?: string | null;
  values?: { value?: unknown; enum_code?: string | null }[];
};

type KommoLead = {
  id: number;
  name?: string;
  status_id?: number;
  pipeline_id?: number;
  source_id?: number | null;
  created_at?: number;
  custom_fields_values?: KommoCustomField[] | null;
  _embedded?: {
    contacts?: { id: number; is_main?: boolean }[];
    tags?: { name?: string }[];
    source?: { name?: string } | null;
  };
};

type KommoContact = {
  id: number;
  name?: string;
  custom_fields_values?: KommoCustomField[] | null;
};

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Lead IDs from Kommo's form-encoded body, e.g. leads[add][0][id]=123 or leads[status][0][id]=123. */
function leadIdsFromForm(form: URLSearchParams) {
  const ids = new Set<number>();
  for (const [key, value] of form) {
    if (/^leads\[(add|status|update)\]\[\d+\]\[id\]$/.test(key)) {
      const id = Number(value);
      if (Number.isFinite(id) && id > 0) ids.add(id);
    }
  }
  return [...ids];
}

function fieldValue(
  fields: KommoCustomField[] | null | undefined,
  ...names: string[]
) {
  const wanted = names.map((n) => n.toLowerCase());
  const field = fields?.find(
    (f) =>
      wanted.includes((f.field_code ?? "").toLowerCase()) ||
      wanted.includes((f.field_name ?? "").toLowerCase()),
  );
  const v = field?.values?.[0]?.value;
  return v == null || v === "" ? null : String(v);
}

async function kommoGet<T>(
  subdomain: string,
  token: string,
  path: string,
): Promise<T | null> {
  // Accept "acme", "acme.kommo.com" or "https://acme.kommo.com/".
  const host = subdomain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.kommo\.com$/, "");
  const res = await fetch(`https://${host}.kommo.com/api/v4${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Kommo ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** Fetch one lead plus its main contact and save it. Safe to repeat: upserts on kommo_lead_id. */
async function syncLead(leadId: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const subdomain = process.env.KOMMO_SUBDOMAIN;
  const token = process.env.KOMMO_LONG_LIVED_TOKEN;
  if (!supabaseUrl || !serviceRoleKey || !subdomain || !token) {
    console.error("Kommo webhook: missing Supabase or Kommo env vars");
    return;
  }

  const lead = await kommoGet<KommoLead>(
    subdomain,
    token,
    `/leads/${leadId}?with=contacts,source_id`,
  );
  if (!lead) {
    console.warn(`Kommo webhook: lead ${leadId} not found in Kommo`);
    return;
  }
  if (!allowedPipeline(lead.pipeline_id)) {
    console.warn(
      `Kommo webhook: lead ${leadId} skipped, pipeline ${lead.pipeline_id} is not in KOMMO_PIPELINE_LOY_WZ`,
    );
    return;
  }

  const mainContactId =
    lead._embedded?.contacts?.find((c) => c.is_main)?.id ??
    lead._embedded?.contacts?.[0]?.id ??
    null;
  const contact = mainContactId
    ? await kommoGet<KommoContact>(
        subdomain,
        token,
        `/contacts/${mainContactId}`,
      )
    : null;

  const fields = lead.custom_fields_values;
  const phone = fieldValue(contact?.custom_fields_values, "PHONE");
  const utmSource = fieldValue(fields, "UTM_SOURCE");
  const utmMedium = fieldValue(fields, "UTM_MEDIUM");
  const utmCampaign = fieldValue(fields, "UTM_CAMPAIGN");
  const gclid = fieldValue(fields, "GCLID");
  const refCode = fieldValue(fields, "REF_CODE", "Ref code", "Reference code");
  // Source name isn't embedded in the lead; look it up (ignore failures, other hints still work).
  const sourceName = lead.source_id
    ? await kommoGet<{ name?: string }>(
        subdomain,
        token,
        `/sources/${lead.source_id}`,
      )
        .then((s) => s?.name ?? null)
        .catch(() => null)
    : null;
  const channel = [
    sourceName,
    lead._embedded?.source?.name,
    lead.name,
    ...(lead._embedded?.tags ?? []).map((t) => t.name),
  ]
    .filter(Boolean)
    .join(" ");
  const fieldTexts = (fields ?? []).flatMap((f) =>
    (f.values ?? []).map((v) => (v.value == null ? null : String(v.value))),
  );
  const brand = brandFromSource([
    sourceName,
    lead._embedded?.source?.name,
    ...(lead._embedded?.tags ?? []).map((t) => t.name),
    ...fieldTexts,
    lead.name,
  ]);

  const supabase = createServiceRoleClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.from("kommo_leads").upsert(
    {
      kommo_lead_id: lead.id,
      brand,
      contact_name: contact?.name ?? null,
      phone,
      phone_digits: phoneDigits(phone),
      source: normalizeLeadSource({ utmSource, utmMedium, gclid, channel }),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      ref_code: refCode,
      gclid,
      status: lead.status_id != null ? String(lead.status_id) : null,
      raw_payload: { lead, contact },
      lead_created_at: lead.created_at
        ? new Date(lead.created_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "kommo_lead_id" },
  );
  if (error)
    console.error(`Kommo webhook: saving lead ${leadId} failed`, error.message);
}

export async function POST(request: NextRequest) {
  const expected = process.env.KOMMO_WEBHOOK_SECRET;
  const given = request.nextUrl.searchParams.get("secret") ?? "";
  if (!expected || !safeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.text();
  const contentType = request.headers.get("content-type") ?? "";
  let leadIds: number[] = [];
  if (contentType.includes("application/json")) {
    // Manual tests: {"lead_id": 123} or {"lead_ids": [1, 2]}
    try {
      const json = JSON.parse(body) as {
        lead_id?: number;
        lead_ids?: number[];
      };
      leadIds = [
        ...(json.lead_ids ?? []),
        ...(json.lead_id ? [json.lead_id] : []),
      ]
        .map(Number)
        .filter((n) => n > 0);
    } catch {
      return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }
  } else {
    leadIds = leadIdsFromForm(new URLSearchParams(body));
  }

  after(async () => {
    for (const id of leadIds) {
      try {
        await syncLead(id);
      } catch (e) {
        console.error(
          `Kommo webhook: lead ${id} failed`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  });

  return NextResponse.json({ ok: true, leads: leadIds.length });
}
