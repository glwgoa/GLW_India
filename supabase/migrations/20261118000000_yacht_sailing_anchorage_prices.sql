alter table catalog_items
  add column if not exists sailing_price numeric,
  add column if not exists anchorage_price numeric;
