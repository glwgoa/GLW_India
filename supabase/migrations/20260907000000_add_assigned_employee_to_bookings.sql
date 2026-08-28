alter table bookings add column assigned_employee_id uuid references profiles(id) on delete set null;
