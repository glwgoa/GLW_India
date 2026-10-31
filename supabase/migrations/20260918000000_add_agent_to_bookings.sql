-- Agent who brought the booking (optional).
alter table bookings add column agent_name text, add column agent_number text;
