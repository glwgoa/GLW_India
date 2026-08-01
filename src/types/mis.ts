export type VendorEfficiencyRow = {
  vendor_id: string;
  vendor_name: string;
  total_completed: number;
  met_sla: number;
  response_efficiency_pct: number;
};

export type RegionRevenueRow = {
  region_id: string;
  region_name: string;
  total_orders: number;
  total_revenue: number;
};

export type AttendanceSummaryRow = {
  user_id: string;
  full_name: string;
  month: string;
  days_logged: number;
  days_present: number;
  avg_hours_worked: number;
};

export type SlaComplianceRow = {
  region_id: string;
  region_name: string;
  total_bookings: number;
  met: number;
  breached: number;
  sla_compliance_pct: number;
};
