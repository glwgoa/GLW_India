-- Yacht bookings now compute their own B2B (hours x slot rates) in the app.
-- Keep that value: only snapshot the catalog's flat b2b_price when the booking
-- did not supply one (insert) or when the product changed to a non-yacht (update).
create or replace function public.snapshot_booking_b2b_prices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.b2b_price is null then
      select c.b2b_price, c.kids_b2b_price
        into new.b2b_price, new.kids_b2b_price
        from public.catalog_items c
        where c.id = new.item_id;
    end if;
  elsif new.item_id is distinct from old.item_id
        and coalesce((select c.category from public.catalog_items c where c.id = new.item_id), '')
            <> 'Private Yachts' then
    select c.b2b_price, c.kids_b2b_price
      into new.b2b_price, new.kids_b2b_price
      from public.catalog_items c
      where c.id = new.item_id;
  end if;
  return new;
end;
$$;
