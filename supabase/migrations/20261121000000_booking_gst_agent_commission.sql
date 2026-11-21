-- GST rate (5 or 18, null = no GST), GST status and agent commission on bookings.
alter table public.bookings
  add column if not exists gst_rate numeric check (gst_rate in (5, 18)),
  add column if not exists gst_status text,
  add column if not exists agent_commission numeric;
