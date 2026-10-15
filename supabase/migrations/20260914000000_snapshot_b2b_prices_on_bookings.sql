-- Freeze B2B prices on each booking so later catalog price changes never
-- alter existing bookings.
alter table bookings
  add column if not exists b2b_price numeric,
  add column if not exists kids_b2b_price numeric;

-- Backfill existing bookings with the catalog's current prices.
update bookings b
set b2b_price = c.b2b_price,
    kids_b2b_price = c.kids_b2b_price
from catalog_items c
where b.item_id = c.id
  and b.b2b_price is null
  and b.kids_b2b_price is null;

-- Snapshot the prices when a booking is created, or when its product is changed.
create or replace function public.snapshot_booking_b2b_prices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.item_id is distinct from old.item_id then
    select c.b2b_price, c.kids_b2b_price
      into new.b2b_price, new.kids_b2b_price
      from public.catalog_items c
      where c.id = new.item_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_snapshot_b2b_prices on public.bookings;
create trigger bookings_snapshot_b2b_prices
  before insert or update of item_id on public.bookings
  for each row execute function public.snapshot_booking_b2b_prices();
