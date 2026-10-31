"use client";

import { useMemo, useState } from "react";
import { Boxes, X } from "lucide-react";
import { useRealtimeInventory, type InventoryRow } from "@/hooks/use-realtime-inventory";
import { InventoryGrid } from "./inventory-grid";
import { AddInventoryDialog } from "./add-inventory-dialog";
import { PageHeaderIcon } from "@/components/page-header-icon";
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
import { isPrivileged, isStaffRole } from "@/lib/auth/roles";

import type { InventoryCategory } from "@/types/inventory";

export function InventoryClient({
  initialRows,
  profile,
  vendors,
  defaultRegionId,
  categories,
}: {
  initialRows: InventoryRow[];
  profile: Profile;
  vendors: { id: string; name: string }[];
  /** Stock rows still need a region in the database; new products use this one. */
  defaultRegionId: string;
  categories: InventoryCategory[];
}) {
  const { rows, setRows, refresh } = useRealtimeInventory(initialRows);
  const canAddProduct = isPrivileged(profile.role) || isStaffRole(profile.role);
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const visibleRows = useMemo(() => {
    // Stock is kept per region in the database; show one total per product.
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
    const combined = Array.from(byItem.values());

    return combined.filter((row) => {
      if (nameFilter && !row.item?.name?.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      if (categoryFilter && row.item?.category !== categoryFilter) return false;
      return true;
    });
  }, [rows, nameFilter, categoryFilter]);

  const hasFilters = nameFilter || categoryFilter;

  function clearFilters() {
    setNameFilter("");
    setCategoryFilter("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeaderIcon icon={Boxes} color="var(--chart-2)" />
          <div>
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Live stock levels — updates automatically.
            </p>
          </div>
        </div>
        {canAddProduct && (
          <AddInventoryDialog
            vendors={vendors}
            defaultRegionId={defaultRegionId}
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
        vendors={vendors}
        categories={categories}
        refresh={refresh}
      />
    </div>
  );
}
