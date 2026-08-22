-- Jetty (boat dock) info for products where the customer needs to know
-- where to board — a name plus a pasted Google Maps link.
alter table catalog_items
  add column jetty_name text,
  add column jetty_location_url text;
