export type BookingStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "cancelled_refunded";

export type BookingRow = {
  id: string;
  customer_name: string;
  region_id: string | null;
  assigned_vendor_id: string | null;
  item_id: string | null;
  sale_price: number | null;
  advance_amount: number | null;
  status: BookingStatus;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  sailing_hours: number | null;
  anchorage_hours: number | null;
  add_ons: string[] | null;
  guest_count: number | null;
  created_at: string;
  region: { name: string } | null;
  vendor: { name: string } | null;
  item: { name: string; b2b_price: number | null; category: string | null } | null;
};
