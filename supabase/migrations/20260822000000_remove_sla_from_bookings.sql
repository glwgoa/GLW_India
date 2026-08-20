-- SLA tracking removed from bookings; sla_deadline becomes a plain booking
-- date, sla_status is dropped entirely along with the views that read it.
drop view if exists vw_vendor_response_efficiency;
drop view if exists vw_sla_compliance_by_region;

alter table bookings drop column sla_status;
alter table bookings rename column sla_deadline to booking_date;

drop type if exists sla_status;
