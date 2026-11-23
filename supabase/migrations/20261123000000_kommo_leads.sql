-- Leads pushed from Kommo (one account for both brands), and the lead source on each booking.

create table if not exists kommo_leads (
  id uuid primary key default gen_random_uuid(),
  kommo_lead_id bigint not null unique,
  -- From the lead's source; null when the source doesn't name a brand.
  brand text,
  contact_name text,
  phone text,
  -- Last 10 digits of the phone, used to match bookings to leads.
  phone_digits text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ref_code text,
  gclid text,
  status text,
  raw_payload jsonb,
  lead_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kommo_leads_phone_digits_idx on kommo_leads (phone_digits);
create index if not exists kommo_leads_created_at_idx on kommo_leads (created_at desc);

alter table kommo_leads enable row level security;

-- Staff who can read bookings can read leads. Writes come only from the webhook (service role).
drop policy if exists "kommo_leads_select" on kommo_leads;
create policy "kommo_leads_select" on kommo_leads for select
  using (is_privileged() or get_user_role() in ('employee', 'accountant', 'project_manager'));

alter table bookings
  add column if not exists kommo_lead_id uuid references kommo_leads (id) on delete set null,
  add column if not exists source text,
  add column if not exists utm_campaign text,
  add column if not exists gclid text;

create index if not exists bookings_kommo_lead_id_idx on bookings (kommo_lead_id);
create index if not exists bookings_source_idx on bookings (source);
