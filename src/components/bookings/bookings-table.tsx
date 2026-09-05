"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditBookingDialog } from "./edit-booking-dialog";
import { BookingDetailDialog } from "./booking-detail-dialog";
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
import type { BookingProduct, BookingRow, BookingStatus } from "@/types/booking";
import type { Profile } from "@/types/profile";
import type { TablesUpdate } from "@/types/supabase";
import { isPrivileged } from "@/lib/auth/roles";
import { computeProfit, effectiveB2bPrice, effectiveSalePrice } from "@/lib/booking-pricing";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_DOT,
  BOOKING_STATUS_LABEL,
  bookingCategoryDetails,
} from "@/lib/booking-display";
import { useRowFlash } from "@/hooks/use-row-flash";

type BookingUpdate = TablesUpdate<"bookings">;

export function BookingsTable({
  bookings,
  setBookings,
  profile,
  vendors,
  regions,
  products,
  employees,
  refresh,
}: {
  bookings: BookingRow[];
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>;
  profile: Profile;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  products: BookingProduct[];
  employees: { id: string; full_name: string }[];
  refresh: () => void | Promise<void>;
}) {
  const canManageBookings =
    isPrivileged(profile.role) || profile.role === "project_manager" || profile.role === "employee";
  const canDelete = isPrivileged(profile.role);
  const canEdit = canManageBookings;
  // Margin over what we pay the vendor — admin/PM only, not shown to
  // employees, the vendor themselves, or other roles.
  const canSeeProfit = isPrivileged(profile.role) || profile.role === "project_manager";
  const { flashId, flash } = useRowFlash();
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

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
            <TableHead>Brand</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Advance</TableHead>
            <TableHead>Balance due</TableHead>
            {canSeeProfit && <TableHead>B2B price</TableHead>}
            {canSeeProfit && <TableHead>Earnings</TableHead>}
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
              className={`cursor-pointer animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500 transition-colors ${
                flashId === booking.id ? "bg-emerald-500/10" : ""
              }`}
              style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
              onClick={() => setSelectedBooking(booking)}
            >
              <TableCell className="font-medium">
                <div>{booking.customer_name}</div>
                {booking.customer_contact && (
                  <div className="text-xs font-normal text-muted-foreground">
                    {booking.customer_contact}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{booking.brand ?? "—"}</TableCell>
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
              <TableCell onClick={(e) => e.stopPropagation()}>
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
                {new Date(booking.booking_date).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                {bookingCategoryDetails(booking) ?? "—"}
              </TableCell>
              {(canEdit || canDelete) && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <EditBookingDialog
                        booking={booking}
                        vendors={vendors}
                        regions={regions}
                        products={products}
                        employees={employees}
                        profile={profile}
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
      {selectedBooking && (
        <BookingDetailDialog
          open={!!selectedBooking}
          onOpenChange={(o) => !o && setSelectedBooking(null)}
          booking={selectedBooking}
          canSeeProfit={canSeeProfit}
        />
      )}
    </div>
  );
}
