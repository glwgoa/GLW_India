"use client";

import { useMemo } from "react";
import { useRegion } from "@/lib/region-context";
import { useRealtimeInventory, type InventoryRow } from "@/hooks/use-realtime-inventory";
import { InventoryGrid } from "./inventory-grid";
import { AddInventoryDialog } from "./add-inventory-dialog";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

export function InventoryClient({
  initialRows,
  profile,
  vendors,
  regions,
  categories,
}: {
  initialRows: InventoryRow[];
  profile: Profile;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const { selectedRegionId } = useRegion();
  const { rows, setRows, refresh } = useRealtimeInventory(initialRows);
  const aggregated = selectedRegionId === "all";
  const canAddProduct = isPrivileged(profile.role);

  const visibleRows = useMemo(() => {
    if (!aggregated) {
      return rows.filter((row) => row.region_id === selectedRegionId);
    }

    const byItem = new Map<string, InventoryRow & { regionCount: number }>();
    for (const row of rows) {
      const existing = byItem.get(row.item_id);
      if (existing) {
        existing.stock_quantity += row.stock_quantity;
        existing.reserved_quantity += row.reserved_quantity;
        existing.regionCount += 1;
      } else {
        byItem.set(row.item_id, { ...row, regionCount: 1 });
      }
    }
    return Array.from(byItem.values());
  }, [rows, selectedRegionId, aggregated]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {aggregated
              ? "Aggregated stock across all regions — live updates, read-only."
              : "Live stock levels for the selected region."}
          </p>
        </div>
        {canAddProduct && (
          <AddInventoryDialog
            vendors={vendors}
            regions={regions}
            categories={categories}
            onAdded={refresh}
          />
        )}
      </div>
      <InventoryGrid
        rows={visibleRows}
        setRows={setRows}
        profile={profile}
        aggregated={aggregated}
        vendors={vendors}
        categories={categories}
        refresh={refresh}
      />
    </div>
  );
}
