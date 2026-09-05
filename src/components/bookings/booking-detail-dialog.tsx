"use client";

import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  CalendarClock,
  Copy,
  MapPin,
  Package,
  Phone,
  Receipt,
  Sailboat,
  Sunset,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeProfit, effectiveB2bPrice, effectiveSalePrice } from "@/lib/booking-pricing";
import { BOOKING_STATUS_LABEL, bookingCategoryDetails } from "@/lib/booking-display";
import { generateBookingConfirmation } from "@/lib/booking-confirmation";
import {
  DINNER_CRUISE_CATEGORY_NAME,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_CATEGORY_NAME,
} from "@/lib/booking-yacht";
import type { BookingRow, BookingStatus } from "@/types/booking";

const STATUS_BADGE_CLASS: Record<BookingStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  assigned: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  in_progress: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  cancelled_refunded: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const CATEGORY_VISUAL: Record<string, { icon: typeof Sailboat; color: string }> = {
  [YACHT_CATEGORY_NAME]: { icon: Sailboat, color: "var(--chart-1)" },
  [DINNER_CRUISE_CATEGORY_NAME]: { icon: UtensilsCrossed, color: "var(--chart-2)" },
  [SUNSET_CRUISE_CATEGORY_NAME]: { icon: Sunset, color: "var(--chart-5)" },
};

const childVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.6 },
  },
};

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "emerald" | "destructive";
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-base font-semibold ${
          accent === "emerald" ? "text-emerald-600" : accent === "destructive" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto truncate font-medium">{value}</span>
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
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = !shouldReduceMotion;

  const salePrice = effectiveSalePrice(booking);
  const b2bPrice = effectiveB2bPrice(booking);
  const profit = computeProfit(booking);
  const balance = salePrice != null ? salePrice - (booking.advance_amount ?? 0) : null;
  const categoryDetails = bookingCategoryDetails(booking);

  const visual = CATEGORY_VISUAL[booking.item?.category ?? ""] ?? {
    icon: CalendarClock,
    color: "var(--chart-3)",
  };
  const CategoryIcon = visual.icon;

  async function handleCopyConfirmation() {
    const text = generateBookingConfirmation(booking);
    if (!text) {
      toast.error("No confirmation template for this booking's category yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Confirmation copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div
          className="relative flex h-24 w-full items-center justify-center"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${visual.color} 20%, transparent), color-mix(in srgb, ${visual.color} 6%, transparent))`,
          }}
        >
          <CategoryIcon className="size-10" style={{ color: `color-mix(in srgb, ${visual.color} 55%, transparent)` }} />
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className={STATUS_BADGE_CLASS[booking.status]}>
              {BOOKING_STATUS_LABEL[booking.status]}
            </Badge>
          </div>
          {booking.item?.category && (
            <div className="absolute top-3 left-3 text-xs font-medium text-muted-foreground">
              {booking.item.category}
            </div>
          )}
        </div>

        <div className="space-y-4 p-6">
          <motion.div
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            variants={shouldAnimate ? childVariants : undefined}
            className="space-y-1"
          >
            <DialogTitle className="text-xl leading-tight font-bold tracking-tight">
              {booking.customer_name}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                {new Date(booking.booking_date).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </span>
              {booking.customer_contact && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {booking.customer_contact}
                </span>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            variants={shouldAnimate ? childVariants : undefined}
            className="grid grid-cols-3 gap-2"
          >
            <StatTile label="Price" value={salePrice != null ? `₹${salePrice.toLocaleString("en-IN")}` : "—"} />
            <StatTile
              label="Advance"
              value={booking.advance_amount != null ? `₹${booking.advance_amount.toLocaleString("en-IN")}` : "—"}
            />
            <StatTile
              label="Balance due"
              value={balance != null ? `₹${balance.toLocaleString("en-IN")}` : "—"}
              accent={balance != null && balance > 0 ? "destructive" : undefined}
            />
            {canSeeProfit && (
              <StatTile
                label="B2B price"
                value={b2bPrice != null ? `₹${b2bPrice.toLocaleString("en-IN")}` : "—"}
              />
            )}
            {canSeeProfit && (
              <StatTile
                label="Earnings"
                value={profit != null ? `${profit >= 0 ? "+" : ""}₹${profit.toLocaleString("en-IN")}` : "—"}
                accent={profit != null ? (profit >= 0 ? "emerald" : "destructive") : undefined}
              />
            )}
          </motion.div>

          <motion.div
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            variants={shouldAnimate ? childVariants : undefined}
            className="space-y-2 rounded-xl border border-border/30 bg-muted/30 p-3"
          >
            {booking.enquiry_date && (
              <InfoRow
                icon={CalendarClock}
                label="Enquiry date"
                value={new Date(booking.enquiry_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              />
            )}
            {booking.brand && <InfoRow icon={Building2} label="Brand" value={booking.brand} />}
            {booking.transaction_id && (
              <InfoRow icon={Receipt} label="Transaction ID" value={booking.transaction_id} />
            )}
            <InfoRow icon={MapPin} label="Region" value={booking.region?.name ?? "—"} />
            <InfoRow icon={Building2} label="Vendor" value={booking.vendor?.name ?? "Unassigned"} />
            <InfoRow icon={Package} label="Product" value={booking.item?.name ?? "—"} />
            {booking.employee?.full_name && (
              <InfoRow icon={User} label="Booked by" value={booking.employee.full_name} />
            )}
            {booking.creator?.full_name && (
              <InfoRow icon={User} label="Added by" value={booking.creator.full_name} />
            )}
          </motion.div>

          {categoryDetails && (
            <motion.div
              initial={shouldAnimate ? "hidden" : "visible"}
              animate="visible"
              variants={shouldAnimate ? childVariants : undefined}
              className="space-y-1 rounded-xl border border-border/30 bg-muted/50 p-3 text-sm"
            >
              <p className="text-xs font-medium text-foreground">Booking details</p>
              <p className="text-muted-foreground">{categoryDetails}</p>
            </motion.div>
          )}

          <motion.div
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            variants={shouldAnimate ? childVariants : undefined}
          >
            <Button type="button" className="w-full" onClick={handleCopyConfirmation}>
              <Copy />
              Copy confirmation
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
