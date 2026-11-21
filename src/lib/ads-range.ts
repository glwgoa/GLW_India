export const AD_RANGES = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year", label: "This year" },
  { key: "custom", label: "Custom range" },
] as const;

export type AdRangeKey = (typeof AD_RANGES)[number]["key"];

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Resolve a range key (+ custom from/to) to inclusive YYYY-MM-DD dates, in IST. */
export function resolveAdRange(key?: string, from?: string, to?: string) {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000); // IST "today" as UTC fields
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (offset: number) => new Date(today.getTime() + offset * 86400000);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  let start = day(-29);
  let end = today;
  let k: AdRangeKey = "30d";
  switch (key) {
    case "today": k = "today"; start = today; break;
    case "yesterday": k = "yesterday"; start = end = day(-1); break;
    case "7d": k = "7d"; start = day(-6); break;
    case "this_month": k = "this_month"; start = new Date(Date.UTC(y, m, 1)); break;
    case "last_month": k = "last_month"; start = new Date(Date.UTC(y, m - 1, 1)); end = new Date(Date.UTC(y, m, 0)); break;
    case "this_year": k = "this_year"; start = new Date(Date.UTC(y, 0, 1)); break;
    case "custom":
      if (from && to && DATE.test(from) && DATE.test(to) && from <= to) {
        k = "custom"; start = new Date(from); end = new Date(to);
      }
      break;
  }
  const label = AD_RANGES.find((r) => r.key === k)!.label;
  return { key: k, start: ymd(start), end: ymd(end), label };
}
