-- Reporting time for Dinner Cruise products — when guests should arrive at
-- the jetty, distinct from the actual cruise departure.
alter table catalog_items add column reporting_time text;
