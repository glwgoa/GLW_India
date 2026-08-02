"use client";

import { toast } from "sonner";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import type { InventoryRow } from "@/hooks/use-realtime-inventory";
import type { Profile } from "@/types/profile";

type AggregatedRow = InventoryRow & { regionCount?: number };

function formatPrice(value: number | null) {
  return value == null ? "—" : `₹${value.toLocaleString("en-IN")}`;
}

export function InventoryGrid({
  rows,
  setRows,
  profile,
  aggregated,
}: {
  rows: AggregatedRow[];
  setRows: React.Dispatch<React.SetStateAction<InventoryRow[]>>;
  profile: Profile;
  aggregated: boolean;
}) {
  function canEditStock(row: InventoryRow) {
    if (aggregated) return false;
    if (profile.role === "admin") return true;
    if (profile.role === "project_manager") return row.region_id === profile.region_id;
    return false;
  }

  async function updateStock(row: InventoryRow, value: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from("regional_inventory")
      .update({ stock_quantity: value })
      .eq("id", row.id);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, stock_quantity: value } : r)));
    toast.success("Stock updated");
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No inventory items for this selection.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((row) => {
        const available = row.stock_quantity - row.reserved_quantity;
        const lowStock = available <= LOW_STOCK_THRESHOLD;
        const editableStock = canEditStock(row);

        return (
          <Card key={row.id} className="overflow-hidden py-0 gap-0">
            <div className="aspect-square w-full bg-muted">
              {row.item?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.item.image_url}
                  alt={row.item?.name ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            <CardHeader className="gap-1 pt-3">
              <div className="line-clamp-2 text-sm font-medium">{row.item?.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {row.item?.sku ?? "—"}
                {row.item?.vendor?.name ? ` · ${row.item.vendor.name}` : ""}
                {!aggregated && row.region?.name ? ` · ${row.region.name}` : ""}
              </div>
            </CardHeader>

            <CardContent className="flex items-baseline justify-between pt-2">
              <span className="text-base font-semibold">{formatPrice(row.item?.sale_price ?? null)}</span>
              <span className="text-xs text-muted-foreground">
                B2B {formatPrice(row.item?.b2b_price ?? null)}
              </span>
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-2 border-t py-3">
              {editableStock ? (
                <div className="flex items-center gap-1.5">
                  <Label htmlFor={`stock-${row.id}`} className="text-xs text-muted-foreground">
                    Stock
                  </Label>
                  <Input
                    id={`stock-${row.id}`}
                    type="number"
                    defaultValue={row.stock_quantity}
                    className="h-7 w-16"
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isNaN(value) && value !== row.stock_quantity) {
                        updateStock(row, value);
                      }
                    }}
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Stock {row.stock_quantity}</span>
              )}
              <Badge variant={lowStock ? "destructive" : "secondary"}>{available} left</Badge>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
