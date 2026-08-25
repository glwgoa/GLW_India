"use client";

import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { computeProfit, effectiveB2bPrice, effectiveSalePrice } from "@/lib/booking-pricing";
import { BOOKING_STATUS_DOT, BOOKING_STATUS_LABEL, bookingCategoryDetails } from "@/lib/booking-display";
import type { BookingRow } from "@/types/booking";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function BookingDetailDialog({
  open,
  onOpenChange,
  booking,
  canSeeProfit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRow;
  canSeeProfit: boolean;
}) {
  const salePrice = effectiveSalePrice(booking);
  const b2bPrice = effectiveB2bPrice(booking);
  const profit = computeProfit(booking);
  const balance = salePrice != null ? salePrice - (booking.advance_amount ?? 0) : null;
  const categoryDetails = bookingCategoryDetails(booking);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{booking.customer_name}</DialogTitle>
          <DialogDescription>
            {new Date(booking.booking_date).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y text-sm">
          {booking.customer_contact && <Row label="Contact">{booking.customer_contact}</Row>}
          <Row label="Brand">{booking.brand ?? "—"}</Row>
          <Row label="Region">{booking.region?.name ?? "—"}</Row>
          <Row label="Vendor">{booking.vendor?.name ?? "Unassigned"}</Row>
          <Row label="Product">{booking.item?.name ?? "—"}</Row>
          <Row label="Status">
            <span className="inline-flex items-center gap-1.5">
              <span className={`size-1.5 shrink-0 rounded-full ${BOOKING_STATUS_DOT[booking.status]}`} />
              {BOOKING_STATUS_LABEL[booking.status]}
            </span>
          </Row>
          <Row label="Price">{salePrice != null ? `₹${salePrice.toLocaleString("en-IN")}` : "—"}</Row>
          <Row label="Advance">
            {booking.advance_amount != null ? `₹${booking.advance_amount.toLocaleString("en-IN")}` : "—"}
          </Row>
          <Row label="Balance due">{balance != null ? `₹${balance.toLocaleString("en-IN")}` : "—"}</Row>
          {canSeeProfit && (
            <Row label="B2B price">{b2bPrice != null ? `₹${b2bPrice.toLocaleString("en-IN")}` : "—"}</Row>
          )}
          {canSeeProfit && (
            <Row label="Profit">
              {profit != null ? (
                <span className={profit >= 0 ? "text-emerald-600" : "text-destructive"}>
                  {profit >= 0 ? "+" : ""}
                  {`₹${profit.toLocaleString("en-IN")}`}
                </span>
              ) : (
                "—"
              )}
            </Row>
          )}
          {categoryDetails && (
            <Row label="Details">
              <span className="font-normal whitespace-normal">{categoryDetails}</span>
            </Row>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline">
            <Copy />
            Copy confirmation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
