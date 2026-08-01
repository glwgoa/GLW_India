alter table profiles enable row level security;
alter table vendors enable row level security;
alter table sla_guidelines enable row level security;
alter table regions enable row level security;
alter table catalog_items enable row level security;
alter table regional_inventory enable row level security;
alter table bookings enable row level security;
alter table projects enable row level security;
alter table attendance enable row level security;

-- profiles: users manage their own row; admins manage all
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or get_user_role() = 'admin');
create policy "profiles_update" on profiles for update
  using (id = auth.uid() or get_user_role() = 'admin');
create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid());

-- vendors: admin unrestricted; vendor sees/updates own row; PM read-only
create policy "vendors_select" on vendors for select
  using (get_user_role() = 'admin' or get_user_role() = 'project_manager' or id = get_user_vendor());
create policy "vendors_update" on vendors for update
  using (get_user_role() = 'admin' or id = get_user_vendor());
create policy "vendors_insert" on vendors for insert with check (get_user_role() = 'admin');
create policy "vendors_delete" on vendors for delete using (get_user_role() = 'admin');

-- sla_guidelines: admin unrestricted; vendor sees own; PM read-only
create policy "sla_guidelines_select" on sla_guidelines for select
  using (get_user_role() = 'admin' or get_user_role() = 'project_manager' or vendor_id = get_user_vendor());
create policy "sla_guidelines_modify" on sla_guidelines for all
  using (get_user_role() = 'admin') with check (get_user_role() = 'admin');

-- regions: readable by all authenticated users; admin-only writes
create policy "regions_select" on regions for select using (auth.role() = 'authenticated');
create policy "regions_modify" on regions for all
  using (get_user_role() = 'admin') with check (get_user_role() = 'admin');

-- catalog_items: readable by all authenticated users; admin-only writes
create policy "catalog_items_select" on catalog_items for select using (auth.role() = 'authenticated');
create policy "catalog_items_modify" on catalog_items for all
  using (get_user_role() = 'admin') with check (get_user_role() = 'admin');

-- regional_inventory: readable by all authenticated; admin unrestricted writes;
-- PM writes only within their own region_id
create policy "regional_inventory_select" on regional_inventory for select using (auth.role() = 'authenticated');
create policy "regional_inventory_modify" on regional_inventory for all
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()))
  with check (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));

-- bookings: admin unrestricted; vendor sees/updates only bookings assigned to them;
-- PM restricted to bookings within their region; PM/admin can create
create policy "bookings_select" on bookings for select
  using (
    get_user_role() = 'admin'
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
    or (get_user_role() = 'project_manager' and region_id = get_user_region())
  );
create policy "bookings_update" on bookings for update
  using (
    get_user_role() = 'admin'
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
    or (get_user_role() = 'project_manager' and region_id = get_user_region())
  );
create policy "bookings_insert" on bookings for insert
  with check (get_user_role() in ('admin', 'project_manager'));
create policy "bookings_delete" on bookings for delete using (get_user_role() = 'admin');

-- projects: admin unrestricted; PM restricted to own region; vendor sees only assigned projects
create policy "projects_select" on projects for select
  using (
    get_user_role() = 'admin'
    or (get_user_role() = 'project_manager' and region_id = get_user_region())
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );
create policy "projects_modify" on projects for all
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()))
  with check (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));

-- attendance: employees see/create only their own; admin/hr see and manage all
create policy "attendance_select" on attendance for select
  using (user_id = auth.uid() or get_user_role() in ('admin', 'hr'));
create policy "attendance_insert" on attendance for insert
  with check (user_id = auth.uid() or get_user_role() in ('admin', 'hr'));
create policy "attendance_update" on attendance for update
  using (user_id = auth.uid() or get_user_role() in ('admin', 'hr'));
