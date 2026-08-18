-- "developer" becomes a superuser role: everywhere admin has access,
-- developer has the same access, and admins can no longer edit/demote
-- developer profiles (only a developer can touch a developer's profile).

create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select get_user_role() in ('admin', 'developer') $$;

revoke all on function public.is_privileged() from public, anon;
grant execute on function public.is_privileged() to authenticated;

-- attendance
drop policy if exists "attendance_insert" on attendance;
create policy "attendance_insert" on attendance for insert
  with check (user_id = (select auth.uid()) or is_privileged() or get_user_role() = 'hr');

drop policy if exists "attendance_select" on attendance;
create policy "attendance_select" on attendance for select
  using (user_id = (select auth.uid()) or is_privileged() or get_user_role() = 'hr');

drop policy if exists "attendance_update" on attendance;
create policy "attendance_update" on attendance for update
  using (user_id = (select auth.uid()) or is_privileged() or get_user_role() = 'hr');

-- bookings
drop policy if exists "bookings_delete" on bookings;
create policy "bookings_delete" on bookings for delete using (is_privileged());

drop policy if exists "bookings_insert" on bookings;
create policy "bookings_insert" on bookings for insert
  with check (is_privileged() or get_user_role() = 'project_manager');

drop policy if exists "bookings_select" on bookings;
create policy "bookings_select" on bookings for select
  using (
    is_privileged()
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
    or (get_user_role() = 'project_manager' and region_id = get_user_region())
  );

drop policy if exists "bookings_update" on bookings;
create policy "bookings_update" on bookings for update
  using (
    is_privileged()
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
    or (get_user_role() = 'project_manager' and region_id = get_user_region())
  );

-- catalog_items
drop policy if exists "catalog_items_delete" on catalog_items;
create policy "catalog_items_delete" on catalog_items for delete using (is_privileged());

drop policy if exists "catalog_items_insert" on catalog_items;
create policy "catalog_items_insert" on catalog_items for insert with check (is_privileged());

drop policy if exists "catalog_items_update" on catalog_items;
create policy "catalog_items_update" on catalog_items for update using (is_privileged());

-- profiles: admin can manage everyone except developers; developer can manage everyone
drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update
  using (
    id = (select auth.uid())
    or get_user_role() = 'developer'
    or (get_user_role() = 'admin' and role <> 'developer')
  )
  with check (
    id = (select auth.uid())
    or get_user_role() = 'developer'
    or (get_user_role() = 'admin' and role <> 'developer')
  );

-- projects
drop policy if exists "projects_delete" on projects;
create policy "projects_delete" on projects for delete using (is_privileged());

drop policy if exists "projects_insert" on projects;
create policy "projects_insert" on projects for insert
  with check (is_privileged() or (get_user_role() = 'project_manager' and region_id = get_user_region()));

drop policy if exists "projects_select" on projects;
create policy "projects_select" on projects for select
  using (
    is_privileged()
    or (get_user_role() = 'project_manager' and region_id = get_user_region())
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );

drop policy if exists "projects_update" on projects;
create policy "projects_update" on projects for update
  using (is_privileged() or (get_user_role() = 'project_manager' and region_id = get_user_region()));

-- regional_inventory
drop policy if exists "regional_inventory_delete" on regional_inventory;
create policy "regional_inventory_delete" on regional_inventory for delete
  using (is_privileged() or (get_user_role() = 'project_manager' and region_id = get_user_region()));

drop policy if exists "regional_inventory_insert" on regional_inventory;
create policy "regional_inventory_insert" on regional_inventory for insert
  with check (is_privileged() or (get_user_role() = 'project_manager' and region_id = get_user_region()));

drop policy if exists "regional_inventory_update" on regional_inventory;
create policy "regional_inventory_update" on regional_inventory for update
  using (is_privileged() or (get_user_role() = 'project_manager' and region_id = get_user_region()));

-- regions
drop policy if exists "regions_delete" on regions;
create policy "regions_delete" on regions for delete using (is_privileged());

drop policy if exists "regions_insert" on regions;
create policy "regions_insert" on regions for insert with check (is_privileged());

drop policy if exists "regions_update" on regions;
create policy "regions_update" on regions for update using (is_privileged());

-- sla_guidelines
drop policy if exists "sla_guidelines_delete" on sla_guidelines;
create policy "sla_guidelines_delete" on sla_guidelines for delete using (is_privileged());

drop policy if exists "sla_guidelines_insert" on sla_guidelines;
create policy "sla_guidelines_insert" on sla_guidelines for insert with check (is_privileged());

drop policy if exists "sla_guidelines_select" on sla_guidelines;
create policy "sla_guidelines_select" on sla_guidelines for select
  using (is_privileged() or get_user_role() = 'project_manager' or vendor_id = get_user_vendor());

drop policy if exists "sla_guidelines_update" on sla_guidelines;
create policy "sla_guidelines_update" on sla_guidelines for update using (is_privileged());

-- vendors
drop policy if exists "vendors_delete" on vendors;
create policy "vendors_delete" on vendors for delete using (is_privileged());

drop policy if exists "vendors_insert" on vendors;
create policy "vendors_insert" on vendors for insert with check (is_privileged());

drop policy if exists "vendors_select" on vendors;
create policy "vendors_select" on vendors for select
  using (is_privileged() or get_user_role() = 'project_manager' or id = get_user_vendor());

drop policy if exists "vendors_update" on vendors;
create policy "vendors_update" on vendors for update using (is_privileged() or id = get_user_vendor());

-- storage: product-images bucket
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects for delete
  using (bucket_id = 'product-images' and is_privileged());

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and is_privileged());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects for update
  using (bucket_id = 'product-images' and is_privileged());
