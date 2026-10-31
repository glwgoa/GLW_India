-- Regions are no longer shown or assigned in the app, so access is no longer limited by region.
-- Project managers see everything they were allowed to see before, across all regions; employees can
-- create the starting stock row when adding a product. Region columns and data are left untouched.

drop policy if exists "bookings_select" on bookings;
create policy "bookings_select" on bookings for select
  using (
    is_privileged()
    or get_user_role() in ('employee', 'project_manager')
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );

drop policy if exists "bookings_update" on bookings;
create policy "bookings_update" on bookings for update
  using (
    is_privileged()
    or get_user_role() in ('employee', 'project_manager')
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );

drop policy if exists "projects_insert" on projects;
create policy "projects_insert" on projects for insert
  with check (is_privileged() or get_user_role() = 'project_manager');

drop policy if exists "projects_select" on projects;
create policy "projects_select" on projects for select
  using (
    is_privileged()
    or get_user_role() = 'project_manager'
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );

drop policy if exists "projects_update" on projects;
create policy "projects_update" on projects for update
  using (is_privileged() or get_user_role() = 'project_manager');

drop policy if exists "regional_inventory_insert" on regional_inventory;
create policy "regional_inventory_insert" on regional_inventory for insert
  with check (is_privileged() or get_user_role() in ('project_manager', 'employee'));

drop policy if exists "regional_inventory_update" on regional_inventory;
create policy "regional_inventory_update" on regional_inventory for update
  using (is_privileged() or get_user_role() = 'project_manager');

drop policy if exists "regional_inventory_delete" on regional_inventory;
create policy "regional_inventory_delete" on regional_inventory for delete
  using (is_privileged() or get_user_role() = 'project_manager');
