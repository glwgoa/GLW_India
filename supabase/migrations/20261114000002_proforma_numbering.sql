-- Run after 20261114000001. Numbers proforma invoices as PF/2026-27/0001.
create sequence if not exists gst_proforma_seq;
grant usage on sequence gst_proforma_seq to authenticated;

create or replace function public.set_gst_doc_number()
returns trigger language plpgsql as $$
declare
  fy_start int := extract(year from new.doc_date)::int - (case when extract(month from new.doc_date) < 4 then 1 else 0 end);
  fy text := fy_start || '-' || lpad(((fy_start + 1) % 100)::text, 2, '0');
begin
  if new.doc_number is null or new.doc_number = '' then
    new.doc_number := case new.doc_type
      when 'invoice' then 'INV/' || fy || '/' || lpad(nextval('gst_invoice_seq')::text, 4, '0')
      when 'proforma' then 'PF/' || fy || '/' || lpad(nextval('gst_proforma_seq')::text, 4, '0')
      when 'quotation' then 'QTN/' || fy || '/' || lpad(nextval('gst_quotation_seq')::text, 4, '0')
      else 'CN/' || fy || '/' || lpad(nextval('gst_credit_note_seq')::text, 4, '0')
    end;
  end if;
  return new;
end;
$$;
