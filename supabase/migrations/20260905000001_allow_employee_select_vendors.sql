-- Employees can now add/edit bookings and need the Vendor dropdown to
-- populate, same as project_manager already could.
drop policy if exists vendors_select on vendors;
create policy vendors_select on vendors for select
  using (
    is_privileged()
    or get_user_role() in ('project_manager'::user_role, 'employee'::user_role)
    or id = get_user_vendor()
  );
