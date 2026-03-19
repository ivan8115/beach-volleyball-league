---
name: Auth Patterns
description: How auth, org context, and RBAC are implemented across all API routes
type: project
---

## Session Retrieval

- All server-side code uses `supabase.auth.getUser()` from `@supabase/ssr` — correct, not trusting client headers.
- `src/lib/supabase/server.ts` uses the **anon/publishable key** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), NOT the service role key.
- Prisma connects via `DATABASE_URL` directly (bypasses RLS — see RLS notes).
- No service role Supabase client exists anywhere in `src/` — Prisma is the only DB path.

## Primary Auth Helper

`src/lib/api/get-org-context.ts` — `getOrgContext(orgSlug, minRole)`
- Calls `supabase.auth.getUser()` (server-side, secure)
- Looks up `User` by `supabaseUserId`
- Looks up `Organization` by slug (also checks `deletedAt: null`)
- Looks up `OrganizationMember` and enforces role hierarchy: MEMBER < SCORER < ADMIN
- Returns `{ orgId, userId, role }` or `null`
- Used by the vast majority of routes

## Routes NOT Using getOrgContext

These routes implement their own inline auth check (duplicated pattern):
- `src/app/api/org/[orgSlug]/members/route.ts` — `getAdminOrScorerContext()` inline
- `src/app/api/org/[orgSlug]/members/[memberId]/route.ts` — `getAdminContext()` inline
- `src/app/api/org/[orgSlug]/settings/route.ts` — `getAdminMembership()` inline

These are functionally correct but represent code duplication. They could silently diverge from getOrgContext if getOrgContext is updated.

## Public Routes (No Auth)

- `src/app/api/org/create/route.ts` — authenticated via Supabase, no org membership check needed
- `src/app/api/org/join/route.ts` — authenticated via Supabase, join code verified against DB
- `src/app/api/user/onboard/route.ts` — authenticated via Supabase
- `src/app/api/user/profile/route.ts` — authenticated via Supabase (own profile only)
- `src/app/api/paypal/create-order/route.ts` — authenticated via Supabase
- `src/app/api/paypal/capture-order/route.ts` — authenticated via Supabase
- `src/app/api/stripe/webhook/route.ts` — no auth, webhook signature verified instead

## Role Hierarchy

MEMBER < SCORER < ADMIN (in `get-org-context.ts`)

Scorer can: enter scores (`sets/[setNumber]/route.ts`), update game status (`games/[gameId]/route.ts`), read free agents/waitlist/venues.
Captain can: manage own team roster (checked separately from `getOrgContext`, using `teamMember.role`).
