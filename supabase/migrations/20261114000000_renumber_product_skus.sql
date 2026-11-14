-- Renumber every product SKU by category, alphabetical by name:
-- Dinner Cruise -> DC-001.., Private Yachts -> YC-001.., Goa Trip -> WS-001.., others -> PR-001..
-- Two passes (temporary value first) so the unique constraint is never violated mid-update.
begin;

update catalog_items set sku = 'tmp-' || id::text;

with numbered as (
  select
    id,
    case category
      when 'Dinner Cruise' then 'DC'
      when 'Private Yachts' then 'YC'
      when 'Goa Trip' then 'WS'
      else 'PR'
    end as prefix,
    row_number() over (
      partition by case category
        when 'Dinner Cruise' then 'DC'
        when 'Private Yachts' then 'YC'
        when 'Goa Trip' then 'WS'
        else 'PR'
      end
      order by name, id
    ) as n
  from catalog_items
)
update catalog_items c
set sku = numbered.prefix || '-' || lpad(numbered.n::text, 3, '0')
from numbered
where c.id = numbered.id;

commit;
