-- Vendors can now belong to more than one category (each optionally with
-- its own sub-category), so category moves from two text columns on
-- vendors into a proper many-to-many join table.
create table vendor_category_selections (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  category_id uuid not null references vendor_categories(id) on delete cascade,
  sub_category_id uuid references vendor_sub_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vendor_id, category_id, sub_category_id)
);

alter table vendor_category_selections enable row level security;

create policy "vendor_category_selections_select" on vendor_category_selections for select
  using (get_user_role() is not null);
create policy "vendor_category_selections_insert" on vendor_category_selections for insert
  with check (is_privileged() or vendor_id = get_user_vendor());
create policy "vendor_category_selections_update" on vendor_category_selections for update
  using (is_privileged() or vendor_id = get_user_vendor());
create policy "vendor_category_selections_delete" on vendor_category_selections for delete
  using (is_privileged() or vendor_id = get_user_vendor());

-- Backfill from the existing single category/sub_category text columns.
insert into vendor_category_selections (vendor_id, category_id, sub_category_id)
select v.id, c.id, s.id
from vendors v
join vendor_categories c on c.name = v.category
left join vendor_sub_categories s on s.category_id = c.id and s.name = v.sub_category
where v.category is not null;

alter table vendors drop column category;
alter table vendors drop column sub_category;
