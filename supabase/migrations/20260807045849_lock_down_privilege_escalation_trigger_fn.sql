-- Trigger functions should never be directly RPC-callable via PostgREST.
revoke all on function public.prevent_self_privilege_escalation() from public, anon, authenticated;
