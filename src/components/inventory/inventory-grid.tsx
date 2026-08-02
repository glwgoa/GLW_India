"use client";

import { toast } from "sonner";
import { Package, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  function canDelete(row: InventoryRow) {
    // Aggregated cards span multiple regions' rows — only admins (who can
    // write to every region) get to delete across all of them from here.
    // PMs still delete from the single-region view (canEditStock above).
    if (aggregated) return profile.role === "admin";
    return canEditStock(row);
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

  async function deleteRow(row: AggregatedRow) {
    const label = row.item?.name ?? "this item";
    const supabase = createClient();

    if (aggregated) {
      const regionCount = row.regionCount ?? 1;
      const scope = regionCount > 1 ? `all ${regionCount} regions it's stocked in` : "its region";
      if (
        !window.confirm(
          `Remove ${label} from ${scope}? This only removes stock tracking — the product itself isn't deleted.`,
        )
      ) {
        return;
      }
      const { error } = await supabase.from("regional_inventory").delete().eq("item_id", row.item_id);
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        return;
      }
      setRows((prev) => prev.filter((r) => r.item_id !== row.item_id));
      toast.success("Removed from inventory");
      return;
    }

    const region = row.region?.name ? ` in ${row.region.name}` : "";
    if (
      !window.confirm(
        `Remove ${label}${region} from inventory? This only removes stock tracking here — the product itself isn't deleted.`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("regional_inventory").delete().eq("id", row.id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Removed from inventory");
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
        const deletable = canDelete(row);

        return (
          <Card key={row.id} className="overflow-hidden py-0 gap-0">
            <div className="relative aspect-square w-full bg-muted">
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
              {deletable && (
                <Button
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Remove from inventory"
                  className="absolute top-2 right-2"
                  onClick={() => deleteRow(row)}
                >
                  <Trash2 />
                </Button>
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
