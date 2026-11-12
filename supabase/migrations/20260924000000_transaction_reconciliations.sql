-- Persisted bank-statement reconciliation. Kept in its own table (not columns on
-- transactions) because booking-synced transactions are read-only under RLS.
create table if not exists transaction_reconciliations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references transactions(id) on delete cascade,
  bank_date date not null,
  bank_amount numeric not null,
  bank_reference text,
  statement_name text,
  reconciled_by uuid references profiles(id) on delete set null,
  reconciled_at timestamptz not null default now()
);

alter table transaction_reconciliations enable row level security;

create policy "transaction_reconciliations_select" on transaction_reconciliations for select
  using (is_privileged() or get_user_role() in ('project_manager', 'accountant'));

create policy "transaction_reconciliations_insert" on transaction_reconciliations for insert
  with check (is_privileged() or get_user_role() in ('project_manager', 'accountant'));

create policy "transaction_reconciliations_update" on transaction_reconciliations for update
  using (is_privileged() or get_user_role() in ('project_manager', 'accountant'))
  with check (is_privileged() or get_user_role() in ('project_manager', 'accountant'));

create policy "transaction_reconciliations_delete" on transaction_reconciliations for delete
  using (is_privileged() or get_user_role() in ('project_manager', 'accountant'));
