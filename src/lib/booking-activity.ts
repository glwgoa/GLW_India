/** Short code + label for a booking's activity (catalog category), e.g. DC = Dinner Cruise. */
export function activityCode(category: string | null | undefined): { code: string; label: string } {
  const name = (category ?? "").trim();
  if (!name) return { code: "—", label: "Unknown" };
  const lower = name.toLowerCase();
  if (lower.includes("dinner")) return { code: "DC", label: name };
  if (lower.includes("sunset")) return { code: "SC", label: name };
  if (lower.includes("yacht")) return { code: "YC", label: name };
  if (lower.includes("water")) return { code: "WS", label: name };
  if (lower.includes("goa trip")) return { code: "GT", label: name };
  const initials = name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
  return { code: initials || "—", label: name };
}
