-- Employees see and can edit every booking, not just ones in their own
-- region (unlike project_manager, which stays region-scoped). Still no
-- delete access — that stays admin/developer only via bookings_delete.
drop policy if exists bookings_select on bookings;
create policy bookings_select on bookings for select
  using (
    is_privileged()
    or get_user_role() = 'employee'::user_role
    or (get_user_role() = 'vendor'::user_role and assigned_vendor_id = get_user_vendor())
    or (get_user_role() = 'project_manager'::user_role and region_id = get_user_region())
  );

drop policy if exists bookings_update on bookings;
create policy bookings_update on bookings for update
  using (
    is_privileged()
    or get_user_role() = 'employee'::user_role
    or (get_user_role() = 'vendor'::user_role and assigned_vendor_id = get_user_vendor())
    or (get_user_role() = 'project_manager'::user_role and region_id = get_user_region())
  );
