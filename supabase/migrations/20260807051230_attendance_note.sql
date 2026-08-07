-- Optional note captured at clock-out. Visibility to admin-only is
-- enforced at the UI layer (same pattern as vendor payment details) —
-- RLS still lets the row's own user and HR read the row itself.
alter table attendance add column note text;
