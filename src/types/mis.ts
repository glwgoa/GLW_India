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
