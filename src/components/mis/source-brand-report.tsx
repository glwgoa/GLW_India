"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadButton } from "@/components/motion/download-button";
import { downloadCsv } from "@/lib/csv";
import { BRAND_NAMES } from "@/lib/brands";
import { LEAD_SOURCES } from "@/lib/lead-source";
import type { SourceBrandRow } from "@/types/mis";

type Metric = "bookings" | "revenue" | "earnings";

const METRICS: { value: Metric; label: string }[] = [
  { value: "bookings", label: "Bookings" },
  { value: "revenue", label: "Revenue" },
  { value: "earnings", label: "Earnings" },
];

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** Known values first in their usual order, then anything else found in the data. */
function ordered(seen: Set<string>, known: readonly string[]) {
  const first = known.filter((v) => seen.has(v));
  return [...first, ...[...seen].filter((v) => !first.includes(v)).sort()];
}

export function SourceBrandReport({ data }: { data: SourceBrandRow[] }) {
  const [metric, setMetric] = useState<Metric>("bookings");
  const [month, setMonth] = useState("all");
  const isMoney = metric !== "bookings";
  const format = (n: number) => (isMoney ? `₹${n.toLocaleString("en-IN")}` : n.toLocaleString("en-IN"));

  const months = useMemo(() => [...new Set(data.map((r) => r.month))].sort((a, b) => b.localeCompare(a)), [data]);
  const filtered = useMemo(() => (month === "all" ? data : data.filter((r) => r.month === month)), [data, month]);
  const brands = useMemo(() => ordered(new Set(filtered.map((r) => r.brand)), BRAND_NAMES), [filtered]);

  // One row per source, a value per brand and a total; biggest source first.
  const rows = useMemo(() => {
    const bySource = new Map<string, Record<string, number>>();
    for (const r of filtered) {
      const cells = bySource.get(r.source) ?? {};
      cells[r.brand] = (cells[r.brand] ?? 0) + r[metric];
      bySource.set(r.source, cells);
    }
    const order = ordered(new Set(bySource.keys()), LEAD_SOURCES);
    return order
      .map((source) => {
        const cells = bySource.get(source) ?? {};
        return { source, cells, total: Object.values(cells).reduce((a, b) => a + b, 0) };
      })
      .sort((a, b) => b.total - a.total);
  }, [filtered, metric]);

  const brandTotals = useMemo(
    () => Object.fromEntries(brands.map((b) => [b, rows.reduce((sum, r) => sum + (r.cells[b] ?? 0), 0)])),
    [brands, rows],
  );
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  function handleDownload() {
    const headers = ["Source", ...brands, "Total"];
    const lines = rows.map((r) => [r.source, ...brands.map((b) => r.cells[b] ?? 0), r.total]);
    lines.push(["Total", ...brands.map((b) => brandTotals[b] ?? 0), grandTotal]);
    downloadCsv(`${metric}-by-source-${month}.csv`, headers, lines);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Bookings by source</CardTitle>
          <CardDescription>
            Where each brand&apos;s bookings came from. &quot;Not set&quot; means the booking has no lead source.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Metric">
            {METRICS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={metric === m.value}
                onClick={() => setMetric(m.value)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  metric === m.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {rows.length > 0 && <DownloadButton onDownload={handleDownload} />}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Source</th>
                  {brands.map((b) => (
                    <th key={b} className="px-2 py-2 text-right font-medium">
                      {b}
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-right font-medium">Total</th>
                  <th className="py-2 pl-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.source} className="border-b">
                    <td className="py-2 pr-4 font-medium">{r.source}</td>
                    {brands.map((b) => (
                      <td key={b} className="px-2 py-2 text-right tabular-nums">
                        {format(r.cells[b] ?? 0)}
                      </td>
                    ))}
                    <td className="py-2 pl-2 text-right font-semibold tabular-nums">{format(r.total)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-muted-foreground">
                      {grandTotal ? `${Math.round((r.total / grandTotal) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-4">Total</td>
                  {brands.map((b) => (
                    <td key={b} className="px-2 py-2 text-right tabular-nums">
                      {format(brandTotals[b] ?? 0)}
                    </td>
                  ))}
                  <td className="py-2 pl-2 text-right tabular-nums">{format(grandTotal)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
