"use client";

import { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BOOKING_STATUS_LABEL, bookingCategoryDetails } from "@/lib/booking-display";
import { effectiveSalePrice } from "@/lib/booking-pricing";
import { transactionDescription } from "@/lib/transaction-display";
import type { BookingRow } from "@/types/booking";
import type { TransactionRow } from "@/types/transaction";

const BOOKING_SELECT =
  "*, region:regions(name), vendor:vendors(name, contact_phone), employee:profiles!bookings_assigned_employee_id_fkey(full_name), item:catalog_items(name, b2b_price, kids_b2b_price, kids_sale_price, category, reporting_time, jetty_name, jetty_location_url, coordinator_name, coordinator_phone)";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

export function MatchDetailDialog({ transaction }: { transaction: TransactionRow }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [slide, setSlide] = useState(0);

  const hasBooking = !!transaction.booking_id;
  const slideCount = hasBooking ? 2 : 1;
  const showBookingSlide = hasBooking && slide === 0;

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    setSlide(0);
    if (next && hasBooking && !booking) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", transaction.booking_id as string)
        .single();
      setBooking((data as unknown as BookingRow) ?? null);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="View matched booking and transaction" />}>
        <CheckCircle2 className="text-emerald-600" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{showBookingSlide ? "Booking" : "Transaction"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {showBookingSlide && booking && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <InfoRow label="Customer" value={booking.customer_name} />
                <InfoRow label="Brand" value={booking.brand ?? "—"} />
                <InfoRow label="Region" value={booking.region?.name ?? "—"} />
                <InfoRow label="Vendor" value={booking.vendor?.name ?? "Unassigned"} />
                <InfoRow label="Product" value={booking.item?.name ?? "—"} />
                <InfoRow
                  label="Booking date"
                  value={new Date(booking.booking_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                />
                <InfoRow label="Status" value={BOOKING_STATUS_LABEL[booking.status]} />
                <InfoRow
                  label="Price"
                  value={
                    effectiveSalePrice(booking) != null
                      ? `₹${effectiveSalePrice(booking)!.toLocaleString("en-IN")}`
                      : "—"
                  }
                />
                <InfoRow
                  label="Advance"
                  value={booking.advance_amount != null ? `₹${booking.advance_amount.toLocaleString("en-IN")}` : "—"}
                />
                {bookingCategoryDetails(booking) && (
                  <p className="pt-1 text-xs text-muted-foreground">{bookingCategoryDetails(booking)}</p>
                )}
              </div>
            )}

            {!showBookingSlide && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <InfoRow
                  label="Date of transaction"
                  value={new Date(transaction.transaction_date).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                />
                <InfoRow label="Description" value={transactionDescription(transaction)} />
                <InfoRow label="Transaction ID" value={transaction.transaction_id ?? "—"} />
                <InfoRow
                  label={transaction.direction === "paid" ? "Debit" : "Credit"}
                  value={`₹${transaction.amount.toLocaleString("en-IN")}`}
                />
                <InfoRow label="Bank A/c" value={transaction.brand ?? "—"} />
                <InfoRow label="Added by" value={transaction.creator?.full_name ?? "—"} />
              </div>
            )}

            {hasBooking && !loading && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={slide === 0}
                  onClick={() => setSlide((s) => Math.max(0, s - 1))}
                  aria-label="Previous"
                >
                  <ChevronLeft />
                </Button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <span
                      key={i}
                      className={`size-1.5 rounded-full ${i === slide ? "bg-foreground" : "bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={slide === slideCount - 1}
                  onClick={() => setSlide((s) => Math.min(slideCount - 1, s + 1))}
                  aria-label="Next"
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
