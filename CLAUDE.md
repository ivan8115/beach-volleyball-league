# Beach Volleyball League - Claude Instructions

## Project Overview
A multi-tenant SaaS platform for managing beach volleyball leagues and tournaments.
Read `ARCHITECTURE.md` for the full schema, stack decisions, and planning context.

## Tech Stack
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma v7 (with `@prisma/adapter-pg`, generated client at `src/generated/prisma/`)
- **Auth**: Supabase Auth (Google OAuth + email/password)
- **Styling**: Tailwind CSS + shadcn/ui
- **Hosting**: Vercel (frontend) + Supabase (database)
- **Payments**: PayPal (event registration) + Stripe (org subscriptions)
- **Email**: Resend
- **Charts**: recharts

## Current Status
Phase 7 complete. App runs locally. Production DB migrated and seeded.
Next: fix Vercel deployment, then enable Supabase Realtime for live scoring.

## Dev Workflow
```bash
supabase start                          # start local Supabase (requires Docker)
./node_modules/.bin/prisma generate     # regenerate client after schema changes
./node_modules/.bin/prisma migrate dev  # create + apply new migration locally
npm run dev                             # start dev server at localhost:3000
npx vitest run                          # run unit tests
```

Use `./node_modules/.bin/prisma` instead of `npx prisma` (npx pulls wrong version).

## Key Conventions
- Use TypeScript strictly — no `any` types
- Use Prisma for all database queries
- Follow Next.js App Router conventions (server components by default)
- Use shadcn/ui components before writing custom UI
- Use context7 MCP to look up current library docs before implementing non-trivial features

## Important Notes
- Multi-tenant: every DB query must be scoped by `organizationId`
- Row Level Security (RLS) is enforced at the Supabase level
- Standings calculated dynamically from `GameSet` — never stored
- Payment flow: leagues = players pay individually, tournaments = team pays once
- `getOrgContext(orgSlug, minRole)` in `src/lib/api/get-org-context.ts` — use in all API routes
- Prisma v7 config is in `prisma.config.ts` (not schema.prisma); uses `DIRECT_URL` for migrations

## Agents Available
- `test-runner` — writes/runs/debugs tests (Vitest)
- `db-migration` — Prisma schema changes, migrations, seeding
- `security-review` — multi-tenant isolation, auth/RBAC audits, RLS gaps
