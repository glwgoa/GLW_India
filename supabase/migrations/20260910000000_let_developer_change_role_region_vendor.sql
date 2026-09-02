-- prevent_self_privilege_escalation still hardcoded 'admin' from before the
-- developer-outranks-admin change, so developer got the "only admins can
-- change role/region/vendor" error editing any employee, including
-- themselves. Use is_privileged() so developer has full admin access too.
create or replace function public.prevent_self_privilege_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_privileged() then
    if new.role is distinct from old.role
       or new.region_id is distinct from old.region_id
       or new.vendor_id is distinct from old.vendor_id then
      raise exception 'Only admins can change role, region, or vendor assignment';
    end if;
  end if;
  return new;
end;
$$;
