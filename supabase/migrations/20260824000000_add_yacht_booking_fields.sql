-- Extra booking details used for Private Yacht bookings (time slot,
-- sailing/anchorage duration, add-on services, guest count). Kept as
-- plain nullable columns on bookings rather than a separate table since
-- they're optional per-booking details, not a relation.
alter table bookings
  add column start_time text,
  add column end_time text,
  add column sailing_hours numeric,
  add column anchorage_hours numeric,
  add column add_ons text[],
  add column guest_count integer;
