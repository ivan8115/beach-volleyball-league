---
name: Testing patterns and conventions
description: Vitest mocking patterns, E2E setup, and known gotchas for this codebase
type: project
---

## Vitest: Prisma Mock Pattern

Use `vi.hoisted()` + `vi.mock()` for Prisma. The mock object must be defined before the factory runs:

```ts
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    someModel: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (fn) => fn(mockTx)),
  };
  return { mockPrisma };
});
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
```

See: `src/__tests__/plan-limits.test.ts`, `src/__tests__/waitlist.test.ts`

## Vitest: Generated Prisma Client

`bracket-advancement.ts` imports `PrismaClient` type from `@/generated/prisma/client`.
Mock it to avoid the full generated client import chain:
```ts
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: class {} }));
```

## Email Templates: playerName in HTML

`announcementEmail`, `schedulePublishedEmail`, `bracketPublishedEmail` accept `playerName`
in their data struct but do NOT render it in the HTML body (broadcast templates).
They also do NOT include it in `text`. Test org/event names and body content instead.

`registrationConfirmationEmail`, `freeAgentConfirmationEmail`, `welcomeToTeamEmail` DO
render `playerName` in both HTML and text — safe to assert on.

## ICS Export: DTEND is +1 hour (not +2)

The route at `src/app/api/org/[orgSlug]/events/[eventId]/export/route.ts` adds
`60 * 60 * 1000` ms (1 hour) to DTSTART for DTEND. The spec said 2 hours but the code says 1.
Tests are written to match the implementation.

## E2E: shadcn CardTitle Renders as <div>

`CardTitle` from shadcn/ui renders as a styled `<div>`, not `<h1>`-`<h6>`.
Use `page.getByText("Sign in").first()` not `page.getByRole("heading", ...)`.

## E2E: Login Page Link to Register is "Sign up"

The `/login` page's register link says "Sign up" (not "Create account").
The `/register` page's Google button says "Sign up with Google" (not "Continue with Google").
The `/login` page's Google button says "Continue with Google".

## E2E: Playwright Browser Setup (WSL2)

Chromium headless shell requires `libnspr4`, `libnss3`, `libasound2t64` which are not
installed in this WSL2 environment. Firefox also needs `libasound2t64`.

Workaround: download the .deb files without sudo and extract to `/tmp/playwright-libs/`,
then run with `LD_LIBRARY_PATH=/tmp/playwright-libs/usr/lib/x86_64-linux-gnu`.

The playwright.config.ts is set to use Firefox (change to chromium once deps are installed).
To install permanently: `sudo apt-get install libnspr4 libnss3 libasound2t64`.

## E2E: Feature Card Numbers (01-06) Have opacity: 0.2

The decorative ordinal spans have `opacity: 0.2` so they fail `toBeVisible()`.
Use `toBeAttached()` instead:
```ts
await expect(page.locator(`span:has-text("${n}")`).first()).toBeAttached();
```

## E2E: Auth Tests Require Local Supabase

Full registration/login flow tests are `test.skip`-ped. They need:
1. `supabase start` running
2. Email confirmation disabled in local Supabase config
3. A seeded test user for the login test

## Test File Locations

- Vitest unit tests: `src/__tests__/`
- Playwright E2E: `e2e/`
- Config: `vitest.config.ts`, `playwright.config.ts`

## Coverage Summary (as of Phase 7)

Covered: league-scheduler, bracket-generator, standings, plan-limits,
         bracket-advancement, waitlist, ics-export helpers, email-templates,
         E2E: landing page, public pages, navigation, auth forms

Not covered: API route handlers, server actions, Stripe/PayPal flows,
             notifications.ts, activity-log, custom fields, React components
