import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { RegionRevenueChart } from "@/components/mis/region-revenue-chart";
import { AttendanceSummaryChart } from "@/components/mis/attendance-summary-chart";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import type { Profile } from "@/types/profile";
import type { RegionRevenueRow, AttendanceSummaryRow } from "@/types/mis";

export default async function MisReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  requireRole(profile, ["admin", "developer", "project_manager"]);

  const [{ data: regionRevenue }, { data: attendanceSummary }] = await Promise.all([
    supabase.from("vw_region_revenue_orders").select("*"),
    supabase.from("vw_monthly_attendance_summary").select("*"),
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
      </Reveal>
    </div>
  );
}
