import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { LiveScheduleView } from "@/components/schedule/live-schedule-view";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export default async function PublicSchedulePage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: org.id,
      deletedAt: null,
      visibility: { in: ["PUBLIC", "UNLISTED"] },
      status: { not: "DRAFT" },
    },
    select: { id: true, name: true, type: true, status: true },
  });
  if (!event) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let myTeamId: string | null = null;

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true },
    });
    if (dbUser) {
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId: dbUser.id,
          team: { eventId, deletedAt: null },
          deletedAt: null,
        },
        select: { teamId: true },
      });
      myTeamId = teamMember?.teamId ?? null;
    }
  }

  const games = await prisma.game.findMany({
    where: {
      eventId,
      deletedAt: null,
      status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
      isBye: false,
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      court: { select: { id: true, name: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: [{ week: "asc" }, { round: "asc" }, { scheduledAt: "asc" }],
  });

  const isLeague = event.type === "LEAGUE";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        <div className="space-y-1">
          <Link
            href={`/${orgSlug}/events/${eventId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {event.name}
          </Link>
          <h1 className="text-2xl font-bold">Schedule</h1>
          {myTeamId && (
            <p className="text-sm text-primary">Your games are highlighted.</p>
          )}
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games scheduled yet.</p>
        ) : (
          <LiveScheduleView
            initialGames={games}
            myTeamId={myTeamId}
            orgSlug={orgSlug}
            eventId={eventId}
            isLeague={isLeague}
          />
        )}
      </div>
    </div>
  );
}
