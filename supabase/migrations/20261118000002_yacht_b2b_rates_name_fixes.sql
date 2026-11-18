-- Dashboard names that differ from the Nov 2026 B2B sheet. Same rates, matched by normalised dashboard name.
with rates(dash_name, ev_sailing, ev_anchorage, mo_sailing, mo_anchorage) as (values
  ('aquamarine - (south goa)', 8000, 4000, 8000, 4000),  -- sheet: Aqumarine
  ('havana yacht',             8000, 4000, 7000, 3000),  -- sheet: Havana
  ('prawn yacht',              7000, 2000, 7000, 2000),  -- sheet: Prawn
  ('prestige 36',             10000, 3000, 9500, 2500),  -- sheet: Prestage 36
  ('rare- (south)',           10000, 5000, 10000, 5000), -- sheet: Rare
  ('shantham catamaran',      18000, 9000, 18000, 9000)  -- sheet: Shantam Catamaran
)
update catalog_items c
set sailing_price = r.ev_sailing,
    anchorage_price = r.ev_anchorage,
    morning_sailing_price = r.mo_sailing,
    morning_anchorage_price = r.mo_anchorage
from rates r
where c.category = 'Private Yachts'
  and lower(trim(regexp_replace(c.name, '\s+', ' ', 'g'))) = r.dash_name;
