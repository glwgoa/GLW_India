"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadButton } from "@/components/motion/download-button";
import { downloadCsv } from "@/lib/csv";
import { BRAND_NAMES } from "@/lib/brands";
import type { MonthlyBrandRow } from "@/types/mis";

type Metric = "bookings" | "revenue" | "earnings";

const METRICS: { value: Metric; label: string }[] = [
  { value: "bookings", label: "Bookings" },
  { value: "revenue", label: "Revenue" },
  { value: "earnings", label: "Earnings" },
];

const BRAND_COLORS = ["#2563eb", "#f97316", "#16a34a", "#a855f7", "#64748b"];

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function MonthlyBrandReport({ data }: { data: MonthlyBrandRow[] }) {
  const [metric, setMetric] = useState<Metric>("bookings");
  const isMoney = metric !== "bookings";
  const format = (n: number) => (isMoney ? `₹${n.toLocaleString("en-IN")}` : n.toLocaleString("en-IN"));

  // Known brands first, in their usual order, then anything else found in the data.
  const brands = useMemo(() => {
    const seen = new Set(data.map((r) => r.brand));
    const known = BRAND_NAMES.filter((b) => seen.has(b)) as string[];
    return [...known, ...[...seen].filter((b) => !known.includes(b)).sort()];
  }, [data]);

  // Months newest first, each with a value per brand and a total.
  const rows = useMemo(() => {
    const byMonth = new Map<string, Record<string, number>>();
    for (const r of data) {
      const cells = byMonth.get(r.month) ?? {};
      cells[r.brand] = (cells[r.brand] ?? 0) + r[metric];
      byMonth.set(r.month, cells);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, cells]) => ({
        month,
        cells,
        total: Object.values(cells).reduce((a, b) => a + b, 0),
      }));
  }, [data, metric]);

  const chartData = useMemo(
    () => [...rows].reverse().map((r) => ({ month: formatMonth(r.month), ...r.cells })),
    [rows],
  );

  function handleDownload() {
    const headers = ["Month", ...brands, "Total"];
    const lines = rows.map((r) => [formatMonth(r.month), ...brands.map((b) => r.cells[b] ?? 0), r.total]);
    downloadCsv(`monthly-${metric}-by-brand.csv`, headers, lines);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Monthly bookings by brand</CardTitle>
          <CardDescription>
            Grouped by booking date. Cancelled and refunded bookings are not counted.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
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
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => format(Number(value))} />
                  <Legend />
                  {brands.map((b, i) => (
                    <Bar key={b} dataKey={b} stackId="a" fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Month</th>
                    {brands.map((b) => (
                      <th key={b} className="px-2 py-2 text-right font-medium">
                        {b}
                      </th>
                    ))}
                    <th className="py-2 pl-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.month} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{formatMonth(r.month)}</td>
                      {brands.map((b) => (
                        <td key={b} className="px-2 py-2 text-right tabular-nums">
                          {format(r.cells[b] ?? 0)}
                        </td>
                      ))}
                      <td className="py-2 pl-2 text-right font-semibold tabular-nums">{format(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
