-- Broadcast new Kommo leads to the dashboard (RLS still applies to subscribers).
alter publication supabase_realtime add table public.kommo_leads;
