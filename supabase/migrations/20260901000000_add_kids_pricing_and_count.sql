alter table catalog_items
  add column kids_b2b_price numeric,
  add column kids_sale_price numeric;

alter table bookings
  add column kids_count integer;
