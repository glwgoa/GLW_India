-- Multi-line invoices with payment tracking.
-- Existing rows keep line_items = null and render from the legacy single-line columns.
alter table gst_documents
  add column if not exists line_items jsonb,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists paid_date date;
