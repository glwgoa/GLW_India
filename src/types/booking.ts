export type BookingStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "cancelled_refunded";

export type TransportType = "pickup_drop" | "direct_jetty";

export type BookingProduct = {
  id: string;
  name: string;
  sale_price: number | null;
  kids_sale_price: number | null;
  category: string | null;
  vendor_id: string | null;
};

export type BookingRow = {
  id: string;
  customer_name: string;
  customer_contact: string | null;
  region_id: string | null;
  assigned_vendor_id: string | null;
  assigned_employee_id: string | null;
  item_id: string | null;
  sale_price: number | null;
  advance_amount: number | null;
  status: BookingStatus;
  booking_date: string;
  enquiry_date: string | null;
  start_time: string | null;
  end_time: string | null;
  sailing_hours: number | null;
  anchorage_hours: number | null;
  add_ons: string[] | null;
  guest_count: number | null;
  kids_count: number | null;
  kids_price: number | null;
  kids_below_5_count: number | null;
  transport_type: TransportType | null;
  pickup_drop_price: number | null;
  pickup_drop_guest_count: number | null;
  brand: string | null;
  transaction_id: string | null;
  created_at: string;
  region: { name: string } | null;
  vendor: { name: string; contact_phone: string | null } | null;
  employee: { full_name: string } | null;
  item: {
    name: string;
    b2b_price: number | null;
    kids_b2b_price: number | null;
    kids_sale_price: number | null;
    category: string | null;
    reporting_time: string | null;
    jetty_name: string | null;
    jetty_location_url: string | null;
  } | null;
};
