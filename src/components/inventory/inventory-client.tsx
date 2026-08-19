"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useRegion } from "@/lib/region-context";
import { useRealtimeInventory, type InventoryRow } from "@/hooks/use-realtime-inventory";
import { InventoryGrid } from "./inventory-grid";
import { AddInventoryDialog } from "./add-inventory-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const visibleRows = useMemo(() => {
    const regionRows = aggregated ? rows : rows.filter((row) => row.region_id === selectedRegionId);

    let combined: (InventoryRow & { regionCount?: number })[];
    if (!aggregated) {
      combined = regionRows;
    } else {
      const byItem = new Map<string, InventoryRow & { regionCount: number }>();
      for (const row of regionRows) {
        const existing = byItem.get(row.item_id);
        if (existing) {
          existing.stock_quantity += row.stock_quantity;
          existing.reserved_quantity += row.reserved_quantity;
          existing.regionCount += 1;
        } else {
          byItem.set(row.item_id, { ...row, regionCount: 1 });
        }
      }
      combined = Array.from(byItem.values());
    }

    return combined.filter((row) => {
      if (nameFilter && !row.item?.name?.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      if (categoryFilter && row.item?.category !== categoryFilter) return false;
      return true;
    });
  }, [rows, selectedRegionId, aggregated, nameFilter, categoryFilter]);

  const hasFilters = nameFilter || categoryFilter;

  function clearFilters() {
    setNameFilter("");
    setCategoryFilter("");
  }

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

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inventory-name-filter" className="text-xs text-muted-foreground">
            Name
          </Label>
          <Input
            id="inventory-name-filter"
            placeholder="Search products..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "")}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue>{(value: string) => value || "All categories"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <div className="space-y-1.5">
            <Label className="invisible text-xs">Clear</Label>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear
            </Button>
          </div>
        )}
      </div>

      <InventoryGrid
        rows={visibleRows}
        setRows={setRows}
        profile={profile}
        aggregated={aggregated}
        vendors={vendors}
        regions={regions}
        categories={categories}
        refresh={refresh}
      />
    </div>
  );
}
