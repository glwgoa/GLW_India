-- 1. Profiles & Roles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role user_role default 'employee',
  region_id uuid,
  vendor_id uuid,
  created_at timestamptz default now()
);

-- 2. Vendors & SLA Guidelines
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text not null,
  contact_phone text,
  rating decimal(3,2) default 5.0,
  created_at timestamptz default now()
);

create table sla_guidelines (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  max_response_time_mins int not null,
  max_resolution_time_hours int not null,
  penalty_terms text
);

-- 3. Regional Catalogs & Inventory
create table regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique
);

create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text
);

create table regional_inventory (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id) on delete cascade,
  item_id uuid references catalog_items(id) on delete cascade,
  unit_price decimal(10,2) not null,
  stock_quantity int not null default 0,
  reserved_quantity int not null default 0,
  unique(region_id, item_id)
);

-- 4. Bookings & Vendor Attribution
create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  region_id uuid references regions(id),
  assigned_vendor_id uuid references vendors(id),
  status booking_status default 'pending',
  sla_status sla_status default 'on_track',
  sla_deadline timestamptz not null,
  created_at timestamptz default now()
);

-- 5. Projects & Attendance
create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assigned_vendor_id uuid references vendors(id),
  region_id uuid references regions(id),
  budget decimal(12,2),
  deadline timestamptz,
  status text default 'active'
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  location_coordinates point,
  status text default 'present'
);

-- Deferred FKs that reference tables created after profiles
alter table profiles add constraint profiles_region_id_fkey foreign key (region_id) references regions(id);
alter table profiles add constraint profiles_vendor_id_fkey foreign key (vendor_id) references vendors(id);

-- Indexes
create index idx_profiles_vendor_id on profiles(vendor_id);
create index idx_profiles_region_id on profiles(region_id);
create index idx_bookings_assigned_vendor_id on bookings(assigned_vendor_id);
create index idx_bookings_region_id on bookings(region_id);
create index idx_bookings_sla_status on bookings(sla_status);
create index idx_projects_assigned_vendor_id on projects(assigned_vendor_id);
create index idx_projects_region_id on projects(region_id);
create index idx_regional_inventory_region_id on regional_inventory(region_id);
create index idx_attendance_user_id on attendance(user_id);

-- Realtime
alter publication supabase_realtime add table bookings, regional_inventory;
