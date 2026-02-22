# Beach Volleyball League - Claude Instructions

## Project Overview
A multi-tenant SaaS platform for managing beach volleyball leagues and tournaments.
Read `ARCHITECTURE.md` for the full schema, stack decisions, and planning context.

## Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL via Supabase (free tier)
- **ORM**: Prisma
- **Auth**: Supabase Auth (Google OAuth + email/password, integrates with RLS)
- **Styling**: Tailwind CSS + shadcn/ui
- **Hosting**: Vercel (frontend) + Supabase (database)
- **Payments**: PayPal (event registration) + Stripe (org subscriptions, future)

## Current Status
Planning phase complete. Next steps:
1. Set up Windows dev environment (Node.js, Docker Desktop, Supabase CLI, gh CLI)
2. Scaffold Next.js project
3. Define Prisma schema
4. Begin build order (see ARCHITECTURE.md)

## Key Conventions (to be updated as project grows)
- Use TypeScript strictly — no `any` types
- Use Prisma for all database queries
- Follow Next.js App Router conventions (server components by default)
- Use shadcn/ui components before writing custom UI

## Important Notes
- Multi-tenant: every DB query must be scoped by `organizationId`
- Row Level Security (RLS) is enforced at the Supabase level
- Standings are calculated dynamically from `GameSet` data, never stored
- Payment flow: leagues = players pay individually, tournaments = team pays once
