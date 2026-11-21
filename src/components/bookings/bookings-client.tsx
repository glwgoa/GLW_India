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
import { isPerGuestCategory } from "@/lib/booking-yacht";
import { bookingCategoryDetails } from "@/lib/booking-display";
import { effectiveB2bPrice, effectiveSalePrice } from "@/lib/booking-pricing";
import type { BookingProduct, BookingRow } from "@/types/booking";
import type { Profile } from "@/types/profile";
import { isPrivileged, isStaffRole, isAccountant } from "@/lib/auth/roles";

const TRANSPORT_LABEL: Record<string, string> = {
  pickup_drop: "Pickup & Drop",
  direct_jetty: "Direct to Jetty",
};

function formatCsvDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB") : "";
}

export function BookingsClient({
  initialBookings,
  profile,
  vendors,
  products,
  employees,
}: {
  initialBookings: BookingRow[];
  profile: Profile;
  vendors: { id: string; name: string }[];
  products: BookingProduct[];
  employees: { id: string; full_name: string }[];
}) {
  const { bookings, setBookings, refresh, refreshing } = usePollingBookings(initialBookings);
  const canCreateBooking =
    isPrivileged(profile.role) || profile.role === "project_manager" || isStaffRole(profile.role);
  const canSeeProfit = isPrivileged(profile.role) || profile.role === "project_manager";
  const canDownload = isPrivileged(profile.role) || profile.role === "project_manager" || isAccountant(profile.role);
  const [nameFilter, setNameFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [view, setView] = useState<"daily" | "monthly">("monthly");
  const [brandFilter, setBrandFilter] = useState("all"); // "all" | "none" | brand name
  const [dateField, setDateField] = useState<"booking" | "added">("booking");

  const brands = useMemo(
    () => [...new Set(bookings.map((b) => b.brand).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b)),
    [bookings],
  );

  const visibleBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (nameFilter && !b.customer_name.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      if (brandFilter === "none" ? b.brand : brandFilter !== "all" && b.brand !== brandFilter) {
        return false;
      }
      const day =
        dateField === "booking"
          ? b.booking_date.slice(0, 10)
          : new Date(b.created_at).toLocaleDateString("en-CA");
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return true;
    });
  }, [bookings, nameFilter, fromDate, toDate, brandFilter, dateField]);

  const hasFilters = nameFilter || fromDate || toDate || brandFilter !== "all";

  function clearFilters() {
    setNameFilter("");
    setFromDate("");
    setToDate("");
    setBrandFilter("all");
  }

  // Column order matches the accounts sheet (25-26 Columns); fields the app
  // doesn't track yet are exported blank so the sheet can be filled in by hand.
  function handleDownload() {
    const headers = [
      "BRAND", "ACTIVITY NAME", "Transportation", "ENQUIRY DATE", "DATE OF BOOKING", "VENDOR",
      "BOOKING DATE", "NAME", "CONTACT NO", "NO OF ADULTS", "NO OF KIDS (5 to 10 YEARS)",
      "NO OF KIDS (BELOW 5 YEARS)", "REPORT FOR ADULTS", "REPORT FOR KIDS (5 to 10 YEARS)",
      "REPORT FOR KIDS (BELOW 5 YEARS)", "TOTAL REPORT", "TOTAL", "ADVANCE", "BALANCE",
      "PAID BY CUSTOMER", "SETTLED TO VENDOR", "TO BE PAID", "TO BE RECEIVED", "EARNING",
      "ADV PAID TO", "ADV PAID DATE", "TRANS ID", "SETTLED TO", "SETTLEMENT DATE",
      "SELLEMENT ID", "SETTLED BY", "INCLUSIONS", "SAILOR", "REMARKS", "AGENT",
      "AGENT COMMISSION", "GST", "BOOKING ID", "GST STATUS", "TDS", "TDS STATUS", "SOURCE",
    ];
    const rows = visibleBookings.map((b, i) => {
      const r = i + 2; // spreadsheet row (row 1 is the header)
      const total = effectiveSalePrice(b);
      const gstRate = b.gst_rate ?? null;
      // GST only when a rate is picked on the booking; TDS is 1% of the GST bill (sale price + GST).
      const gstAmount = gstRate && total != null ? Number(((total * gstRate) / 100).toFixed(2)) : "";
      const tdsAmount = typeof gstAmount === "number" && total != null ? Number(((total + gstAmount) / 100).toFixed(2)) : "";
      const b2bPrice = canSeeProfit ? effectiveB2bPrice(b) : null;
      const perGuest = isPerGuestCategory(b.item?.category);
      const reportAdults =
        canSeeProfit && b.b2b_price != null
          ? b.b2b_price * (perGuest && b.guest_count ? b.guest_count : 1)
          : "";
      const reportKids =
        canSeeProfit && b.kids_count && b.kids_b2b_price != null
          ? b.kids_b2b_price * b.kids_count
          : "";
      return [
        b.brand ?? "",
        b.item?.name ?? "",
        b.transport_type ? (TRANSPORT_LABEL[b.transport_type] ?? b.transport_type) : "",
        formatCsvDate(b.enquiry_date),
        formatCsvDate(b.booking_date),
        b.vendor?.name ?? "",
        formatCsvDate(b.booking_date),
        b.customer_name,
        b.customer_contact ?? "",
        b.guest_count ?? "",
        b.kids_count ?? "",
        b.kids_below_5_count ?? "",
        reportAdults,
        reportKids,
        "", // REPORT FOR KIDS (BELOW 5): no B2B price is set for them
        b2bPrice ?? "", // TOTAL REPORT (includes pickup/drop)
        total ?? "",
        b.advance_amount ?? "",
        `=T${r}`, // BALANCE = PAID BY CUSTOMER
        b.advance_amount ?? "", // PAID BY CUSTOMER
        "", // SETTLED TO VENDOR: filled by hand after download
        canSeeProfit && b2bPrice != null ? `=P${r}-T${r}-U${r}` : "", // TO BE PAID
        canSeeProfit && b2bPrice != null ? `=P${r}-T${r}+U${r}` : "", // TO BE RECEIVED
        canSeeProfit && b2bPrice != null && total != null ? `=Q${r}-P${r}` : "", // EARNING
        b.adv_paid_to ?? "",
        formatCsvDate(b.created_at), // ADV PAID DATE: day the booking was added
        b.transaction_id ?? "",
        "", "", "", "", // SETTLED TO / SETTLEMENT DATE / SELLEMENT ID / SETTLED BY
        b.add_ons?.join(", ") ?? "",
        b.creator?.full_name ?? "", // SAILOR: employee who added the booking
        bookingCategoryDetails(b) ?? "",
        [b.agent_name, b.agent_number].filter(Boolean).join(" · "), // AGENT
        b.agent_commission ?? "", // AGENT COMMISSION
        gstAmount, // GST
        b.id,
        gstRate ? (b.gst_status ?? "") : "", // GST STATUS
        tdsAmount, // TDS
        "", "", // TDS STATUS / SOURCE
      ];
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`bookings-${date}.csv`, headers, rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          {canDownload && <DownloadButton onDownload={handleDownload} />}
          {canCreateBooking && (
            <NewBookingDialog
              vendors={vendors}
              products={products}
              employees={employees}
              profile={profile}
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
          <Label htmlFor="booking-from-date" className="text-xs text-muted-foreground">
            From date
          </Label>
          <Input
            id="booking-from-date"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-to-date" className="text-xs text-muted-foreground">
            To date
          </Label>
          <Input
            id="booking-to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-brand-filter" className="text-xs text-muted-foreground">
            Brand
          </Label>
          <select
            id="booking-brand-filter"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="all">All brands</option>
            {brands.map((br) => (
              <option key={br} value={br}>{br}</option>
            ))}
            <option value="none">No brand</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-date-field" className="text-xs text-muted-foreground">
            Filter dates by
          </Label>
          <select
            id="booking-date-field"
            value={dateField}
            onChange={(e) => setDateField(e.target.value as "booking" | "added")}
            className="h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="booking">Booking date</option>
            <option value="added">Date added</option>
          </select>
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

      <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Bookings view">
        {(
          [
            ["daily", "Daily bookings"],
            ["monthly", "Monthly bookings"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <BookingsTable
        groupBy={view === "daily" ? "day" : "month"}
        bookings={visibleBookings}
        setBookings={setBookings}
        profile={profile}
        vendors={vendors}
        products={products}
        employees={employees}
        refresh={refresh}
      />
    </div>
  );
}
