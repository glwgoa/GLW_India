"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceSummaryRow } from "@/types/mis";

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function AttendanceSummaryChart({ data }: { data: AttendanceSummaryRow[] }) {
  const monthly = useMemo(() => {
    const byMonth = new Map<string, { month: string; totalHours: number; totalPresent: number; count: number }>();
    for (const row of data) {
      const existing = byMonth.get(row.month);
      if (existing) {
        existing.totalHours += row.avg_hours_worked ?? 0;
        existing.totalPresent += row.days_present;
        existing.count += 1;
      } else {
        byMonth.set(row.month, {
          month: row.month,
          totalHours: row.avg_hours_worked ?? 0,
          totalPresent: row.days_present,
          count: 1,
        });
      }
    }
    return Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: formatMonth(m.month),
        avgHours: Number((m.totalHours / m.count).toFixed(1)),
        totalDaysPresent: m.totalPresent,
      }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance summary</CardTitle>
        <CardDescription>Org-wide average hours worked and days present, by month</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {monthly.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avgHours" name="Avg hours/day" stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="totalDaysPresent" name="Total days present" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
