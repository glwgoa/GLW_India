# GLW India Ops Dashboard

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui dashboard for bookings/vendor SLA
tracking, regional inventory, projects, attendance, and MIS reporting, backed by Supabase
(Postgres, Auth, Realtime, RLS). See `implementation_plan.txt` for the full build plan and
phase-by-phase status.

## Development

```bash
npm install
npm run dev
```

Environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Database schema and RLS policies live under `supabase/migrations/`, applied directly to the
connected Supabase project via the Supabase MCP.

## Branching convention

- `main` — stable, deployable.
- `development` — staging / integration branch.
- `feature/*` — one branch per feature (e.g. `feature/vendor-sla`, `feature/inventory-regional`).

No CI workflows or branch protection rules are configured yet — this is a convention only.
