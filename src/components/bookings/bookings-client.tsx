"use client";

import { Download, RefreshCw } from "lucide-react";
import { usePollingBookings } from "@/hooks/use-polling-bookings";
import { BookingsTable } from "./bookings-table";
import { NewBookingDialog } from "./new-booking-dialog";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import type { BookingRow } from "@/types/booking";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  cancelled_refunded: "Cancel/Refunded",
};

export function BookingsClient({
  initialBookings,
  profile,
  vendors,
  regions,
  products,
}: {
  initialBookings: BookingRow[];
  profile: Profile;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  products: { id: string; name: string; sale_price: number | null }[];
}) {
  const { bookings, setBookings, refresh, refreshing } = usePollingBookings(initialBookings);
  const canCreateBooking = isPrivileged(profile.role) || profile.role === "project_manager";
  const canSeeProfit = canCreateBooking;

  function handleDownload() {
    const headers = [
      "Customer",
      "Region",
      "Vendor",
      "Product",
      "Price",
      "Advance",
      "Balance due",
      ...(canSeeProfit ? ["B2B price", "Profit"] : []),
      "Status",
      "Booking date",
    ];
    const rows = bookings.map((b) => {
      const profit =
        b.sale_price != null && b.item?.b2b_price != null ? b.sale_price - b.item.b2b_price : null;
      const balance = b.sale_price != null ? b.sale_price - (b.advance_amount ?? 0) : "";
      return [
        b.customer_name,
        b.region?.name ?? "",
        b.vendor?.name ?? "",
        b.item?.name ?? "",
        b.sale_price ?? "",
        b.advance_amount ?? "",
        balance,
        ...(canSeeProfit ? [b.item?.b2b_price ?? "", profit ?? ""] : []),
        BOOKING_STATUS_LABEL[b.status] ?? b.status,
        new Date(b.booking_date).toLocaleString(),
      ];
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`bookings-${date}.csv`, headers, rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Auto-refreshes every 30s. Status is set manually by staff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download />
            Download CSV
          </Button>
          {canCreateBooking && (
            <NewBookingDialog
              vendors={vendors}
              regions={regions}
              products={products}
              onAdded={refresh}
            />
          )}
        </div>
      </div>
      <BookingsTable
        bookings={bookings}
        setBookings={setBookings}
        profile={profile}
        vendors={vendors}
        regions={regions}
        products={products}
        refresh={refresh}
      />
    </div>
  );
}
