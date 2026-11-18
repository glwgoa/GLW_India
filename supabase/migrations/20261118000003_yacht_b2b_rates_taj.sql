-- Dashboard "Taj" is the sheet's "Taj exotica".
update catalog_items
set sailing_price = 15000,
    anchorage_price = 9000,
    morning_sailing_price = 12000,
    morning_anchorage_price = 6000
where category = 'Private Yachts'
  and lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) = 'taj';
