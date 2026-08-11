"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SlaBadge } from "./sla-badge";
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
import { HyperText } from "@/components/ui/hyper-text";
import type { BookingRow, BookingStatus, SlaStatus } from "@/types/booking";
import type { Profile } from "@/types/profile";
import type { TablesUpdate } from "@/types/supabase";

type BookingUpdate = TablesUpdate<"bookings">;

const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
];
const SLA_STATUSES: SlaStatus[] = ["on_track", "warning", "breached", "met"];

const TH = "overflow-visible py-0 text-xs font-medium";

export function BookingsTable({
  bookings,
  setBookings,
  profile,
  vendors,
}: {
  bookings: BookingRow[];
  setBookings: React.Dispatch<React.SetStateAction<BookingRow[]>>;
  profile: Profile;
  vendors: { id: string; name: string }[];
}) {
  const canAssignVendor = profile.role === "admin" || profile.role === "project_manager";
  const canDelete = profile.role === "admin";
  // Margin over what we pay the vendor — admin/PM only, not shown to the
  // vendor themselves or other roles.
  const canSeeProfit = canAssignVendor;

  function computeProfit(booking: BookingRow) {
    if (booking.sale_price == null || booking.item?.b2b_price == null) return null;
    return booking.sale_price - booking.item.b2b_price;
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><HyperText as="span" className={TH}>Customer</HyperText></TableHead>
            <TableHead><HyperText as="span" className={TH}>Region</HyperText></TableHead>
            <TableHead><HyperText as="span" className={TH}>Vendor</HyperText></TableHead>
            <TableHead><HyperText as="span" className={TH}>Product</HyperText></TableHead>
            <TableHead><HyperText as="span" className={TH}>Price</HyperText></TableHead>
            {canSeeProfit && <TableHead><HyperText as="span" className={TH}>Profit</HyperText></TableHead>}
            <TableHead><HyperText as="span" className={TH}>Status</HyperText></TableHead>
            <TableHead><HyperText as="span" className={TH}>SLA</HyperText></TableHead>
            {canDelete && <TableHead className="w-10" />}
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
                    <SelectValue className="capitalize">
                      {(value: string) => value.replace("_", " ")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <SlaBadge
                    deadline={booking.sla_deadline}
                    status={booking.status}
                    slaStatus={booking.sla_status}
                  />
                  <Select
                    value={booking.sla_status}
                    onValueChange={(value) =>
                      value && updateBooking(booking.id, { sla_status: value as SlaStatus })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue className="capitalize">
                        {(value: string) => value.replace("_", " ")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SLA_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              {canDelete && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete booking"
                    onClick={() => deleteBooking(booking)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
