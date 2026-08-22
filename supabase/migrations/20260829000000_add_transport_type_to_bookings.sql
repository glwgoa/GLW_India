-- Dinner Cruise bookings can be Pickup/Drop (extra transport cost added on
-- top of the product's B2B price for profit purposes) or Direct Jetty (no
-- extra cost).
alter table bookings
  add column transport_type text,
  add column pickup_drop_price numeric;
