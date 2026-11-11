"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyCreatorRow } from "@/types/mis";

const ALL = "all";

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function BookingsByCreatorReport({ data }: { data: MonthlyCreatorRow[] }) {
  const [month, setMonth] = useState(ALL);

  const months = useMemo(() => [...new Set(data.map((r) => r.month))].sort().reverse(), [data]);

  const rows = useMemo(() => {
    const byPerson = new Map<string, { creator: string; bookings: number; revenue: number }>();
    for (const r of data) {
      if (month !== ALL && r.month !== month) continue;
      const row = byPerson.get(r.creator) ?? { creator: r.creator, bookings: 0, revenue: 0 };
      row.bookings += r.bookings;
      row.revenue += r.revenue;
      byPerson.set(r.creator, row);
    }
    return [...byPerson.values()].sort((a, b) => b.bookings - a.bookings);
  }, [data, month]);

  const total = rows.reduce((s, r) => s + r.bookings, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Bookings added by user</CardTitle>
          <CardDescription>
            How many bookings each person added. Cancelled and refunded bookings are not counted.
          </CardDescription>
        </div>
        <select
          aria-label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-8 rounded-lg border bg-background px-2 text-sm"
        >
          <option value={ALL}>All time</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <>
            <div style={{ height: Math.max(160, rows.length * 40 + 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="creator" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "bookings" ? [Number(value), "Bookings"] : [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]
                    }
                  />
                  <Bar dataKey="bookings" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 font-medium">User</th>
                  <th className="py-2 text-right font-medium">Bookings</th>
                  <th className="py-2 text-right font-medium">Share</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.creator} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.creator}</td>
                    <td className="py-2 text-right tabular-nums">{r.bookings}</td>
                    <td className="py-2 text-right tabular-nums">{Math.round((r.bookings / total) * 100)}%</td>
                    <td className="py-2 text-right tabular-nums">₹{r.revenue.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
