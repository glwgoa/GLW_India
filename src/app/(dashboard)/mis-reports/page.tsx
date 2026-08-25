import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { RegionRevenueChart } from "@/components/mis/region-revenue-chart";
import { AttendanceSummaryChart } from "@/components/mis/attendance-summary-chart";
import { BrandPerformanceChart } from "@/components/mis/brand-performance-chart";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import type { RegionRevenueRow, AttendanceSummaryRow, BrandPerformanceRow } from "@/types/mis";

export default async function MisReportsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  requireRole(profile, ["admin", "developer", "project_manager"]);

  const [{ data: regionRevenue }, { data: attendanceSummary }, { data: brandPerformance }] =
    await Promise.all([
      supabase.from("vw_region_revenue_orders").select("*"),
      supabase.from("vw_monthly_attendance_summary").select("*"),
      supabase.from("vw_brand_performance").select("*"),
    ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PageHeaderIcon icon={BarChart3} color="var(--chart-2)" />
        <div>
          <h1 className="text-2xl font-semibold">MIS Reports</h1>
          <p className="text-sm text-muted-foreground">
            Scoped to what your role can see — the underlying views inherit your row-level
            security automatically. Calculation formulas are placeholders pending final figures.
          </p>
        </div>
      </div>
      <Reveal className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevealItem>
          <RegionRevenueChart data={(regionRevenue ?? []) as RegionRevenueRow[]} />
        </RevealItem>
        <RevealItem>
          <AttendanceSummaryChart data={(attendanceSummary ?? []) as AttendanceSummaryRow[]} />
        </RevealItem>
        <RevealItem>
          <BrandPerformanceChart data={(brandPerformance ?? []) as BrandPerformanceRow[]} />
        </RevealItem>
      </Reveal>
    </div>
  );
}
