"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Package, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditProductDialog } from "./edit-product-dialog";
import { ProductDetailDialog } from "./product-detail-dialog";
import type { InventoryRow } from "@/hooks/use-realtime-inventory";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

type AggregatedRow = InventoryRow & { regionCount?: number };

function formatPrice(value: number | null) {
  return value == null ? "—" : `₹${value.toLocaleString("en-IN")}`;
}

export function InventoryGrid({
  rows,
  setRows,
  profile,
  aggregated,
  vendors,
  regions,
  categories,
  refresh,
}: {
  rows: AggregatedRow[];
  setRows: React.Dispatch<React.SetStateAction<InventoryRow[]>>;
  profile: Profile;
  aggregated: boolean;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  refresh: () => void | Promise<void>;
}) {
  const [selectedRow, setSelectedRow] = useState<AggregatedRow | null>(null);

  // Editing/deleting the product itself (catalog_items) is admin/developer
  // only by RLS — PMs can edit/remove regional stock but not the product
  // record, so they never see these controls.
  function canEditProduct() {
    return isPrivileged(profile.role);
  }

  function canDelete() {
    return isPrivileged(profile.role);
  }

  const canBook = isPrivileged(profile.role) || profile.role === "project_manager";

  async function deleteRow(row: AggregatedRow) {
    const label = row.item?.name ?? "this item";
    const regionCount = row.regionCount ?? 1;
    const scope = aggregated && regionCount > 1 ? ` across all ${regionCount} regions` : "";

    if (
      !window.confirm(
        `Permanently delete ${label}${scope}? This removes the product itself, not just its stock — this cannot be undone.`,
      )
    ) {
      return;
    }

    const supabase = createClient();
    // Deleting the product cascades to every regional_inventory row for it
    // (ON DELETE CASCADE), so one delete clears it out of every region.
    const { error } = await supabase.from("catalog_items").delete().eq("id", row.item_id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.item_id !== row.item_id));
    toast.success("Product deleted");
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No inventory items for this selection.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((row, index) => {
        const editableProduct = canEditProduct() && row.item;
        const deletable = canDelete();

        return (
          <Card
            key={row.id}
            className="group animate-in fade-in-0 zoom-in-95 fill-mode-both cursor-pointer overflow-hidden gap-0 p-0 duration-500 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
            style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
            onClick={() => row.item && setSelectedRow(row)}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {row.item?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.item.image_url}
                  alt={row.item?.name ?? ""}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              {row.item?.category && (
                <span className="absolute top-2 left-2 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                  {row.item.category}
                </span>
              )}

              <div className="absolute top-2 right-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                {editableProduct && (
                  <EditProductDialog
                    itemId={row.item_id}
                    item={row.item!}
                    vendors={vendors}
                    categories={categories}
                    onSaved={refresh}
                  />
                )}
                {deletable && (
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    aria-label="Remove from inventory"
                    className="border border-white/20 backdrop-blur-md"
                    onClick={() => deleteRow(row)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 space-y-0.5 p-3">
                <div className="line-clamp-1 text-sm font-semibold text-white drop-shadow-sm">
                  {row.item?.name ?? "—"}
                </div>
                <div className="line-clamp-1 text-[11px] text-white/75">
                  {row.item?.sku ?? "—"}
                  {row.item?.vendor?.name ? ` · ${row.item.vendor.name}` : ""}
                  {!aggregated && row.region?.name ? ` · ${row.region.name}` : ""}
                </div>
              </div>
            </div>

            <CardContent className="flex items-center justify-between gap-2 p-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Sale price
                </span>
                <span className="text-base font-bold tabular-nums">
                  {formatPrice(row.item?.sale_price ?? null)}
                </span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  B2B price
                </span>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {formatPrice(row.item?.b2b_price ?? null)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {selectedRow && (
        <ProductDetailDialog
          open={!!selectedRow}
          onOpenChange={(o) => !o && setSelectedRow(null)}
          row={selectedRow}
          vendors={vendors}
          regions={regions}
          canBook={canBook}
          onBooked={refresh}
        />
      )}
    </div>
  );
}
