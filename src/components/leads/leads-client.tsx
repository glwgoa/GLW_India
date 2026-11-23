"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DownloadButton } from "@/components/motion/download-button";
import { downloadCsv } from "@/lib/csv";
import { LEAD_SOURCES, phoneDigits } from "@/lib/lead-source";

export type LeadListRow = {
  id: string;
  kommo_lead_id: number;
  brand: string | null;
  contact_name: string | null;
  phone: string | null;
  phone_digits: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  status: string | null;
  lead_created_at: string | null;
  created_at: string;
};

export type LeadBooking = {
  id: string;
  kommo_lead_id: string | null;
  customer_name: string;
  customer_contact: string | null;
  booking_date: string;
  sale_price: number | null;
  status: string;
};

const NO_BRAND = "No brand";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function LeadsClient({ leads, bookings, error }: { leads: LeadListRow[]; bookings: LeadBooking[]; error: string | null }) {
  const [brand, setBrand] = useState("all");
  const [source, setSource] = useState("all");
  const [booked, setBooked] = useState("all");
  const [search, setSearch] = useState("");

  // A lead is booked when a booking links to it, or (unlinked) shares its phone number.
  const bookingFor = useMemo(() => {
    const byLead = new Map<string, LeadBooking>();
    const byPhone = new Map<string, LeadBooking>();
    for (const b of bookings) {
      if (b.kommo_lead_id && !byLead.has(b.kommo_lead_id)) byLead.set(b.kommo_lead_id, b);
      const digits = phoneDigits(b.customer_contact);
      if (digits && !byPhone.has(digits)) byPhone.set(digits, b);
    }
    return (lead: LeadListRow) => byLead.get(lead.id) ?? (lead.phone_digits ? byPhone.get(lead.phone_digits) : undefined) ?? null;
  }, [bookings]);

  const brands = useMemo(() => [...new Set(leads.map((l) => l.brand ?? NO_BRAND))].sort(), [leads]);
  const sources = useMemo(() => {
    const seen = new Set(leads.map((l) => l.source ?? "Not set"));
    return [...LEAD_SOURCES.filter((s) => seen.has(s)), ...[...seen].filter((s) => !(LEAD_SOURCES as readonly string[]).includes(s))];
  }, [leads]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .map((lead) => ({ lead, booking: bookingFor(lead) }))
      .filter(({ lead, booking }) => {
        if (brand !== "all" && (lead.brand ?? NO_BRAND) !== brand) return false;
        if (source !== "all" && (lead.source ?? "Not set") !== source) return false;
        if (booked === "yes" && !booking) return false;
        if (booked === "no" && booking) return false;
        if (!q) return true;
        return [lead.contact_name, lead.phone, lead.utm_campaign, String(lead.kommo_lead_id)].some((v) => v?.toLowerCase().includes(q));
      });
  }, [leads, bookingFor, brand, source, booked, search]);

  const bookedCount = rows.filter((r) => r.booking).length;
  const conversion = rows.length ? Math.round((bookedCount / rows.length) * 100) : 0;

  function handleDownload() {
    downloadCsv(
      "leads.csv",
      ["Date", "Kommo ID", "Contact", "Phone", "Brand", "Source", "UTM source", "UTM medium", "Campaign", "GCLID", "Booked", "Booking date"],
      rows.map(({ lead, booking }) => [
        formatDate(lead.lead_created_at ?? lead.created_at),
        lead.kommo_lead_id,
        lead.contact_name ?? "",
        lead.phone ?? "",
        lead.brand ?? NO_BRAND,
        lead.source ?? "",
        lead.utm_source ?? "",
        lead.utm_medium ?? "",
        lead.utm_campaign ?? "",
        lead.gclid ?? "",
        booking ? "Yes" : "No",
        booking?.booking_date ?? "",
      ]),
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">Could not load leads: {error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Leads", value: rows.length },
          { label: "Booked", value: bookedCount },
          { label: "Conversion", value: `${conversion}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search name, phone, campaign"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full sm:w-64"
            />
            <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass}>
              <option value="all">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select aria-label="Booked" value={booked} onChange={(e) => setBooked(e.target.value)} className={selectClass}>
              <option value="all">Booked or not</option>
              <option value="yes">Booked</option>
              <option value="no">Not booked</option>
            </select>
            <div className="ml-auto">{rows.length > 0 && <DownloadButton onDownload={handleDownload} />}</div>
          </div>

          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {leads.length === 0 ? "No leads yet. They appear here once the Kommo webhook is connected." : "No leads match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Contact</th>
                    <th className="px-2 py-2 font-medium">Brand</th>
                    <th className="px-2 py-2 font-medium">Source</th>
                    <th className="px-2 py-2 font-medium">Campaign</th>
                    <th className="py-2 pl-2 font-medium">Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ lead, booking }) => (
                    <tr key={lead.id} className="border-b align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                        {formatDate(lead.lead_created_at ?? lead.created_at)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{lead.contact_name ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{lead.phone ?? "No phone"}</div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">{lead.brand ?? <span className="text-muted-foreground">{NO_BRAND}</span>}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{lead.source ?? "Not set"}</span>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{lead.utm_campaign ?? "—"}</td>
                      <td className="whitespace-nowrap py-2 pl-2">
                        {booking ? (
                          <div>
                            <div className="font-medium text-emerald-600 dark:text-emerald-400">Booked</div>
                            <div className="text-xs text-muted-foreground">
                              {booking.booking_date}
                              {booking.sale_price != null && ` · ₹${booking.sale_price.toLocaleString("en-IN")}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
