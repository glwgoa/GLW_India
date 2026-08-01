"use client";

import { toast } from "sonner";
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

  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings visible to your role.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SLA</TableHead>
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
                      <SelectValue />
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
              <TableCell>
                <Select
                  value={booking.status}
                  onValueChange={(value) =>
                    value && updateBooking(booking.id, { status: value as BookingStatus })
                  }
                >
                  <SelectTrigger className="w-36 capitalize">
                    <SelectValue />
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
                    <SelectTrigger className="w-32 capitalize">
                      <SelectValue />
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
