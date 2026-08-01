-- Auto-create a profiles row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER helpers used by RLS policies (avoid recursive RLS on profiles)
create or replace function public.get_user_role(uid uuid default auth.uid())
returns user_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = uid $$;

create or replace function public.get_user_region(uid uuid default auth.uid())
returns uuid language sql stable security definer set search_path = public
as $$ select region_id from public.profiles where id = uid $$;

create or replace function public.get_user_vendor(uid uuid default auth.uid())
returns uuid language sql stable security definer set search_path = public
as $$ select vendor_id from public.profiles where id = uid $$;
