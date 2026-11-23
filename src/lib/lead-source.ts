/** Lead sources staff can pick by hand. The Kommo webhook maps onto the same values. */
export const LEAD_SOURCES = [
  "Google Ads",
  "Google Ads – Lead form",
  "WhatsApp / Phone",
  "Instagram",
  "Facebook",
  "Website",
  "Referral",
  "Walk-in",
  "Agent / B2B",
  "Repeat customer",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

type SourceHints = {
  utmSource?: string | null;
  utmMedium?: string | null;
  gclid?: string | null;
  /** Kommo's own source / channel name (e.g. "WhatsApp", "Google Lead Form"). */
  channel?: string | null;
};

/** Turn raw UTM / Kommo channel values into one of LEAD_SOURCES. */
export function normalizeLeadSource({ utmSource, utmMedium, gclid, channel }: SourceHints): LeadSource {
  const src = (utmSource ?? "").toLowerCase();
  const med = (utmMedium ?? "").toLowerCase();
  const ch = (channel ?? "").toLowerCase();

  if (ch.includes("lead form") || ch.includes("leadform") || ch.includes("google lead")) return "Google Ads – Lead form";
  if (gclid || (src.includes("google") && ["cpc", "ppc", "paid", "paidsearch"].includes(med))) return "Google Ads";
  if (src.includes("instagram") || src === "ig" || ch.includes("instagram")) return "Instagram";
  if (src.includes("facebook") || src === "fb" || ch.includes("facebook") || ch.includes("messenger")) return "Facebook";
  if (ch.includes("whatsapp") || ch.includes("phone") || ch.includes("call") || src.includes("whatsapp")) {
    return "WhatsApp / Phone";
  }
  if (src || ch.includes("site") || ch.includes("form")) return "Website";
  return "WhatsApp / Phone";
}

/** Last 10 digits of a phone number, so "+91 98765-43210" and "9876543210" match. */
export function phoneDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}
