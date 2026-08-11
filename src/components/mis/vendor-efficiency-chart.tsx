"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VendorEfficiencyRow } from "@/types/mis";

export function VendorEfficiencyChart({ data }: { data: VendorEfficiencyRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor response efficiency</CardTitle>
        <CardDescription>% of completed bookings that met SLA, per vendor</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="vendor_name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis unit="%" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="response_efficiency_pct" name="SLA met" fill="var(--color-chart-1, #2563eb)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
