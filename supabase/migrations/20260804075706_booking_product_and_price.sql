-- Bookings can now reference which product/service they're for, and the
-- actual price charged (entered manually per booking — may differ from the
-- catalog's default sale_price due to negotiation/discounting).
alter table bookings add column item_id uuid references catalog_items(id) on delete set null;
alter table bookings add column sale_price decimal(10,2);

create index idx_bookings_item_id on bookings(item_id);
