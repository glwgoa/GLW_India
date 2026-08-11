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
import { HyperText } from "@/components/ui/hyper-text";
import type { RegionRevenueRow } from "@/types/mis";

export function RegionRevenueChart({ data }: { data: RegionRevenueRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <HyperText as="span" className="overflow-visible py-0 text-base font-semibold">
            Revenue & orders by region
          </HyperText>
        </CardTitle>
        <CardDescription>Total orders (bar) vs. total revenue (line)</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="region_name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="orders" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar yAxisId="orders" dataKey="total_orders" name="Orders" fill="#93c5fd" radius={4} />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="total_revenue"
                name="Revenue (₹)"
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
