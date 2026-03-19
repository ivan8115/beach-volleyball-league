---
name: Known Vulnerabilities
description: Security findings from initial audit (2026-03-19) with severity and fix status
type: project
---

## Audit Date: 2026-03-19

### CRITICAL

**C1 — PayPal amount not verified against DB on capture** (UNFIXED)
- File: `src/app/api/paypal/create-order/route.ts` line 34, `capture-order/route.ts`
- Client sends `amount` in create-order body; server trusts it and creates PayPal order for that amount.
- The capture route does NOT re-check the captured amount matches the event's `registrationFee`.
- Attack: user sends `amount: 0.01` to create-order, gets a valid PayPal orderID, captures it → payment marked COMPLETED for $0.01.

**C2 — Division IDOR in event PATCH** (UNFIXED)
- File: `src/app/api/org/[orgSlug]/events/[eventId]/route.ts` lines 131-139
- When updating divisions, `tx.division.update({ where: { id: d.id }, ... })` does NOT verify the division belongs to `eventId`.
- Attack: admin of Org A can send a `divisionId` from Org B's event and overwrite it.

**C3 — Scorer can change team registration status** (UNFIXED)
- File: `src/app/api/org/[orgSlug]/events/[eventId]/teams/[teamId]/route.ts` line 41
- `isAdmin` is `ctx.role === "ADMIN" || ctx.role === "SCORER"` — Scorer gets admin privileges here.
- Scorer can set `registrationStatus`, `divisionId`, `adminNotes` — these should be ADMIN-only.

**C4 — Scorer can remove team members** (UNFIXED)
- File: `src/app/api/org/[orgSlug]/events/[eventId]/teams/[teamId]/members/[memberId]/route.ts` lines 15, 50
- `isAdmin` check includes SCORER role for both PATCH and DELETE on team members.
- Scorer should only be able to enter scores, not modify rosters.

### MEDIUM

**M1 — No RLS policies exist** (UNFIXED)
- Prisma connects via `DATABASE_URL` directly using `PrismaPg` adapter — this bypasses Supabase RLS entirely.
- No RLS policies found in migrations or supabase/snippets directory.
- If Prisma is ever used with a compromised or misconfigured connection, no DB-level safety net exists.
- The app is correctly scoped at the application layer, but RLS is a critical defense-in-depth layer that is entirely absent.

**M2 — PayPal create-order event not verified to belong to user's org** (UNFIXED)
- File: `src/app/api/paypal/create-order/route.ts` lines 41-45
- Event is fetched without checking `organizationId`. A user can create a payment for an event in any org.
- This allows a user to register for events in orgs they haven't joined (by guessing eventIds).

**M3 — Free agent POST: body parsed before fee check** (UNFIXED)
- File: `src/app/api/org/[orgSlug]/events/[eventId]/free-agents/route.ts` lines 62-67
- When `fee > 0`, the handler returns early with `requiresPayment: true`. But the `await req.json()` call only happens AFTER that return. This is fine structurally, but if fee is 0 the body is parsed with no constraints on `notes` length.
- No length limit on `notes` field — potential for oversized input.

**M4 — Cursor-based pagination is time-based (guessable)** (LOW-MEDIUM)
- File: `src/app/api/org/[orgSlug]/activity-log/route.ts` line 37
- Cursor is `createdAt` timestamp as ISO string. Predictable; not cryptographically opaque.
- An admin could enumerate logs by guessing timestamps.

**M5 — ICS export does not verify event's org via organizationId in game query** (UNFIXED)
- File: `src/app/api/org/[orgSlug]/events/[eventId]/export/route.ts` lines 51-65
- The event IS verified to belong to org (line 44-48). But then the games query uses only `eventId` without `event.organizationId` filter (line 53). This is a secondary check only and is safe given the prior event check passes.
- LOW risk but not defense-in-depth.

**M6 — Scorer role can see free agents** (DESIGN CONCERN)
- File: `src/app/api/org/[orgSlug]/events/[eventId]/free-agents/route.ts` line 12
- Free agent GET requires SCORER. This may expose player personal data (notes field) to scorers. Depends on product intent.

**M7 — adminNotes visible to MEMBER on team GET** (UNFIXED)
- File: `src/app/api/org/[orgSlug]/events/[eventId]/teams/[teamId]/route.ts` line 15
- `prisma.team.findFirst` returns all fields including `adminNotes`. Members can read admin-only notes about their team.

### LOW / INFORMATIONAL

**L1 — Rate limiting is per-serverless-instance (in-memory)** (BY DESIGN)
- File: `src/lib/rate-limit.ts`
- Noted in the code. With multiple Vercel instances, a user can bypass the rate limit by hitting different instances.

**L2 — Inline auth helpers duplicate getOrgContext logic**
- Files: `members/route.ts`, `members/[memberId]/route.ts`, `settings/route.ts`
- Risk: if `getOrgContext` is updated (e.g., to handle suspended orgs), these won't get the fix automatically.

**L3 — Announcement targetId not validated**
- File: `src/app/api/org/[orgSlug]/announcements/route.ts` line 84
- `targetId` is stored without verifying the referenced division/team/event belongs to this org.

**L4 — Custom field response value has no length limit**
- File: `src/app/api/org/[orgSlug]/events/[eventId]/custom-fields/responses/route.ts` line 39
- `value: string` — no max length enforced before DB write.

**L5 — Org name/slug not length-limited in create**
- File: `src/app/api/org/create/route.ts` — slug is regex-validated (2-50 chars), name is not length-limited.

### PASSED / CORRECTLY IMPLEMENTED

- getOrgContext uses `supabase.auth.getUser()` — not trusting client-supplied tokens
- orgId always comes from session, not request body
- All event queries include `organizationId: ctx.orgId` in where clause
- Team queries filter via `event: { organizationId: ctx.orgId }`
- Game queries filter via `event: { organizationId: ctx.orgId }` or `eventId` after org-verified event lookup
- Stripe webhook signature verified with `webhooks.constructEvent()`
- PayPal capture verifies payment belongs to current user (`payerId: dbUser.id`) before capturing
- Division create/delete are scoped to `eventId` (which is org-verified)
- Court assignment in timeslots verified to belong to org
- Custom field validation: fieldIds verified to belong to the event
- Score validation: non-negative, max 200, no ties
- Role escalation prevented: non-admins cannot set `registrationStatus`, `divisionId`, `adminNotes` on teams
- Scorer cannot create/delete events, venues, or manage org members
- Self-join attack prevented: non-captain/non-admin checked before adding other users to team
- User profile update only touches authenticated user's own record
- Org join via code only creates MEMBER role
- PayPal order amount validated > 0 in create-order
