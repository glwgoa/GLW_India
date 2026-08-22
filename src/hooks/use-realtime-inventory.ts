"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type InventoryRow = {
  id: string;
  region_id: string;
  item_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  region: { name: string } | null;
  item: {
    name: string;
    sku: string;
    category: string | null;
    image_url: string | null;
    b2b_price: number | null;
    sale_price: number | null;
    vendor_id: string | null;
    jetty_name: string | null;
    jetty_location_url: string | null;
    reporting_time: string | null;
    vendor: { name: string } | null;
  } | null;
};

const SELECT =
  "*, region:regions(name), item:catalog_items(name, sku, category, image_url, b2b_price, sale_price, vendor_id, jetty_name, jetty_location_url, reporting_time, vendor:vendors(name))";

export function useRealtimeInventory(initial: InventoryRow[]) {
  const [rows, setRows] = useState<InventoryRow[]>(initial);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("regional_inventory").select(SELECT).order("region_id");
    if (data) setRows(data as unknown as InventoryRow[]);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("regional-inventory-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "regional_inventory" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "catalog_items" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { rows, setRows, refresh };
}
