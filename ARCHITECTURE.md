# Beach Volleyball League - Architecture Document

## Project Overview
A multi-tenant SaaS platform for managing beach volleyball leagues and tournaments.
Organizations can create and manage leagues (multi-week seasons) and tournaments
(1-2 day events), handle team/player registration, schedule games, track scores,
and generate brackets.

Initially built for one org, designed to scale to many.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Frontend + API routes, TypeScript |
| Database | PostgreSQL via Supabase | Free tier to start |
| ORM | Prisma | Type-safe queries, migrations |
| Auth | NextAuth.js | Sessions, JWT, OAuth |
| Styling | Tailwind CSS + shadcn/ui | Pre-built components |
| Hosting (FE) | Vercel | Free tier, auto-deploys on git push |
| Hosting (DB) | Supabase | Free tier (500MB, 50k MAU) |
| Local Dev | Supabase CLI + Docker | Mirrors production locally |
| Payments (events) | PayPal | Player/team event registration fees |
| Payments (subscriptions) | Stripe | Org monthly subscriptions (future) |

### Local Dev Setup
```
Terminal 1: supabase start   → local Postgres + Auth + Storage via Docker
Terminal 2: npm run dev      → Next.js dev server
Browser:    localhost:3000   → App
Browser:    localhost:54323  → Supabase Studio (visual DB editor)
```

### Hosting Notes
- Start on free tiers ($0/month)
- Supabase free tier pauses inactive projects after 7 days (set a cron ping to prevent)
- Upgrade to paid tiers only when scale demands it
- Vercel supports wildcard subdomains for org slugs (org.yourapp.com) when ready

---

## Payment Strategy

- **Event registration (players/teams)** → PayPal
  - Personal PayPal account works (no EIN required)
  - League: individual players pay
  - Tournament: team pays once (captain pays on behalf of team)
- **Org platform subscriptions** → Stripe (future)
  - Stripe works with personal SSN for sole proprietors (no EIN required)
  - Schema is ready, implementation deferred until monetization begins

---

## User Roles

| Role | Scope | Permissions |
|---|---|---|
| Site Admin | Global | Manage everything, all orgs |
| Org Admin | Organization | Create/manage events, teams, announcements |
| Team Captain | Team | Manage roster, enter scores, manage team |
| Player | Team | View schedule, standings, game results |

---

## Event Types

### League
- Runs for X weeks with weekly scheduled games
- Round-robin scheduling within divisions
- After final week, standings determine playoff seeding
- Ends with a playoff bracket (single or double elimination)
- Individual players pay registration fee
- Tiebreaker order: wins → set ratio (sets won/played) → point ratio (points scored/played)

### Tournament
- 1-2 day event
- Option A: Straight to bracket (single or double elimination)
- Option B: Pool play (round-robin groups) → elimination bracket
- Teams pay registration fee (one payment per team)
- Seeding: Manual (admin sets seeds), Random (system randomizes), Custom (admin controls full placement)

---

## Full Database Schema

### User
```
User
├── id
├── email (unique)
├── name
├── avatarUrl?
├── skillLevel: BEGINNER | INTERMEDIATE | ADVANCED | OPEN
└── (NextAuth) accounts[], sessions[]
```

### Organization
```
Organization
├── id
├── name
├── slug (unique → org.yourapp.com)
├── logoUrl?
└── paypalEmail?

OrganizationMember          ← junction: User ↔ Organization
├── id
├── userId
├── organizationId
└── role: ADMIN | MEMBER
```

### Subscription & Plans
```
Plan
├── id
├── name (Free, Starter, Pro, etc.)
├── monthlyPrice
├── maxEvents
├── maxTeams
├── maxAdmins
└── features: JSON

Subscription
├── id
├── organizationId
├── planId
├── status: ACTIVE | PAST_DUE | CANCELLED | TRIALING
├── currentPeriodStart
├── currentPeriodEnd
├── stripeSubscriptionId?   ← nullable until Stripe is wired up
├── stripeCustomerId?
└── cancelledAt?
```

### Venues & Courts
```
Venue                       ← org's regular playing locations
├── id
├── organizationId
├── name
├── address
└── googleMapsUrl?

Court                       ← named courts within a venue
├── id
├── venueId                 ← belongs to Venue, not directly to Event
└── name                    ← Court 1, Main Court, etc.
```

### Events
```
Event
├── id
├── name
├── type: LEAGUE | TOURNAMENT
├── status: DRAFT | REGISTRATION | ACTIVE | PLAYOFF | COMPLETED
├── visibility: PUBLIC | PRIVATE
├── organizationId
├── registrationDeadline?
├── rosterLockDate?
├── maxTeams?
├── minRosterSize
├── maxRosterSize
├── registrationFee?
├── refundPolicy: NONE | FULL | PARTIAL
├── refundDeadline?
├── seedingType: MANUAL | RANDOM | CUSTOM
│
├── (League only)
│   ├── startDate
│   ├── weeks
│   ├── currentWeek
│   └── playoffTeams        ← how many teams advance to playoffs
│
└── (Tournament only)
    ├── startDate
    ├── endDate
    ├── bracketType: SINGLE_ELIM | DOUBLE_ELIM
    └── hasPoolPlay: Boolean

Division                    ← groups within an event (Men's A, Women's, Coed, etc.)
├── id
├── name
└── eventId

Pool                        ← tournament pool play groups (Pool A, Pool B, etc.)
├── id
├── name
└── eventId

PoolTeam                    ← junction: Pool ↔ Team
├── poolId
├── teamId
└── seed?                   ← seed within the pool

TeamSeed                    ← stores seed numbers per team per event
├── id
├── eventId
├── teamId
└── seed: Int

TimeSlot                    ← defines when games can be scheduled for a league
├── id
├── eventId
├── dayOfWeek: MON | TUE | WED | THU | FRI | SAT | SUN
├── startTime
└── courtId?
```

### Teams & Players
```
Team
├── id
├── name
├── logoUrl?
├── primaryColor?
├── eventId
├── divisionId?
└── registrationStatus: PENDING_PAYMENT | REGISTERED | WAITLISTED | WITHDRAWN

TeamMember                  ← junction: User ↔ Team
├── id
├── userId
├── teamId
└── role: CAPTAIN | PLAYER
   @@unique([userId, teamId])  ← player can be on multiple teams across different events

FreeAgent                   ← players without a team looking to play
├── id
├── userId
├── eventId
├── notes                   ← position, skill level, availability
└── status: AVAILABLE | PLACED

Waitlist                    ← teams waiting for a spot when event is full
├── id
├── eventId
├── teamId
├── position
└── joinedAt
```

### Custom Registration Fields
```
CustomField                 ← org-defined fields collected at registration
├── id
├── eventId
├── label
├── type: TEXT | NUMBER | SELECT | BOOLEAN
├── options: JSON?          ← for SELECT type
└── required: Boolean

CustomFieldResponse         ← player responses to custom fields
├── id
├── customFieldId
├── userId
├── value
└── submittedAt
```

### Games
```
Game
├── id
├── eventId
├── divisionId?
├── status: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED | FORFEITED
├── forfeitingTeamId?
├── homeTeamId?
├── awayTeamId?
├── refereeTeamId?          ← optional, teams can ref each other
├── courtId?                ← optional court assignment
├── isBye: Boolean          ← handles odd number of teams
├── scheduledAt             ← date + time
├── location?               ← address or venue description
├── originalScheduledAt?    ← set if game was rescheduled
├── rescheduleReason?
├── notes?                  ← admin/captain notes (incidents, conditions, etc.)
│
├── (League only)
│   └── week
│
└── (Bracket only)
    ├── round
    ├── position
    ├── bracketSide: WINNERS | LOSERS | GRAND_FINAL
    ├── nextGameId?          ← where winner advances
    └── loserNextGameId?     ← where loser goes (double elim only)

GameSet                     ← individual set scores within a game
├── id
├── gameId
├── setNumber (1, 2, or 3)
├── homeScore
├── awayScore
└── completedAt?
```

### Standings Logic (Leagues)
Calculated dynamically from GameSet data — not stored to avoid stale data.
Tiebreaker order:
1. Wins
2. Set ratio (sets won / sets played)
3. Point ratio (points scored / points played)

### Payments
```
Payment
├── id
├── payerId                 ← user who made the payment
├── eventId
├── type: PLAYER_REGISTRATION | TEAM_REGISTRATION
├── teamId?                 ← set for tournament team payments
├── amount
├── status: PENDING | COMPLETED | REFUNDED | FAILED
├── paypalTransactionId
└── paidAt?
```

### Announcements
```
Announcement
├── id
├── eventId
├── organizationId
├── title
├── body
├── postedById
└── postedAt
```

### Activity Log
```
ActivityLog                 ← audit trail for accountability
├── id
├── organizationId
├── userId                  ← who performed the action
├── action                  ← SCORE_ENTERED | ROSTER_CHANGED | GAME_RESCHEDULED | etc.
├── entityType              ← GAME | TEAM | EVENT | etc.
├── entityId
├── metadata: JSON          ← before/after values
└── createdAt
```

---

## Features Explicitly Deferred (Phase 2)
- Player stats (kills, aces, digs, blocks)
- Email / push notifications
- In-app messaging
- Waivers / liability forms
- Stripe org subscription implementation (schema ready, not wired up)
- Waitlist auto-promotion logic (schema ready)
- Org subdomains (architecture supports it, not built yet)

## Features Explicitly Dropped
- Score confirmation workflow (any captain/admin can enter scores directly)
- Player invitation system (admins/captains assign players directly)
- Player check-in for tournaments

---

## What's Left to Plan (Next Session)
1. **Pages & Routes** — full sitemap, what each role can see and do
2. **Bracket Logic** — single vs double elimination flow, bye handling, advancement
3. **Project Scaffolding** — initialize Next.js project, Prisma schema, folder structure
4. **Build Order** — recommended sequence for implementation

---

## Build Order (Tentative)
1. Auth + Org setup (users, orgs, roles, subscriptions)
2. Event creation (league and tournament configuration)
3. Team + player registration + payments (PayPal)
4. League scheduling (weekly games, time slots, bye handling)
5. Tournament brackets (pool play + elimination)
6. Score entry + standings calculation
7. Playoff bracket generation from league standings
8. Announcements + venue/court management
9. Activity log + custom registration fields
10. Multi-tenant polish (subdomains, plan limits)
11. Stripe integration (org subscriptions)
