import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { InventoryClient } from "@/components/inventory/inventory-client";
import type { InventoryRow } from "@/hooks/use-realtime-inventory";

export default async function InventoryPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: rows }, { data: vendors }, { data: regions }, { data: categories }] =
    await Promise.all([
      supabase
        .from("regional_inventory")
        .select(
          "*, region:regions(name), item:catalog_items(name, sku, category, image_url, b2b_price, sale_price, kids_b2b_price, kids_sale_price, vendor_id, jetty_name, jetty_location_url, reporting_time, vendor:vendors(name))",
        )
        .order("region_id"),
      supabase.from("vendors").select("id, name").order("name"),
      supabase.from("regions").select("id, name").order("name"),
      supabase.from("vendor_categories").select("id, name").order("name"),
    ]);

  return (
    <InventoryClient
      initialRows={(rows ?? []) as unknown as InventoryRow[]}
      profile={profile}
      vendors={(vendors ?? []).map((v) => ({ ...v, name: v.name ?? "Unnamed vendor" }))}
      regions={regions ?? []}
      categories={categories ?? []}
    />
  );
}
