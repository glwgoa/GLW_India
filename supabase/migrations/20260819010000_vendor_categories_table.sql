-- Vendor categories/sub-categories move from hardcoded UI constants into
-- developer-managed tables, so the category list can change without a code
-- deploy. Only the developer role may add/edit/remove them; everyone who can
-- see the vendor form can read them.
create table vendor_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table vendor_sub_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references vendor_categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

alter table vendor_categories enable row level security;
alter table vendor_sub_categories enable row level security;

create policy "vendor_categories_select" on vendor_categories for select
  using (get_user_role() is not null);
create policy "vendor_categories_insert" on vendor_categories for insert
  with check (get_user_role() = 'developer');
create policy "vendor_categories_update" on vendor_categories for update
  using (get_user_role() = 'developer');
create policy "vendor_categories_delete" on vendor_categories for delete
  using (get_user_role() = 'developer');

create policy "vendor_sub_categories_select" on vendor_sub_categories for select
  using (get_user_role() is not null);
create policy "vendor_sub_categories_insert" on vendor_sub_categories for insert
  with check (get_user_role() = 'developer');
create policy "vendor_sub_categories_update" on vendor_sub_categories for update
  using (get_user_role() = 'developer');
create policy "vendor_sub_categories_delete" on vendor_sub_categories for delete
  using (get_user_role() = 'developer');

-- Seed with the categories already in use.
with cat as (
  insert into vendor_categories (name)
  values
    ('Dinner Cruise'),
    ('Private Yachts'),
    ('Catering'),
    ('Transportation'),
    ('Decor'),
    ('Dancers'),
    ('Bar Setup'),
    ('Music'),
    ('Drone')
  returning id, name
)
insert into vendor_sub_categories (category_id, name)
select cat.id, sub.name
from cat
join (
  values
    ('Dancers', 'Russian'),
    ('Dancers', 'Bollywood'),
    ('Music', 'Singer'),
    ('Music', 'Band'),
    ('Music', 'Guitarist'),
    ('Music', 'DJ'),
    ('Music', 'Violinist')
) as sub(category_name, name) on sub.category_name = cat.name;
