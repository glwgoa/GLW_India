-- Regions
insert into regions (name, code) values
  ('North Goa', 'NGA'),
  ('South Goa', 'SGA'),
  ('Panaji', 'PNJ'),
  ('Margao', 'MGA')
on conflict (name) do nothing;

-- Vendors (no natural unique key in the base schema; guard with NOT EXISTS)
insert into vendors (name, contact_email, contact_phone, rating)
select v.name, v.contact_email, v.contact_phone, v.rating
from (values
  ('Coastal Facility Services', 'ops@coastalfacility.example', '+91-9820011122', 4.6),
  ('Sunrise Maintenance Co.', 'contact@sunrisemaint.example', '+91-9820011133', 4.2),
  ('GreenLeaf Logistics', 'hello@greenleaflog.example', '+91-9820011144', 4.8),
  ('Panaji Home Solutions', 'support@panajihome.example', '+91-9820011155', 3.9),
  ('Margao Rapid Repairs', 'info@margaorapid.example', '+91-9820011166', 4.4)
) as v(name, contact_email, contact_phone, rating)
where not exists (select 1 from vendors where contact_email = v.contact_email);

-- SLA guidelines, one per seeded vendor
insert into sla_guidelines (vendor_id, max_response_time_mins, max_resolution_time_hours, penalty_terms)
select id, 30, 24, '5% booking value deducted per hour past resolution SLA'
from vendors
where contact_email in (
  'ops@coastalfacility.example', 'contact@sunrisemaint.example', 'hello@greenleaflog.example',
  'support@panajihome.example', 'info@margaorapid.example'
)
and not exists (select 1 from sla_guidelines g where g.vendor_id = vendors.id);

-- Catalog items
insert into catalog_items (sku, name, description, category) values
  ('CLN-001', 'Deep Cleaning Kit', 'Full-home deep cleaning service kit', 'Cleaning'),
  ('CLN-002', 'Sofa Shampoo Service', 'Upholstery shampoo and dry treatment', 'Cleaning'),
  ('ELE-001', 'Wiring Inspection Kit', 'Electrical safety inspection toolkit', 'Electrical'),
  ('ELE-002', 'Inverter Install Kit', 'Home inverter installation hardware', 'Electrical'),
  ('PLM-001', 'Pipe Leak Repair Kit', 'Standard plumbing leak repair parts', 'Plumbing'),
  ('PLM-002', 'Water Heater Service Kit', 'Water heater servicing parts', 'Plumbing'),
  ('PST-001', 'Pest Control Spray Kit', 'General pest control treatment kit', 'Pest Control'),
  ('PST-002', 'Termite Treatment Kit', 'Termite barrier treatment kit', 'Pest Control'),
  ('APP-001', 'AC Service Kit', 'Split AC servicing and gas top-up kit', 'Appliance'),
  ('APP-002', 'Washing Machine Repair Kit', 'Washing machine repair parts', 'Appliance')
on conflict (sku) do nothing;

-- Regional inventory: cross a subset of items into each region
insert into regional_inventory (region_id, item_id, unit_price, stock_quantity, reserved_quantity)
select r.id, i.id, ip.unit_price, ip.stock_quantity, ip.reserved_quantity
from regions r
join catalog_items i on i.sku in ('CLN-001', 'ELE-001', 'PLM-001', 'PST-001', 'APP-001')
join (values
  ('CLN-001', 999.00, 40, 5),
  ('ELE-001', 499.00, 25, 3),
  ('PLM-001', 349.00, 12, 10),
  ('PST-001', 799.00, 30, 4),
  ('APP-001', 1299.00, 8, 6)
) as ip(sku, unit_price, stock_quantity, reserved_quantity) on ip.sku = i.sku
on conflict (region_id, item_id) do nothing;

-- Bookings: mixed status/sla_status, some near-deadline, some already breached
insert into bookings (customer_name, region_id, assigned_vendor_id, status, sla_status, sla_deadline, created_at)
select b.customer_name, r.id, v.id, b.status::booking_status, b.sla_status::sla_status, b.sla_deadline, now()
from (values
  ('Ravi Kamath', 'NGA', 'ops@coastalfacility.example', 'in_progress', 'on_track', now() + interval '2 hours'),
  ('Priya Naik', 'SGA', 'contact@sunrisemaint.example', 'assigned', 'warning', now() + interval '20 minutes'),
  ('Ana Fernandes', 'PNJ', 'hello@greenleaflog.example', 'pending', 'breached', now() - interval '3 hours'),
  ('Sameer Dhond', 'MGA', 'support@panajihome.example', 'completed', 'met', now() - interval '1 day'),
  ('Leah D''Souza', 'NGA', 'info@margaorapid.example', 'in_progress', 'on_track', now() + interval '6 hours'),
  ('Vikram Shet', 'SGA', 'ops@coastalfacility.example', 'completed', 'breached', now() - interval '2 days'),
  ('Meera Prabhu', 'PNJ', null, 'pending', 'on_track', now() + interval '1 day'),
  ('Ollie Pereira', 'MGA', 'contact@sunrisemaint.example', 'cancelled', 'on_track', now() - interval '4 hours')
) as b(customer_name, region_code, vendor_email, status, sla_status, sla_deadline)
join regions r on r.code = b.region_code
left join vendors v on v.contact_email = b.vendor_email
where not exists (select 1 from bookings existing where existing.customer_name = b.customer_name);

-- Projects
insert into projects (title, assigned_vendor_id, region_id, budget, deadline, status)
select p.title, v.id, r.id, p.budget, p.deadline, p.status
from (values
  ('North Goa Villa Retrofit', 'ops@coastalfacility.example', 'NGA', 450000.00, now() + interval '30 days', 'active'),
  ('South Goa Resort Plumbing Overhaul', 'contact@sunrisemaint.example', 'SGA', 280000.00, now() + interval '45 days', 'in_progress'),
  ('Panaji Office Electrical Upgrade', 'hello@greenleaflog.example', 'PNJ', 175000.00, now() + interval '20 days', 'active'),
  ('Margao Housing Pest Control Contract', 'support@panajihome.example', 'MGA', 95000.00, now() + interval '15 days', 'on_hold'),
  ('North Goa Seasonal AC Servicing', 'info@margaorapid.example', 'NGA', 60000.00, now() - interval '5 days', 'completed')
) as p(title, vendor_email, region_code, budget, deadline, status)
join regions r on r.code = p.region_code
left join vendors v on v.contact_email = p.vendor_email
where not exists (select 1 from projects existing where existing.title = p.title);
