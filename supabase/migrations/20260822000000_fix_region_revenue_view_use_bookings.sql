create or replace view vw_region_revenue_orders with (security_invoker = true) as
with order_counts as (
  select region_id, count(*) as total_orders from bookings group by region_id
), revenue as (
  select b.region_id,
    coalesce(sum(
      b.sale_price * case
        when c.category = 'Dinner Cruise' and b.guest_count is not null then b.guest_count
        else 1
      end
    ), 0) as total_revenue
  from bookings b
  left join catalog_items c on c.id = b.item_id
  group by b.region_id
)
select r.id as region_id, r.name as region_name,
  coalesce(oc.total_orders, 0) as total_orders,
  coalesce(rv.total_revenue, 0) as total_revenue
from regions r
left join order_counts oc on oc.region_id = r.id
left join revenue rv on rv.region_id = r.id;
