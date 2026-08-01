"use client";

import { toast } from "sonner";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import type { InventoryRow } from "@/hooks/use-realtime-inventory";
import type { Profile } from "@/types/profile";

type AggregatedRow = InventoryRow & { regionCount?: number };

function formatPrice(value: number | null) {
  return value == null ? "—" : `₹${value.toLocaleString("en-IN")}`;
}

export function InventoryTable({
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Vendor</TableHead>
            {!aggregated && <TableHead>Region</TableHead>}
            <TableHead>B2B price</TableHead>
            <TableHead>Sale price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Reserved</TableHead>
            <TableHead>Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const available = row.stock_quantity - row.reserved_quantity;
            const lowStock = available <= LOW_STOCK_THRESHOLD;
            const editableStock = canEditStock(row);

            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {row.item?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.item.image_url}
                        alt={row.item?.name ?? ""}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{row.item?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.item?.category ?? ""}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.item?.sku ?? "—"}</TableCell>
                <TableCell>{row.item?.vendor?.name ?? "—"}</TableCell>
                {!aggregated && <TableCell>{row.region?.name ?? "—"}</TableCell>}
                <TableCell>{formatPrice(row.item?.b2b_price ?? null)}</TableCell>
                <TableCell>{formatPrice(row.item?.sale_price ?? null)}</TableCell>
                <TableCell>
                  {editableStock ? (
                    <Input
                      type="number"
                      defaultValue={row.stock_quantity}
                      className="w-20"
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isNaN(value) && value !== row.stock_quantity) {
                          updateStock(row, value);
                        }
                      }}
                    />
                  ) : (
                    row.stock_quantity
                  )}
                </TableCell>
                <TableCell>{row.reserved_quantity}</TableCell>
                <TableCell>
                  <Badge variant={lowStock ? "destructive" : "secondary"}>{available}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
