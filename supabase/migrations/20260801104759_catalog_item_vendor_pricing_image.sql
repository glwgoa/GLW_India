-- Products (catalog_items) now carry their supplying vendor, an image, and
-- two prices: b2b_price (cost from the vendor) and sale_price (customer price).
-- Per-region unit_price on regional_inventory is retired in favor of this —
-- pricing is a product attribute, stock is the only thing that varies by region.
alter table catalog_items add column vendor_id uuid references vendors(id);
alter table catalog_items add column image_url text;
alter table catalog_items add column b2b_price decimal(10,2);
alter table catalog_items add column sale_price decimal(10,2);

create index idx_catalog_items_vendor_id on catalog_items(vendor_id);

-- Backfill from the highest previously-seeded per-region unit_price before dropping it
update catalog_items ci
set sale_price = sub.max_price
from (
  select item_id, max(unit_price) as max_price
  from regional_inventory
  group by item_id
) sub
where sub.item_id = ci.id;

update catalog_items set b2b_price = round(sale_price * 0.8, 2) where sale_price is not null;

alter table regional_inventory drop column unit_price;
