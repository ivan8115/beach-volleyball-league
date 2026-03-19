-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — Beach VB League
-- ─────────────────────────────────────────────────────────────────────────────
-- Pattern: application code calls SET LOCAL ROLE beach_app + set_config('app.org_id')
-- inside every Prisma transaction. The beach_app role has no BYPASSRLS privilege,
-- so these RESTRICTIVE policies become a hard DB-level guard against cross-org leakage.
-- Postgres superuser (used for migrations) bypasses RLS as expected.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Application role (no login, no bypass RLS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'beach_app') THEN
    CREATE ROLE beach_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT;
  END IF;
END $$;

-- 2. Privileges
GRANT USAGE ON SCHEMA public TO beach_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO beach_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO beach_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO beach_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO beach_app;

-- 3. Helper: safely parse org_id from session variable
CREATE OR REPLACE FUNCTION current_org_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '');
$$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Enable RLS on all org-scoped tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Tables with direct organizationId
ALTER TABLE "Organization"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization"       FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"       FORCE ROW LEVEL SECURITY;
ALTER TABLE "Venue"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Venue"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "Event"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "Announcement"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement"       FORCE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog"        FORCE ROW LEVEL SECURITY;

-- Tables scoped through eventId
ALTER TABLE "Division"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Division"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "TimeSlot"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeSlot"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "Team"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team"               FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"            FORCE ROW LEVEL SECURITY;
ALTER TABLE "FreeAgent"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FreeAgent"          FORCE ROW LEVEL SECURITY;
ALTER TABLE "Waitlist"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Waitlist"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "Game"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Game"               FORCE ROW LEVEL SECURITY;
ALTER TABLE "CustomField"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomField"        FORCE ROW LEVEL SECURITY;

-- Tables scoped two levels deep
ALTER TABLE "TeamMember"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "GameStat"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameStat"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "GameSet"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameSet"            FORCE ROW LEVEL SECURITY;
ALTER TABLE "CustomFieldResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomFieldResponse" FORCE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RESTRICTIVE policies (apply only to beach_app; postgres superuser bypasses)
-- ─────────────────────────────────────────────────────────────────────────────

-- Direct organizationId tables
CREATE POLICY "rls_organization" ON "Organization"
  AS RESTRICTIVE TO beach_app
  USING (id = current_org_id());

CREATE POLICY "rls_org_member" ON "OrganizationMember"
  AS RESTRICTIVE TO beach_app
  USING ("organizationId" = current_org_id());

CREATE POLICY "rls_subscription" ON "Subscription"
  AS RESTRICTIVE TO beach_app
  USING ("organizationId" = current_org_id());

CREATE POLICY "rls_venue" ON "Venue"
  AS RESTRICTIVE TO beach_app
  USING ("organizationId" = current_org_id());

CREATE POLICY "rls_event" ON "Event"
  AS RESTRICTIVE TO beach_app
  USING ("organizationId" = current_org_id());

CREATE POLICY "rls_announcement" ON "Announcement"
  AS RESTRICTIVE TO beach_app
  USING ("organizationId" = current_org_id());

CREATE POLICY "rls_activity_log" ON "ActivityLog"
  AS RESTRICTIVE TO beach_app
  USING ("organizationId" = current_org_id());

-- Indirect via eventId
CREATE POLICY "rls_division" ON "Division"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_timeslot" ON "TimeSlot"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_team" ON "Team"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_payment" ON "Payment"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_free_agent" ON "FreeAgent"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_waitlist" ON "Waitlist"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_game" ON "Game"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_custom_field" ON "CustomField"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Event" e
    WHERE e.id = "eventId" AND e."organizationId" = current_org_id()
  ));

-- Two levels deep
CREATE POLICY "rls_team_member" ON "TeamMember"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Team" t
    JOIN "Event" e ON e.id = t."eventId"
    WHERE t.id = "teamId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_game_stat" ON "GameStat"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Game" g
    JOIN "Event" e ON e.id = g."eventId"
    WHERE g.id = "gameId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_game_set" ON "GameSet"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "Game" g
    JOIN "Event" e ON e.id = g."eventId"
    WHERE g.id = "gameId" AND e."organizationId" = current_org_id()
  ));

CREATE POLICY "rls_custom_field_response" ON "CustomFieldResponse"
  AS RESTRICTIVE TO beach_app
  USING (EXISTS (
    SELECT 1 FROM "CustomField" cf
    JOIN "Event" e ON e.id = cf."eventId"
    WHERE cf.id = "customFieldId" AND e."organizationId" = current_org_id()
  ));
