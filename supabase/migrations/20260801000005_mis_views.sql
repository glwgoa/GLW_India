create view vw_vendor_response_efficiency with (security_invoker = true) as
select
  v.id as vendor_id, v.name as vendor_name,
  count(b.id) filter (where b.status = 'completed') as total_completed,
  count(b.id) filter (where b.status = 'completed' and b.sla_status = 'met') as met_sla,
  round(case when count(b.id) filter (where b.status = 'completed') = 0 then 0
    else 100.0 * count(b.id) filter (where b.status = 'completed' and b.sla_status = 'met')
      / count(b.id) filter (where b.status = 'completed') end, 2) as response_efficiency_pct
from vendors v
left join bookings b on b.assigned_vendor_id = v.id
group by v.id, v.name;

create view vw_region_revenue_orders with (security_invoker = true) as
with order_counts as (
  select region_id, count(*) as total_orders from bookings group by region_id
), revenue as (
  select region_id, coalesce(sum(budget), 0) as total_revenue from projects group by region_id
)
select r.id as region_id, r.name as region_name,
  coalesce(oc.total_orders, 0) as total_orders,
  coalesce(rv.total_revenue, 0) as total_revenue
from regions r
left join order_counts oc on oc.region_id = r.id
left join revenue rv on rv.region_id = r.id;

create view vw_monthly_attendance_summary with (security_invoker = true) as
select
  p.id as user_id, p.full_name,
  date_trunc('month', a.clock_in) as month,
  count(*) as days_logged,
  count(*) filter (where a.status = 'present') as days_present,
  round(avg(extract(epoch from (a.clock_out - a.clock_in)) / 3600)::numeric, 2) as avg_hours_worked
from attendance a
join profiles p on p.id = a.user_id
group by p.id, p.full_name, date_trunc('month', a.clock_in);

create view vw_sla_compliance_by_region with (security_invoker = true) as
select
  r.id as region_id, r.name as region_name,
  count(b.id) as total_bookings,
  count(b.id) filter (where b.sla_status = 'met') as met,
  count(b.id) filter (where b.sla_status = 'breached') as breached,
  round(case when count(b.id) = 0 then 0
    else 100.0 * count(b.id) filter (where b.sla_status = 'met') / count(b.id) end, 2) as sla_compliance_pct
from regions r
left join bookings b on b.region_id = r.id
group by r.id, r.name;
