-- Reporting time for Dinner Cruise bookings — when the customer should
-- arrive, distinct from the cruise's own start/end time.
alter table bookings add column reporting_time text;
