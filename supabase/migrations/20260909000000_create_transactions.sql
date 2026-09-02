create type transaction_direction as enum ('paid', 'received');
create type transaction_source as enum ('manual', 'booking');

create table transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  direction transaction_direction not null,
  amount numeric not null,
  transaction_id text,
  transaction_date timestamptz not null default now(),
  notes text,
  source transaction_source not null default 'manual',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index transactions_booking_source_unique on transactions(booking_id) where source = 'booking';
create index transactions_booking_id_idx on transactions(booking_id);
create index transactions_transaction_date_idx on transactions(transaction_date);

alter table transactions enable row level security;

create policy "transactions_select" on transactions for select
  using (is_privileged() or get_user_role() = 'project_manager');
create policy "transactions_insert" on transactions for insert
  with check ((is_privileged() or get_user_role() = 'project_manager') and source = 'manual');
create policy "transactions_update" on transactions for update
  using ((is_privileged() or get_user_role() = 'project_manager') and source = 'manual')
  with check ((is_privileged() or get_user_role() = 'project_manager') and source = 'manual');
create policy "transactions_delete" on transactions for delete
  using ((is_privileged() or get_user_role() = 'project_manager') and source = 'manual');

-- Keep a transaction row in sync with each booking's advance payment.
create or replace function public.sync_booking_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.advance_amount is not null and new.advance_amount > 0 then
    insert into public.transactions (booking_id, direction, amount, transaction_id, transaction_date, source)
    values (new.id, 'received', new.advance_amount, new.transaction_id, coalesce(new.created_at, now()), 'booking')
    on conflict (booking_id) where (source = 'booking')
    do update set
      amount = excluded.amount,
      transaction_id = excluded.transaction_id;
  else
    delete from public.transactions where booking_id = new.id and source = 'booking';
  end if;
  return new;
end;
$$;

create trigger bookings_sync_transaction
  after insert or update of advance_amount, transaction_id on bookings
  for each row execute function public.sync_booking_transaction();

revoke all on function public.sync_booking_transaction() from public, anon, authenticated;

-- Backfill: create a synced transaction for every booking that already has an advance recorded.
insert into transactions (booking_id, direction, amount, transaction_id, transaction_date, source)
select id, 'received', advance_amount, transaction_id, coalesce(created_at, now()), 'booking'
from bookings
where advance_amount is not null and advance_amount > 0
on conflict (booking_id) where (source = 'booking') do nothing;
