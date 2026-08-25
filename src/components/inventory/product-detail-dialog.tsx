"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Anchor, Building2, Clock, MapPin, Package, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import type { InventoryRow } from "@/hooks/use-realtime-inventory";

type AggregatedRow = InventoryRow & { regionCount?: number };

function formatPrice(value: number | null) {
  return value == null ? "—" : `₹${value.toLocaleString("en-IN")}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const childVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.6 },
  },
};

export function ProductDetailDialog({
  open,
  onOpenChange,
  row,
  vendors,
  regions,
  canBook,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AggregatedRow;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  canBook: boolean;
  onBooked: () => void | Promise<void>;
}) {
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = !shouldReduceMotion;
  const item = row.item;
  const available = row.stock_quantity - row.reserved_quantity;
  const lowStock = available <= LOW_STOCK_THRESHOLD;

  const products = item
    ? [
        {
          id: row.item_id,
          name: item.name,
          sale_price: item.sale_price,
          category: item.category,
          vendor_id: item.vendor_id,
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        <div className="relative">
          {item?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name}
              className="h-48 w-full object-cover"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center bg-muted">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          {lowStock && (
            <div className="absolute top-4 right-12 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
              Low stock
            </div>
          )}
        </div>

        <div className="space-y-4 p-6">
          <motion.div
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            variants={shouldAnimate ? childVariants : undefined}
            className="space-y-2"
          >
            <DialogTitle className="text-xl leading-tight font-bold tracking-tight">
              {item?.name ?? "—"}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {item?.sku && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground/70">{item.sku}</span>
                </div>
              )}
              {item?.category && (
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>{item.category}</span>
                </div>
              )}
              {item?.vendor?.name && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>{item.vendor.name}</span>
                </div>
              )}
              {row.region?.name && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{row.region.name}</span>
                </div>
              )}
            </div>
            {(item?.jetty_name || item?.jetty_location_url) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Anchor className="h-4 w-4 shrink-0" />
                {item.jetty_location_url ? (
                  <a
                    href={item.jetty_location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {item.jetty_name || "View jetty location"}
                  </a>
                ) : (
                  <span>{item.jetty_name}</span>
                )}
              </div>
            )}
            {item?.reporting_time && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Report by {formatTime(item.reporting_time)}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            variants={shouldAnimate ? childVariants : undefined}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { value: formatPrice(item?.sale_price ?? null), label: "Sale price" },
              { value: formatPrice(item?.b2b_price ?? null), label: "B2B price" },
              { value: String(available), label: "Available" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/30 bg-muted/50 p-3 text-center"
              >
                <div className="text-lg font-bold tabular-nums">{stat.value}</div>
                <div className="text-xs font-medium text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {canBook && (
            <motion.div
              initial={shouldAnimate ? "hidden" : "visible"}
              animate="visible"
              variants={shouldAnimate ? childVariants : undefined}
            >
              <NewBookingDialog
                vendors={vendors}
                regions={regions}
                products={products}
                initialProductId={row.item_id}
                trigger={
                  <Button className="h-11 w-full bg-gradient-to-r from-primary to-primary/90 font-medium shadow-lg shadow-primary/25 hover:from-primary/90 hover:to-primary" />
                }
                triggerContent="Add booking"
                onAdded={async () => {
                  onOpenChange(false);
                  await onBooked();
                }}
              />
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
