import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { VendorEfficiencyChart } from "@/components/mis/vendor-efficiency-chart";
import { RegionRevenueChart } from "@/components/mis/region-revenue-chart";
import { AttendanceSummaryChart } from "@/components/mis/attendance-summary-chart";
import { SlaComplianceChart } from "@/components/mis/sla-compliance-chart";
import { HyperText } from "@/components/ui/hyper-text";
import type { Profile } from "@/types/profile";
import type {
  VendorEfficiencyRow,
  RegionRevenueRow,
  AttendanceSummaryRow,
  SlaComplianceRow,
} from "@/types/mis";

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

  requireRole(profile, ["admin", "project_manager"]);

  const [
    { data: vendorEfficiency },
    { data: regionRevenue },
    { data: attendanceSummary },
    { data: slaCompliance },
  ] = await Promise.all([
    supabase.from("vw_vendor_response_efficiency").select("*"),
    supabase.from("vw_region_revenue_orders").select("*"),
    supabase.from("vw_monthly_attendance_summary").select("*"),
    supabase.from("vw_sla_compliance_by_region").select("*"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <HyperText as="h1" className="text-2xl font-semibold">MIS Reports</HyperText>
        <p className="text-sm text-muted-foreground">
          Scoped to what your role can see — the underlying views inherit your row-level
          security automatically. Calculation formulas are placeholders pending final figures.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VendorEfficiencyChart data={(vendorEfficiency ?? []) as VendorEfficiencyRow[]} />
        <RegionRevenueChart data={(regionRevenue ?? []) as RegionRevenueRow[]} />
        <AttendanceSummaryChart data={(attendanceSummary ?? []) as AttendanceSummaryRow[]} />
        <SlaComplianceChart data={(slaCompliance ?? []) as SlaComplianceRow[]} />
      </div>
    </div>
  );
}
