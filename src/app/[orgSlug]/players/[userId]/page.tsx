import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ orgSlug: string; userId: string }>;
}

const SKILL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  OPEN: "Open",
};

const ROLE_LABEL: Record<string, string> = {
  CAPTAIN: "Captain",
  PLAYER: "Player",
};

export default async function PlayerProfilePage({ params }: PageProps) {
  const { orgSlug, userId } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatarUrl: true, skillLevel: true, gender: true },
  });
  if (!user) notFound();

  // Check this user is actually a member of the org
  const isMember = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: org.id },
    select: { id: true },
  });
  if (!isMember) notFound();

  // Get all events in org
  const orgEvents = await prisma.event.findMany({
    where: { organizationId: org.id, deletedAt: null },
    select: { id: true, name: true },
  });
  const orgEventIds = new Set(orgEvents.map((e) => e.id));
  const orgEventMap = new Map(orgEvents.map((e) => [e.id, e.name]));

  // Memberships
  const memberships = await prisma.teamMember.findMany({
    where: {
      userId,
      deletedAt: null,
      team: { event: { organizationId: org.id }, deletedAt: null },
    },
    include: { team: { select: { id: true, name: true, eventId: true } } },
  });

  const events = memberships
    .filter((m) => orgEventIds.has(m.team.eventId))
    .map((m) => ({
      eventId: m.team.eventId,
      eventName: orgEventMap.get(m.team.eventId) ?? "",
      teamId: m.team.id,
      teamName: m.team.name,
      role: m.role,
    }));

  // Stats aggregate
  const statsAgg = await prisma.gameStat.aggregate({
    where: { userId, game: { eventId: { in: [...orgEventIds] } } },
    _sum: { kills: true, aces: true, digs: true, blocks: true, errors: true },
    _count: { id: true },
  });

  // Wins/losses
  const teamIds = memberships.map((m) => m.team.id);
  let wins = 0, losses = 0;

  if (teamIds.length > 0) {
    const completedGames = await prisma.game.findMany({
      where: {
        eventId: { in: [...orgEventIds] },
        status: "COMPLETED",
        isBye: false,
        deletedAt: null,
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
      },
      include: { sets: true },
    });

    const userTeamSet = new Set(teamIds);
    for (const game of completedGames) {
      const homeId = game.homeTeamId;
      const awayId = game.awayTeamId;
      if (!homeId || !awayId) continue;
      const isHome = userTeamSet.has(homeId);
      const isAway = userTeamSet.has(awayId);
      if (!isHome && !isAway) continue;
      let homeSets = 0, awaySets = 0;
      for (const set of game.sets) {
        if (set.homeScore > set.awayScore) homeSets++;
        else awaySets++;
      }
      const userWon = isHome ? homeSets > awaySets : awaySets > homeSets;
      if (userWon) wins++;
      else losses++;
    }
  }

  const totalGames = wins + losses;
  const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        {/* Back link */}
        <Link
          href={`/${orgSlug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {org.name}
        </Link>

        {/* Player header */}
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {user.skillLevel && (
                <Badge variant="secondary">{SKILL_LABEL[user.skillLevel] ?? user.skillLevel}</Badge>
              )}
              {user.gender && (
                <Badge variant="outline">{user.gender}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Career Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: "Games", value: totalGames },
                { label: "Wins", value: wins },
                { label: "Losses", value: losses },
                { label: "Win %", value: `${winPct}%` },
                { label: "Kills", value: statsAgg._sum.kills ?? 0 },
                { label: "Aces", value: statsAgg._sum.aces ?? 0 },
                { label: "Digs", value: statsAgg._sum.digs ?? 0 },
                { label: "Blocks", value: statsAgg._sum.blocks ?? 0 },
                { label: "Errors", value: statsAgg._sum.errors ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.map((e) => (
                <div
                  key={`${e.eventId}-${e.teamId}`}
                  className="flex items-center justify-between py-1"
                >
                  <div>
                    <p className="text-sm font-medium">{e.eventName}</p>
                    <p className="text-xs text-muted-foreground">{e.teamName}</p>
                  </div>
                  <Badge variant="outline">{ROLE_LABEL[e.role] ?? e.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
