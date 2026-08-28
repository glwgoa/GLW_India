-- Employees can add and edit bookings in their own region, same as
-- project_manager — but (like project_manager) still cannot delete;
-- that stays admin/developer only via the existing bookings_delete policy.
drop policy if exists bookings_select on bookings;
create policy bookings_select on bookings for select
  using (
    is_privileged()
    or (get_user_role() = 'vendor'::user_role and assigned_vendor_id = get_user_vendor())
    or (get_user_role() in ('project_manager'::user_role, 'employee'::user_role) and region_id = get_user_region())
  );

drop policy if exists bookings_insert on bookings;
create policy bookings_insert on bookings for insert
  with check (
    is_privileged()
    or get_user_role() in ('project_manager'::user_role, 'employee'::user_role)
  );

drop policy if exists bookings_update on bookings;
create policy bookings_update on bookings for update
  using (
    is_privileged()
    or (get_user_role() = 'vendor'::user_role and assigned_vendor_id = get_user_vendor())
    or (get_user_role() in ('project_manager'::user_role, 'employee'::user_role) and region_id = get_user_region())
  );
