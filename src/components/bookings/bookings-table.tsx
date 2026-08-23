"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditBookingDialog } from "./edit-booking-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { BookingRow, BookingStatus, TransportType } from "@/types/booking";
import type { Profile } from "@/types/profile";
import type { TablesUpdate } from "@/types/supabase";
import { isPrivileged } from "@/lib/auth/roles";
import { computeProfit, effectiveB2bPrice, effectiveSalePrice } from "@/lib/booking-pricing";
import { useRowFlash } from "@/hooks/use-row-flash";

type BookingUpdate = TablesUpdate<"bookings">;

const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "cancelled_refunded",
];
const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  cancelled_refunded: "Cancel/Refunded",
};
const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  pickup_drop: "Pickup/Drop",
  direct_jetty: "Direct Jetty",
};
const BOOKING_STATUS_DOT: Record<BookingStatus, string> = {
  pending: "bg-amber-500",
  assigned: "bg-blue-500",
  in_progress: "bg-violet-500",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-500",
  cancelled_refunded: "bg-rose-500",
};

export function BookingsTable({
  bookings,
  setBookings,
  profile,
  vendors,
  regions,
  products,
  refresh,
}: {
  bookings: BookingRow[];
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>;
  profile: Profile;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  products: { id: string; name: string; sale_price: number | null; category: string | null }[];
  refresh: () => void | Promise<void>;
}) {
  const canAssignVendor = isPrivileged(profile.role) || profile.role === "project_manager";
  const canDelete = isPrivileged(profile.role);
  const canEdit = canAssignVendor;
  // Margin over what we pay the vendor — admin/PM only, not shown to the
  // vendor themselves or other roles.
  const canSeeProfit = canAssignVendor;
  const { flashId, flash } = useRowFlash();

  function formatTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function yachtDetails(booking: BookingRow) {
    const parts: string[] = [];
    if (booking.start_time && booking.end_time) {
      parts.push(`${formatTime(booking.start_time)}–${formatTime(booking.end_time)}`);
    }
    const duration: string[] = [];
    if (booking.sailing_hours != null) duration.push(`${booking.sailing_hours}h sailing`);
    if (booking.anchorage_hours != null) duration.push(`${booking.anchorage_hours}h anchorage`);
    if (duration.length > 0) parts.push(duration.join(" + "));
    if (booking.guest_count != null) parts.push(`${booking.guest_count} guests`);
    if (booking.add_ons && booking.add_ons.length > 0) parts.push(booking.add_ons.join(", "));
    if (booking.transport_type) {
      const label = TRANSPORT_TYPE_LABEL[booking.transport_type];
      if (booking.transport_type === "pickup_drop" && booking.pickup_drop_price != null) {
        const total = booking.pickup_drop_price * (booking.guest_count ?? 1);
        parts.push(`${label} (+₹${total.toLocaleString("en-IN")})`);
      } else {
        parts.push(label);
      }
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  async function updateBooking(id: string, patch: BookingUpdate) {
    const supabase = createClient();
    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } as BookingRow : b)),
    );
    flash(id);
    toast.success("Booking updated");
  }

  async function deleteBooking(booking: BookingRow) {
    if (!window.confirm(`Delete the booking for ${booking.customer_name}? This cannot be undone.`)) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    toast.success("Booking deleted");
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings visible to your role.</p>;
  }

  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Advance</TableHead>
            <TableHead>Balance due</TableHead>
            {canSeeProfit && <TableHead>B2B price</TableHead>}
            {canSeeProfit && <TableHead>Profit</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Booking date</TableHead>
            <TableHead>Details</TableHead>
            {(canEdit || canDelete) && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking, index) => (
            <TableRow
              key={booking.id}
              className={`animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300 transition-colors ${
                flashId === booking.id ? "bg-emerald-500/10" : ""
              }`}
              style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
            >
              <TableCell className="font-medium">
                <div>{booking.customer_name}</div>
                {booking.customer_contact && (
                  <div className="text-xs font-normal text-muted-foreground">
                    {booking.customer_contact}
                  </div>
                )}
              </TableCell>
              <TableCell>{booking.region?.name ?? "—"}</TableCell>
              <TableCell>
                {canAssignVendor ? (
                  <Select
                    value={booking.assigned_vendor_id ?? "unassigned"}
                    onValueChange={(value) =>
                      updateBooking(booking.id, {
                        assigned_vendor_id: value === "unassigned" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>
                        {(value: string) =>
                          value === "unassigned" ? "Unassigned" : (vendors.find((v) => v.id === value)?.name ?? "Unassigned")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  (booking.vendor?.name ?? "Unassigned")
                )}
              </TableCell>
              <TableCell>{booking.item?.name ?? "—"}</TableCell>
              <TableCell>
                {(() => {
                  const salePrice = effectiveSalePrice(booking);
                  return salePrice != null ? `₹${salePrice.toLocaleString("en-IN")}` : "—";
                })()}
              </TableCell>
              <TableCell>
                {booking.advance_amount != null
                  ? `₹${booking.advance_amount.toLocaleString("en-IN")}`
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {(() => {
                  const salePrice = effectiveSalePrice(booking);
                  if (salePrice == null) return "—";
                  const balance = salePrice - (booking.advance_amount ?? 0);
                  return `₹${balance.toLocaleString("en-IN")}`;
                })()}
              </TableCell>
              {canSeeProfit && (
                <TableCell className="text-muted-foreground">
                  {(() => {
                    const b2bPrice = effectiveB2bPrice(booking);
                    return b2bPrice != null ? `₹${b2bPrice.toLocaleString("en-IN")}` : "—";
                  })()}
                </TableCell>
              )}
              {canSeeProfit && (
                <TableCell>
                  {(() => {
                    const profit = computeProfit(booking);
                    if (profit == null) return <span className="text-muted-foreground">—</span>;
                    return (
                      <span className={profit >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {profit >= 0 ? "+" : ""}
                        {`₹${profit.toLocaleString("en-IN")}`}
                      </span>
                    );
                  })()}
                </TableCell>
              )}
              <TableCell>
                <Select
                  value={booking.status}
                  onValueChange={(value) =>
                    value && updateBooking(booking.id, { status: value as BookingStatus })
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue>
                      {(value: string) => (
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${BOOKING_STATUS_DOT[value as BookingStatus] ?? "bg-muted-foreground"}`}
                          />
                          {BOOKING_STATUS_LABEL[value as BookingStatus] ?? value}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-1.5">
                          <span className={`size-1.5 shrink-0 rounded-full ${BOOKING_STATUS_DOT[s]}`} />
                          {BOOKING_STATUS_LABEL[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(booking.booking_date).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                {yachtDetails(booking) ?? "—"}
              </TableCell>
              {(canEdit || canDelete) && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <EditBookingDialog
                        booking={booking}
                        vendors={vendors}
                        regions={regions}
                        products={products}
                        onSaved={refresh}
                      />
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete booking"
                        onClick={() => deleteBooking(booking)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
