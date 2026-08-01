-- Drop the parameterized versions (allowed probing arbitrary users' role/region/vendor via RPC)
-- CASCADE removes the dependent policies; they are recreated identically below,
-- just bound to the new no-arg functions.
drop function if exists public.get_user_role(uuid) cascade;
drop function if exists public.get_user_region(uuid) cascade;
drop function if exists public.get_user_vendor(uuid) cascade;

-- Recreate as no-arg, always bound to the caller's own auth.uid() (no probing other users)
create function public.get_user_role()
returns user_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create function public.get_user_region()
returns uuid language sql stable security definer set search_path = public
as $$ select region_id from public.profiles where id = auth.uid() $$;

create function public.get_user_vendor()
returns uuid language sql stable security definer set search_path = public
as $$ select vendor_id from public.profiles where id = auth.uid() $$;

revoke all on function public.get_user_role() from public, anon;
revoke all on function public.get_user_region() from public, anon;
revoke all on function public.get_user_vendor() from public, anon;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.get_user_region() to authenticated;
grant execute on function public.get_user_vendor() to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Recreate all policies dropped by CASCADE
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or get_user_role() = 'admin');
create policy "profiles_update" on profiles for update
  using (id = auth.uid() or get_user_role() = 'admin');

create policy "vendors_select" on vendors for select
  using (get_user_role() = 'admin' or get_user_role() = 'project_manager' or id = get_user_vendor());
create policy "vendors_update" on vendors for update
  using (get_user_role() = 'admin' or id = get_user_vendor());
create policy "vendors_insert" on vendors for insert with check (get_user_role() = 'admin');
create policy "vendors_delete" on vendors for delete using (get_user_role() = 'admin');

create policy "sla_guidelines_select" on sla_guidelines for select
  using (get_user_role() = 'admin' or get_user_role() = 'project_manager' or vendor_id = get_user_vendor());
create policy "sla_guidelines_modify" on sla_guidelines for all
  using (get_user_role() = 'admin') with check (get_user_role() = 'admin');

create policy "regions_modify" on regions for all
  using (get_user_role() = 'admin') with check (get_user_role() = 'admin');

create policy "catalog_items_modify" on catalog_items for all
  using (get_user_role() = 'admin') with check (get_user_role() = 'admin');

create policy "regional_inventory_modify" on regional_inventory for all
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()))
  with check (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));

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

create policy "projects_select" on projects for select
  using (
    get_user_role() = 'admin'
    or (get_user_role() = 'project_manager' and region_id = get_user_region())
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );
create policy "projects_modify" on projects for all
  using (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()))
  with check (get_user_role() = 'admin' or (get_user_role() = 'project_manager' and region_id = get_user_region()));

create policy "attendance_select" on attendance for select
  using (user_id = auth.uid() or get_user_role() in ('admin', 'hr'));
create policy "attendance_insert" on attendance for insert
  with check (user_id = auth.uid() or get_user_role() in ('admin', 'hr'));
create policy "attendance_update" on attendance for update
  using (user_id = auth.uid() or get_user_role() in ('admin', 'hr'));
