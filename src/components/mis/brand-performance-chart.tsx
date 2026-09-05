"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BrandPerformanceRow } from "@/types/mis";

export function BrandPerformanceChart({ data }: { data: BrandPerformanceRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings & earnings by brand</CardTitle>
        <CardDescription>Total bookings (bar) vs. total earnings (line)</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No brand data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="brand" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="bookings" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="profit" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar yAxisId="bookings" dataKey="total_bookings" name="Bookings" fill="#93c5fd" radius={4} />
              <Line
                yAxisId="profit"
                type="monotone"
                dataKey="total_profit"
                name="Earnings (₹)"
                stroke="#16a34a"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
