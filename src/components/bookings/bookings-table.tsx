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
import type { BookingRow, BookingStatus } from "@/types/booking";
import type { Profile } from "@/types/profile";
import type { TablesUpdate } from "@/types/supabase";
import { isPrivileged } from "@/lib/auth/roles";

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

  function computeProfit(booking: BookingRow) {
    if (booking.sale_price == null || booking.item?.b2b_price == null) return null;
    return booking.sale_price - booking.item.b2b_price;
  }

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
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">{booking.customer_name}</TableCell>
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
                {booking.sale_price != null ? `₹${booking.sale_price.toLocaleString("en-IN")}` : "—"}
              </TableCell>
              <TableCell>
                {booking.advance_amount != null
                  ? `₹${booking.advance_amount.toLocaleString("en-IN")}`
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {(() => {
                  if (booking.sale_price == null) return "—";
                  const balance = booking.sale_price - (booking.advance_amount ?? 0);
                  return `₹${balance.toLocaleString("en-IN")}`;
                })()}
              </TableCell>
              {canSeeProfit && (
                <TableCell className="text-muted-foreground">
                  {booking.item?.b2b_price != null
                    ? `₹${booking.item.b2b_price.toLocaleString("en-IN")}`
                    : "—"}
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
                      {(value: string) => BOOKING_STATUS_LABEL[value as BookingStatus] ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {BOOKING_STATUS_LABEL[s]}
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
