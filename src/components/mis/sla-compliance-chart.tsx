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
import type { SlaComplianceRow } from "@/types/mis";

export function SlaComplianceChart({ data }: { data: SlaComplianceRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA compliance by region</CardTitle>
        <CardDescription>% of bookings that met SLA, per region</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="region_name" tick={{ fontSize: 12 }} />
              <YAxis unit="%" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="sla_compliance_pct" name="SLA compliance" fill="#16a34a" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
