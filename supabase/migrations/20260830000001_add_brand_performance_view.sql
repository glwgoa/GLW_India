create view vw_brand_performance with (security_invoker = true) as
with priced as (
  select
    b.id,
    b.brand,
    case
      when c.category = 'Dinner Cruise' and b.guest_count is not null then b.guest_count
      else 1
    end as multiplier,
    coalesce(b.sale_price, 0) as sale_price,
    coalesce(c.b2b_price, 0) as b2b_price,
    b.transport_type,
    coalesce(b.pickup_drop_price, 0) as pickup_drop_price
  from bookings b
  left join catalog_items c on c.id = b.item_id
  where b.brand is not null
)
select
  brand,
  count(*) as total_bookings,
  sum(sale_price * multiplier) as total_revenue,
  sum(
    (sale_price * multiplier)
    - (
        b2b_price * multiplier
        + case when transport_type = 'pickup_drop' then pickup_drop_price * multiplier else 0 end
      )
  ) as total_profit
from priced
group by brand
order by total_profit desc;
