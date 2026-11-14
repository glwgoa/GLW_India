import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DINNER_CRUISE_CATEGORY_NAME,
  GOA_TRIP_CATEGORY_NAME,
  YACHT_CATEGORY_NAME,
} from "@/lib/booking-yacht";

const SKU_PREFIX: Record<string, string> = {
  [DINNER_CRUISE_CATEGORY_NAME]: "DC",
  [YACHT_CATEGORY_NAME]: "YC",
  [GOA_TRIP_CATEGORY_NAME]: "WS",
};

/** Next free SKU for a category, e.g. DC-001, DC-002… Other categories use "PR". */
export async function generateSku(supabase: SupabaseClient, category: string) {
  const prefix = SKU_PREFIX[category] ?? "PR";
  const { data } = await supabase.from("catalog_items").select("sku").ilike("sku", `${prefix}-%`);
  let max = 0;
  for (const { sku } of data ?? []) {
    const n = /^\w+-(\d+)$/.exec(sku as string);
    if (n) max = Math.max(max, Number(n[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
