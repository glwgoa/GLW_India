-- GST invoices, quotations and credit notes issued from the Transactions section.
create type gst_doc_type as enum ('invoice', 'quotation', 'credit_note');

create sequence gst_invoice_seq;
create sequence gst_quotation_seq;
create sequence gst_credit_note_seq;

create table gst_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type gst_doc_type not null,
  doc_number text not null unique,
  doc_date date not null default current_date,
  brand text not null,
  booking_id uuid references bookings(id) on delete set null,
  ref_document_id uuid references gst_documents(id) on delete set null,
  customer_name text not null,
  customer_gstin text,
  customer_address text,
  customer_state_code text not null,
  description text not null,
  hsn_sac text,
  taxable_value numeric not null,
  gst_rate numeric not null,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  igst numeric not null default 0,
  total numeric not null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index gst_documents_doc_date_idx on gst_documents(doc_date);
create index gst_documents_booking_id_idx on gst_documents(booking_id);

-- Number documents per type, e.g. INV/2026-27/0001 (Indian financial year Apr-Mar).
create or replace function public.set_gst_doc_number()
returns trigger language plpgsql as $$
declare
  fy_start int := extract(year from new.doc_date)::int - (case when extract(month from new.doc_date) < 4 then 1 else 0 end);
  fy text := fy_start || '-' || lpad(((fy_start + 1) % 100)::text, 2, '0');
begin
  if new.doc_number is null or new.doc_number = '' then
    new.doc_number := case new.doc_type
      when 'invoice' then 'INV/' || fy || '/' || lpad(nextval('gst_invoice_seq')::text, 4, '0')
      when 'quotation' then 'QTN/' || fy || '/' || lpad(nextval('gst_quotation_seq')::text, 4, '0')
      else 'CN/' || fy || '/' || lpad(nextval('gst_credit_note_seq')::text, 4, '0')
    end;
  end if;
  return new;
end;
$$;

create trigger gst_documents_set_number
  before insert on gst_documents
  for each row execute function public.set_gst_doc_number();

grant usage on sequence gst_invoice_seq, gst_quotation_seq, gst_credit_note_seq to authenticated;

alter table gst_documents enable row level security;

create policy "gst_documents_select" on gst_documents for select
  using (is_privileged() or get_user_role() = 'project_manager');
create policy "gst_documents_insert" on gst_documents for insert
  with check (is_privileged() or get_user_role() = 'project_manager');
create policy "gst_documents_update" on gst_documents for update
  using (is_privileged() or get_user_role() = 'project_manager')
  with check (is_privileged() or get_user_role() = 'project_manager');
create policy "gst_documents_delete" on gst_documents for delete
  using (is_privileged());
