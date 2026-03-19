---
name: RLS Status
description: Supabase Row Level Security policy coverage per table (as of 2026-03-19 audit)
type: project
---

## Status: NO RLS POLICIES EXIST

As of audit date 2026-03-19:
- No SQL RLS policies found in `prisma/migrations/` or `supabase/snippets/`
- Prisma connects via `DATABASE_URL` using `PrismaPg` adapter — this uses a direct PostgreSQL connection that bypasses RLS
- The app is correctly scoped at the application layer via `getOrgContext` and org-scoped WHERE clauses
- RLS is entirely a defense-in-depth layer that is missing

## Tables That Should Have RLS (all org-scoped)

- Organization
- OrganizationMember
- Event
- Division
- Team
- TeamMember
- FreeAgent
- Waitlist
- Game, GameSet, GameScoreHistory, GameStat
- Venue, Court
- TimeSlot
- Payment
- Announcement
- ActivityLog
- CustomField, CustomFieldResponse
- PlayerAvailability, AvailabilityConstraint
- Subscription

## Tables That Can Be Public Read

- Plan (global, no org scoping needed)
- Pool, PoolTeam, TeamSeed (org-scoped via event)

## Note on Prisma + RLS

If RLS is added, the Prisma client (`PrismaPg` with `DATABASE_URL`) will bypass it unless:
1. Prisma is configured to `SET LOCAL role = authenticated; SET LOCAL request.jwt.claims = ...` before each query, OR
2. A separate Supabase client with the anon key is used for data access (not feasible with Prisma), OR
3. RLS uses the `USING (true)` pattern with application-level trust (no real protection), OR
4. A connection pool like pgBouncer with role switching is used

The most pragmatic approach for this codebase: keep application-layer checks as primary defense, add RLS as backup using a server-side Supabase client for sensitive reads, or use `set_config('app.org_id', ...)` session variables with RLS policies.
