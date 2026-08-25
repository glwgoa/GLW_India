"use client";

import { useMemo, useState } from "react";
import { CalendarClock, RefreshCw, X } from "lucide-react";
import { usePollingBookings } from "@/hooks/use-polling-bookings";
import { BookingsTable } from "./bookings-table";
import { NewBookingDialog } from "./new-booking-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadCsv } from "@/lib/csv";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { DownloadButton } from "@/components/motion/download-button";
import { computeProfit, effectiveB2bPrice, effectiveSalePrice } from "@/lib/booking-pricing";
import type { BookingProduct, BookingRow } from "@/types/booking";
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
  products: BookingProduct[];
}) {
  const { bookings, setBookings, refresh, refreshing } = usePollingBookings(initialBookings);
  const canCreateBooking = isPrivileged(profile.role) || profile.role === "project_manager";
  const canSeeProfit = canCreateBooking;
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const visibleBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (nameFilter && !b.customer_name.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      if (dateFilter && b.booking_date.slice(0, 10) !== dateFilter) return false;
      return true;
    });
  }, [bookings, nameFilter, dateFilter]);

  const hasFilters = nameFilter || dateFilter;

  function clearFilters() {
    setNameFilter("");
    setDateFilter("");
  }

  function handleDownload() {
    const headers = [
      "Customer",
      "Contact",
      "Brand",
      "Region",
      "Vendor",
      "Product",
      "Price",
      "Advance",
      "Transaction ID",
      "Balance due",
      ...(canSeeProfit ? ["B2B price", "Profit"] : []),
      "Status",
      "Booking date",
    ];
    const rows = visibleBookings.map((b) => {
      const salePrice = effectiveSalePrice(b);
      const b2bPrice = effectiveB2bPrice(b);
      const profit = computeProfit(b);
      const balance = salePrice != null ? salePrice - (b.advance_amount ?? 0) : "";
      return [
        b.customer_name,
        b.customer_contact ?? "",
        b.brand ?? "",
        b.region?.name ?? "",
        b.vendor?.name ?? "",
        b.item?.name ?? "",
        salePrice ?? "",
        b.advance_amount ?? "",
        b.transaction_id ?? "",
        balance,
        ...(canSeeProfit ? [b2bPrice ?? "", profit ?? ""] : []),
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
        <div className="flex items-center gap-3">
          <PageHeaderIcon icon={CalendarClock} color="var(--chart-1)" />
          <div>
            <h1 className="text-2xl font-semibold">Bookings</h1>
            <p className="text-sm text-muted-foreground">
              Auto-refreshes every 30s. Status is set manually by staff.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <DownloadButton onDownload={handleDownload} />
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

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="booking-name-filter" className="text-xs text-muted-foreground">
            Name
          </Label>
          <Input
            id="booking-name-filter"
            placeholder="Search customers..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-date-filter" className="text-xs text-muted-foreground">
            Booking date
          </Label>
          <Input
            id="booking-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 w-44"
          />
        </div>
        {hasFilters && (
          <div className="space-y-1.5">
            <Label className="invisible text-xs">Clear</Label>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear
            </Button>
          </div>
        )}
      </div>

      <BookingsTable
        bookings={visibleBookings}
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
