"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DownloadButton } from "@/components/motion/download-button";
import { downloadCsv } from "@/lib/csv";
import { LEAD_SOURCES, allPhoneDigits } from "@/lib/lead-source";

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

type Range = "today" | "yesterday" | "7d" | "month" | "all" | "custom";

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

/** YYYY-MM-DD of a moment in India time. */
function istDay(d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(d));
}

function shiftDay(day: string, days: number) {
  const d = new Date(`${day}T12:00:00+05:30`);
  d.setDate(d.getDate() + days);
  return istDay(d);
}

/** Inclusive from/to days for a preset; null means open-ended. */
function rangeDays(range: Range, from: string, to: string): [string | null, string | null] {
  const today = istDay(new Date());
  switch (range) {
    case "today":
      return [today, today];
    case "yesterday":
      return [shiftDay(today, -1), shiftDay(today, -1)];
    case "7d":
      return [shiftDay(today, -6), today];
    case "month":
      return [`${today.slice(0, 7)}-01`, today];
    case "custom":
      return [from || null, to || null];
    default:
      return [null, null];
  }
}

const leadTime = (lead: LeadListRow) => lead.lead_created_at ?? lead.created_at;

/** One person: every Kommo lead sharing a phone number (or a lone lead with no phone), newest first. */
type Person = {
  key: string;
  leads: LeadListRow[];
  brands: (string | null)[];
  sources: (string | null)[];
};

const distinct = <T,>(values: T[]) => [...new Set(values)];

function groupByPerson(leads: LeadListRow[]): Person[] {
  const groups = new Map<string, LeadListRow[]>();
  for (const lead of leads) {
    const key = lead.phone_digits ? `p:${lead.phone_digits}` : `k:${lead.kommo_lead_id}`;
    const list = groups.get(key);
    if (list) list.push(lead);
    else groups.set(key, [lead]);
  }
  return [...groups].map(([key, list]) => {
    list.sort((a, b) => new Date(leadTime(b)).getTime() - new Date(leadTime(a)).getTime());
    return {
      key,
      leads: list,
      brands: distinct(list.map((l) => l.brand)).sort((a, b) => (a ?? "~").localeCompare(b ?? "~")),
      sources: distinct(list.map((l) => l.source)),
    };
  });
}

export function LeadsClient({ leads, bookings, error }: { leads: LeadListRow[]; bookings: LeadBooking[]; error: string | null }) {
  const [brand, setBrand] = useState("all");
  const [source, setSource] = useState("all");
  const [booked, setBooked] = useState("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);

  // A lead is booked when a booking links to it, or (unlinked) shares its phone number.
  const bookingFor = useMemo(() => {
    const byLead = new Map<string, LeadBooking>();
    const byPhone = new Map<string, LeadBooking>();
    for (const b of bookings) {
      if (b.kommo_lead_id && !byLead.has(b.kommo_lead_id)) byLead.set(b.kommo_lead_id, b);
      for (const digits of allPhoneDigits(b.customer_contact)) {
        if (!byPhone.has(digits)) byPhone.set(digits, b);
      }
    }
    const forLead = (lead: LeadListRow) => byLead.get(lead.id) ?? (lead.phone_digits ? byPhone.get(lead.phone_digits) : undefined);
    return (person: Person) => person.leads.map(forLead).find(Boolean) ?? null;
  }, [bookings]);

  const people = useMemo(() => groupByPerson(leads), [leads]);

  const brands = useMemo(() => [...new Set(leads.map((l) => l.brand ?? NO_BRAND))].sort(), [leads]);
  const sources = useMemo(() => {
    const seen = new Set(leads.map((l) => l.source ?? "Not set"));
    return [...LEAD_SOURCES.filter((s) => seen.has(s)), ...[...seen].filter((s) => !(LEAD_SOURCES as readonly string[]).includes(s))];
  }, [leads]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const [fromDay, toDay] = rangeDays(range, from, to);
    return people
      .flatMap((person) => {
        // The newest enquiry inside the date range stands for the person.
        const lead = person.leads.find((l) => {
          const day = istDay(leadTime(l));
          return (!fromDay || day >= fromDay) && (!toDay || day <= toDay);
        });
        if (!lead) return [];
        const booking = bookingFor(person);
        if (brand !== "all" && !person.brands.some((b) => (b ?? NO_BRAND) === brand)) return [];
        if (source !== "all" && !person.sources.some((s) => (s ?? "Not set") === source)) return [];
        if (booked === "yes" && !booking) return [];
        if (booked === "no" && booking) return [];
        if (q && !person.leads.some((l) => [l.contact_name, l.phone, l.utm_campaign, String(l.kommo_lead_id)].some((v) => v?.toLowerCase().includes(q)))) return [];
        const name = person.leads.find((l) => l.contact_name)?.contact_name ?? null;
        return [{ person, lead, name, booking }];
      })
      .sort((a, b) => {
        const diff = new Date(leadTime(a.lead)).getTime() - new Date(leadTime(b.lead)).getTime();
        return newestFirst ? -diff : diff;
      });
  }, [people, bookingFor, brand, source, booked, search, range, from, to, newestFirst]);

  const bookedCount = rows.filter((r) => r.booking).length;
  const conversion = rows.length ? Math.round((bookedCount / rows.length) * 100) : 0;

  function handleDownload() {
    downloadCsv(
      "leads.csv",
      ["Date", "Kommo IDs", "Contact", "Phone", "Brands", "Sources", "UTM source", "UTM medium", "Campaign", "GCLID", "Booked", "Booking date"],
      rows.map(({ person, lead, name, booking }) => [
        formatDate(leadTime(lead)),
        person.leads.map((l) => l.kommo_lead_id).join(", "),
        name ?? "",
        lead.phone ?? "",
        person.brands.map((b) => b ?? NO_BRAND).join(", "),
        person.sources.filter(Boolean).join(", "),
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
            <select aria-label="Date" value={range} onChange={(e) => setRange(e.target.value as Range)} className={selectClass}>
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {range === "custom" && (
              <>
                <input type="date" aria-label="From" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
                <span className="text-sm text-muted-foreground">to</span>
                <input type="date" aria-label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={selectClass} />
              </>
            )}
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
              {leads.length === 0 ? "No leads yet. They appear here once the Kommo webhook is connected." : range === "today" ? "No leads yet today." : "No leads match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">
                      <button
                        type="button"
                        onClick={() => setNewestFirst((v) => !v)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        aria-label={newestFirst ? "Sorted newest first; show oldest first" : "Sorted oldest first; show newest first"}
                      >
                        Date {newestFirst ? "↓" : "↑"}
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium">Contact</th>
                    <th className="px-2 py-2 font-medium">Brand</th>
                    <th className="px-2 py-2 font-medium">Source</th>
                    <th className="px-2 py-2 font-medium">Campaign</th>
                    <th className="py-2 pl-2 font-medium">Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ person, lead, name, booking }) => (
                    <tr key={person.key} className="border-b align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">
                        {formatDate(leadTime(lead))}
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{name ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{lead.phone ?? "No phone"}</div>
                        {person.leads.length > 1 && <div className="text-xs text-muted-foreground">{person.leads.length} enquiries</div>}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {person.brands.map((b) =>
                            b ? (
                              <span key={b} className="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs">
                                {b}
                              </span>
                            ) : (
                              person.brands.length === 1 && (
                                <span key="none" className="text-muted-foreground">
                                  {NO_BRAND}
                                </span>
                              )
                            ),
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {person.sources.map((s) => (
                            <span key={s ?? "none"} className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs">
                              {s ?? "Not set"}
                            </span>
                          ))}
                        </div>
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
