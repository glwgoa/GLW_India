alter table transactions add column brand text;

update transactions t
set brand = b.brand
from bookings b
where t.booking_id = b.id and t.source = 'booking';

create or replace function public.sync_booking_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.advance_amount is not null and new.advance_amount > 0 then
    insert into public.transactions (booking_id, direction, amount, transaction_id, transaction_date, brand, source)
    values (new.id, 'received', new.advance_amount, new.transaction_id, coalesce(new.created_at, now()), new.brand, 'booking')
    on conflict (booking_id) where (source = 'booking')
    do update set
      amount = excluded.amount,
      transaction_id = excluded.transaction_id,
      brand = excluded.brand;
  else
    delete from public.transactions where booking_id = new.id and source = 'booking';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_sync_transaction on bookings;
create trigger bookings_sync_transaction
  after insert or update of advance_amount, transaction_id, brand on bookings
  for each row execute function public.sync_booking_transaction();
