alter table catalog_items
  add column if not exists morning_sailing_price numeric,
  add column if not exists morning_anchorage_price numeric;

-- B2B yacht rates, Nov 2026 sheet. Existing sailing_price/anchorage_price hold the Evening rates.
-- Only yachts already in catalog_items (Private Yachts, matched by name ignoring case/spaces) are updated.
with rates(name, ev_sailing, ev_anchorage, mo_sailing, mo_anchorage) as (values
  ('Havana', 8000, 4000, 7000, 3000),
  ('Ocean Winner', 6000, 3000, 5000, 3000),
  ('Lovely', 15000, 9000, 14000, 9000),
  ('Baystar', 5000, 2500, 5000, 2500),
  ('Tarini', 10000, 5000, 10000, 5000),
  ('Phoenix', 8000, 3000, 8000, 3000),
  ('Venus', 7000, 2000, 7000, 2000),
  ('Blue Diamond', 12000, 4000, 12000, 4000),
  ('Aqumarine', 8000, 4000, 8000, 4000),
  ('Rare', 10000, 5000, 10000, 5000),
  ('Prawn', 7000, 2000, 7000, 2000),
  ('Sinq', 8000, 4000, 8000, 4000),
  ('Tiana', 7000, 3000, 7000, 3000),
  ('Poseidon', 9000, 2000, 8000, 2000),
  ('Pegasus', 10000, 8000, 10000, 8000),
  ('Aquila', 8000, 4000, 8000, 4000),
  ('Coco', 8000, 8000, 8000, 8000),
  ('Sea senora', 10000, 5000, 10000, 5000),
  ('Joan of arc', 8000, 4000, 8000, 4000),
  ('Taj exotica', 15000, 9000, 12000, 6000),
  ('White pearl', 10000, 5000, 10000, 5000),
  ('Taj Seray', 8000, 4000, 7000, 4000),
  ('Dhruv', 7000, 3000, 5000, 2000),
  ('Declan', 10000, 5000, 7000, 3000),
  ('Ralson 2', 12000, 4000, 8000, 4000),
  ('Rinker', 7000, 2500, 7000, 2500),
  ('Majestic', 7000, 3000, 6500, 2500),
  ('Nicolin', 7500, 3500, 6500, 2500),
  ('Nithya', 14500, 2000, 14500, 2000),
  ('Urmi', 7000, 2000, 7000, 2000),
  ('Speed Boat', 8000, 1000, 8000, 1000),
  ('Blue fin', 8000, 1000, 7500, 1000),
  ('Mondovi lounge Boat', 5000, 1500, 5000, 1500),
  ('Manta ray', 9000, 1500, 8500, 1500),
  ('Sea ray 330', 9500, 2500, 9500, 2500),
  ('Prestage 36', 10000, 3000, 9500, 2500),
  ('Funliner', 10000, 3000, 10000, 3000),
  ('Sunset 42', 14000, 8000, 13000, 7000),
  ('Orca', 11000, 6000, 10000, 5000),
  ('Polaris', 19000, 9000, 19000, 9000),
  ('Shantam Catamaran', 18000, 9000, 18000, 9000),
  ('Solaris', 7000, 3000, 7000, 3000),
  ('Foxy Lady', 30000, 20000, 30000, 20000),
  ('Ferretti 460', 24000, 12000, 24000, 12000),
  ('Ferretti 550', 26000, 14000, 26000, 14000),
  ('Azimut 68', 35000, 30000, 35000, 30000),
  ('Prestige 620', 35000, 30000, 35000, 30000),
  ('Nefferity', 28000, 14000, 28000, 14000),
  ('Ahilo', 15000, 7500, 15000, 7500),
  ('Leo Mar', 25000, null, 25000, null),
  ('Sea breeze', 25000, null, 25000, null),
  ('Sunshine', 10000, 5000, 10000, 5000),
  ('Prafulla', 5000, 1000, 5000, 1000),
  ('Mv Angel', 8000, 1000, null, null),
  ('Torpedo', 18000, null, 16000, null),
  ('Ripples Orca', 12000, null, 10000, null),
  ('Calypso', 8000, 4000, null, null)
)
update catalog_items c
set sailing_price = r.ev_sailing,
    anchorage_price = r.ev_anchorage,
    morning_sailing_price = r.mo_sailing,
    morning_anchorage_price = r.mo_anchorage
from rates r
where c.category = 'Private Yachts'
  and lower(trim(regexp_replace(c.name, '\s+', ' ', 'g'))) = lower(r.name);

-- Check afterwards: yachts in the dashboard that did not match the sheet
-- select name from catalog_items where category = 'Private Yachts' and sailing_price is null;
