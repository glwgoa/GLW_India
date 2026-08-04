export type BookingStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
export type SlaStatus = "on_track" | "warning" | "breached" | "met";

export type BookingRow = {
  id: string;
  customer_name: string;
  region_id: string | null;
  assigned_vendor_id: string | null;
  item_id: string | null;
  sale_price: number | null;
  status: BookingStatus;
  sla_status: SlaStatus;
  sla_deadline: string;
  created_at: string;
  region: { name: string } | null;
  vendor: { name: string } | null;
  item: { name: string } | null;
};
