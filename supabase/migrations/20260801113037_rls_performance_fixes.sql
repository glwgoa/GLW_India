-- Fixes from the Supabase performance advisor:
-- 1. Missing FK indexes.
-- 2. RLS policies calling auth.uid()/auth.role() directly get re-evaluated
--    per row; wrapping in (select ...) lets Postgres evaluate them once
--    per statement instead.
-- 3. Tables with both a dedicated SELECT policy and a "FOR ALL" policy had
--    two permissive policies evaluated on every SELECT; splitting "FOR ALL"
--    into INSERT/UPDATE/DELETE removes the overlap.

create index idx_regional_inventory_item_id on regional_inventory(item_id);
create index idx_sla_guidelines_vendor_id on sla_guidelines(vendor_id);

-- profiles
drop policy "profiles_select" on profiles;
drop policy "profiles_update" on profiles;
drop policy "profiles_insert_self" on profiles;

create policy "profiles_select" on profiles for select
  using (id = (select auth.uid()) or get_user_role() = 'admin');
create policy "profiles_update" on profiles for update
  using (id = (select auth.uid()) or get_user_role() = 'admin');
create policy "profiles_insert_self" on profiles for insert
  with check (id = (select auth.uid()));

-- regions
drop policy "regions_select" on regions;
drop policy "regions_modify" on regions;

create policy "regions_select" on regions for select
  using ((select auth.role()) = 'authenticated');
create policy "regions_insert" on regions for insert with check (get_user_role() = 'admin');
create policy "regions_update" on regions for update using (get_user_role() = 'admin');
create policy "regions_delete" on regions for delete using (get_user_role() = 'admin');

-- catalog_items
drop policy "catalog_items_select" on catalog_items;
drop policy "catalog_items_modify" on catalog_items;

create policy "catalog_items_select" on catalog_items for select
  using ((select auth.role()) = 'authenticated');
create policy "catalog_items_insert" on catalog_items for insert with check (get_user_role() = 'admin');
create policy "catalog_items_update" on catalog_items for update using (get_user_role() = 'admin');
create policy "catalog_items_delete" on catalog_items for delete using (get_user_role() = 'admin');

-- regional_inventory
drop policy "regional_inventory_select" on regional_inventory;
drop policy "regional_inventory_modify" on regional_inventory;

create policy "regional_inventory_select" on regional_inventory for select
  using ((select auth.role()) = 'authenticated');
create policy "regional_inventory_insert" on regional_inventory for insert
  with check (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));
create policy "regional_inventory_update" on regional_inventory for update
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));
create policy "regional_inventory_delete" on regional_inventory for delete
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));

-- sla_guidelines
drop policy "sla_guidelines_modify" on sla_guidelines;

create policy "sla_guidelines_insert" on sla_guidelines for insert with check (get_user_role() = 'admin');
create policy "sla_guidelines_update" on sla_guidelines for update using (get_user_role() = 'admin');
create policy "sla_guidelines_delete" on sla_guidelines for delete using (get_user_role() = 'admin');

-- projects
drop policy "projects_modify" on projects;

create policy "projects_insert" on projects for insert
  with check (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));
create policy "projects_update" on projects for update
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));
create policy "projects_delete" on projects for delete
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));

-- attendance
drop policy "attendance_select" on attendance;
drop policy "attendance_insert" on attendance;
drop policy "attendance_update" on attendance;

create policy "attendance_select" on attendance for select
  using (user_id = (select auth.uid()) or get_user_role() in ('admin', 'hr'));
create policy "attendance_insert" on attendance for insert
  with check (user_id = (select auth.uid()) or get_user_role() in ('admin', 'hr'));
create policy "attendance_update" on attendance for update
  using (user_id = (select auth.uid()) or get_user_role() in ('admin', 'hr'));
