import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { normalizeLeadSource, phoneDigits } from "@/lib/lead-source";
import { kommoFetch, KommoError } from "@/lib/kommo";

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
 * The brand picked in Kommo's "LEAD SOURCE" select (KOMMO_BRAND_FIELD_ID, default 1886161).
 * Variants of the two main brands ("Waterz FB", "Life On Yachts Goa") are folded into their canonical
 * name; any other option ("Goa Cruising", ...) is used as-is so new Kommo options show up on their own.
 */
function brandFromSelect(fields: KommoCustomField[] | null | undefined) {
  const id = Number(process.env.KOMMO_BRAND_FIELD_ID || 1886161);
  const raw = fields?.find((f) => f.field_id === id)?.values?.[0]?.value;
  const value = raw == null ? "" : String(raw).trim();
  if (!value) return null;
  if (/life\s*on\s*yachts|\bloy\b/i.test(value)) return "Life on Yachts";
  if (/waterz|gowaterz|\bwz\b/i.test(value)) return "Waterz Goa";
  return value;
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
  field_id?: number | null;
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

/**
 * Lead IDs from Kommo's form-encoded body: leads[add|status|update][0][id]=123 are re-synced,
 * leads[delete][0][id]=123 are removed from the dashboard.
 */
function leadIdsFromForm(form: URLSearchParams) {
  const sync = new Set<number>();
  const remove = new Set<number>();
  for (const [key, value] of form) {
    const m = key.match(/^leads\[(add|status|update|delete)\]\[\d+\]\[id\]$/);
    const id = Number(value);
    if (!m || !Number.isFinite(id) || id <= 0) continue;
    (m[1] === "delete" ? remove : sync).add(id);
  }
  return { sync: [...sync], remove: [...remove] };
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
  try {
    return await kommoFetch<T>(subdomain, token, path);
  } catch (e) {
    if (e instanceof KommoError && e.status === 404) return null;
    throw e;
  }
}

type KommoEnv = {
  subdomain: string;
  token: string;
  supabaseUrl: string;
  serviceRoleKey: string;
};

function kommoEnv(): KommoEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const subdomain = process.env.KOMMO_SUBDOMAIN;
  const token = process.env.KOMMO_LONG_LIVED_TOKEN;
  if (!supabaseUrl || !serviceRoleKey || !subdomain || !token) {
    console.error("Kommo webhook: missing Supabase or Kommo env vars");
    return null;
  }
  return { subdomain, token, supabaseUrl, serviceRoleKey };
}

function serviceClient(env: KommoEnv) {
  return createServiceRoleClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function mainContactId(lead: KommoLead) {
  return (
    lead._embedded?.contacts?.find((c) => c.is_main)?.id ??
    lead._embedded?.contacts?.[0]?.id ??
    null
  );
}

/** Source names by ID, looked up once per run (failures fall back to null; other hints still work). */
function sourceLookup(env: KommoEnv) {
  const cache = new Map<number, Promise<string | null>>();
  return (id: number | null | undefined) => {
    if (!id) return Promise.resolve(null);
    if (!cache.has(id)) {
      cache.set(
        id,
        kommoGet<{ name?: string }>(env.subdomain, env.token, `/sources/${id}`)
          .then((s) => s?.name ?? null)
          .catch(() => null),
      );
    }
    return cache.get(id)!;
  };
}

/** The kommo_leads row for a lead, its main contact and its source name. */
function leadRow(
  lead: KommoLead,
  contact: KommoContact | null,
  sourceName: string | null,
) {
  const fields = lead.custom_fields_values;
  const phone = fieldValue(contact?.custom_fields_values, "PHONE");
  const utmSource = fieldValue(fields, "UTM_SOURCE");
  const utmMedium = fieldValue(fields, "UTM_MEDIUM");
  const utmCampaign = fieldValue(fields, "UTM_CAMPAIGN");
  const gclid = fieldValue(fields, "GCLID");
  const refCode = fieldValue(fields, "REF_CODE", "Ref code", "Reference code");
  const tags = (lead._embedded?.tags ?? []).map((t) => t.name);
  const channel = [sourceName, lead._embedded?.source?.name, lead.name, ...tags]
    .filter(Boolean)
    .join(" ");
  const fieldTexts = (fields ?? []).flatMap((f) =>
    (f.values ?? []).map((v) => (v.value == null ? null : String(v.value))),
  );
  const brand =
    brandFromSelect(fields) ??
    brandFromSource([
      sourceName,
      lead._embedded?.source?.name,
      ...tags,
      ...fieldTexts,
      lead.name,
    ]);
  return {
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
  };
}

/** Remove a lead deleted in Kommo. Linked bookings keep their data; their kommo_lead_id becomes null. */
async function deleteLead(leadId: number) {
  const env = kommoEnv();
  if (!env) return;
  const { error } = await serviceClient(env)
    .from("kommo_leads")
    .delete()
    .eq("kommo_lead_id", leadId);
  if (error) throw new Error(`delete lead ${leadId}: ${error.message}`);
}

/** Fetch one lead plus its main contact and save it. Safe to repeat: upserts on kommo_lead_id. */
async function syncLead(leadId: number) {
  const env = kommoEnv();
  if (!env) return;

  const lead = await kommoGet<KommoLead>(
    env.subdomain,
    env.token,
    `/leads/${leadId}?with=contacts,source_id`,
  );
  if (!lead) {
    // Gone from Kommo (deleted): drop it from the dashboard too.
    await deleteLead(leadId);
    return;
  }
  if (!allowedPipeline(lead.pipeline_id)) {
    console.warn(
      `Kommo webhook: lead ${leadId} skipped, pipeline ${lead.pipeline_id} is not in KOMMO_PIPELINE_LOY_WZ`,
    );
    return;
  }

  const contactId = mainContactId(lead);
  const contact = contactId
    ? await kommoGet<KommoContact>(
        env.subdomain,
        env.token,
        `/contacts/${contactId}`,
      )
    : null;
  const sourceName = await sourceLookup(env)(lead.source_id);

  const { error } = await serviceClient(env)
    .from("kommo_leads")
    .upsert(leadRow(lead, contact, sourceName), {
      onConflict: "kommo_lead_id",
    });
  if (error)
    console.error(`Kommo webhook: saving lead ${leadId} failed`, error.message);
}

/**
 * Import every lead created since `fromDate` (YYYY-MM-DD, India time), 250 per page,
 * with contacts fetched in batches. Safe to repeat: upserts on kommo_lead_id.
 */
async function backfillLeads(fromDate: string) {
  const env = kommoEnv();
  if (!env) return;
  const supabase = serviceClient(env);
  const sourceName = sourceLookup(env);
  const from = Math.floor(
    new Date(`${fromDate}T00:00:00+05:30`).getTime() / 1000,
  );
  const pipelineIds = (process.env.KOMMO_PIPELINE_LOY_WZ ?? "")
    .split(",")
    .map((x) => x.trim().match(/(\d+)\/?$/)?.[1])
    .filter(Boolean);

  let saved = 0;
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      with: "contacts,source_id",
      limit: "250",
      page: String(page),
      "filter[created_at][from]": String(from),
    });
    for (const id of pipelineIds) query.append("filter[pipeline_id][]", id!);
    const res = await kommoGet<{ _embedded?: { leads?: KommoLead[] } }>(
      env.subdomain,
      env.token,
      `/leads?${query}`,
    );
    const leads = (res?._embedded?.leads ?? []).filter((l) =>
      allowedPipeline(l.pipeline_id),
    );
    if (leads.length === 0 && !res?._embedded?.leads?.length) break;

    const contactIds = [
      ...new Set(
        leads.map(mainContactId).filter((id): id is number => id != null),
      ),
    ];
    const contacts = new Map<number, KommoContact>();
    for (let i = 0; i < contactIds.length; i += 250) {
      const q = new URLSearchParams({ limit: "250" });
      for (const id of contactIds.slice(i, i + 250))
        q.append("filter[id][]", String(id));
      const batch = await kommoGet<{
        _embedded?: { contacts?: KommoContact[] };
      }>(env.subdomain, env.token, `/contacts?${q}`);
      for (const c of batch?._embedded?.contacts ?? []) contacts.set(c.id, c);
    }

    const rows = await Promise.all(
      leads.map(async (lead) => {
        const id = mainContactId(lead);
        return leadRow(
          lead,
          id ? (contacts.get(id) ?? null) : null,
          await sourceName(lead.source_id),
        );
      }),
    );
    if (rows.length) {
      const { error } = await supabase
        .from("kommo_leads")
        .upsert(rows, { onConflict: "kommo_lead_id" });
      if (error) {
        console.error(
          `Kommo backfill: saving page ${page} failed`,
          error.message,
        );
        return;
      }
      saved += rows.length;
    }
    console.log(`Kommo backfill: page ${page}, ${saved} leads saved so far`);
    if ((res?._embedded?.leads?.length ?? 0) < 250) break;
  }
  console.log(`Kommo backfill from ${fromDate} done: ${saved} leads`);
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
  let deletedIds: number[] = [];
  if (contentType.includes("application/json")) {
    // Manual tests: {"lead_id": 123} or {"lead_ids": [1, 2]}
    try {
      const json = JSON.parse(body) as {
        lead_id?: number;
        lead_ids?: number[];
        backfill_from?: string;
      };
      // One-off import: {"backfill_from": "2026-11-01"}
      if (json.backfill_from) {
        const fromDate = json.backfill_from;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
          return NextResponse.json(
            { error: "backfill_from must be YYYY-MM-DD" },
            { status: 400 },
          );
        }
        after(() =>
          backfillLeads(fromDate).catch((e) =>
            console.error(
              "Kommo backfill failed",
              e instanceof Error ? e.message : e,
            ),
          ),
        );
        return NextResponse.json({ ok: true, backfill_from: fromDate });
      }
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
    ({ sync: leadIds, remove: deletedIds } = leadIdsFromForm(
      new URLSearchParams(body),
    ));
  }

  after(async () => {
    for (const id of deletedIds) {
      try {
        await deleteLead(id);
      } catch (e) {
        console.error(
          `Kommo webhook: deleting lead ${id} failed`,
          e instanceof Error ? e.message : e,
        );
      }
    }
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

  return NextResponse.json({
    ok: true,
    leads: leadIds.length,
    deleted: deletedIds.length,
  });
}
