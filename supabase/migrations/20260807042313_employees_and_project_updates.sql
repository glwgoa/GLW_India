-- Employees directory: everyone (any authenticated role) can view all
-- profiles, matching the pattern already used for regions/catalog_items.
drop policy "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using ((select auth.role()) = 'authenticated');

-- Guard against privilege escalation now that self-update is combined with
-- broader read access: a non-admin can still update their own row (e.g.
-- full_name), but may not change their own role/region/vendor assignment.
-- Only admins may change those fields, on any row.
create or replace function public.prevent_self_privilege_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if get_user_role() <> 'admin' then
    if new.role is distinct from old.role
       or new.region_id is distinct from old.region_id
       or new.vendor_id is distinct from old.vendor_id then
      raise exception 'Only admins can change role, region, or vendor assignment';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_privilege_escalation
  before update on profiles
  for each row execute function public.prevent_self_privilege_escalation();

-- Projects: internal employee assignment, alongside the existing vendor
-- assignment.
alter table projects add column assigned_employee_id uuid references profiles(id) on delete set null;
create index idx_projects_assigned_employee_id on projects(assigned_employee_id);

-- Deleting a project is admin-only (previously bundled with the same
-- admin-or-PM-own-region condition as insert/update).
drop policy "projects_delete" on projects;
create policy "projects_delete" on projects for delete
  using (get_user_role() = 'admin');
