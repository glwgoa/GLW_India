-- When a booking confirmation was last sent to the customer on WhatsApp (through Kommo), and by whom.
alter table bookings
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_sent_by uuid references profiles (id) on delete set null;
