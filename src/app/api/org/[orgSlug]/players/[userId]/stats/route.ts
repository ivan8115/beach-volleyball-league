import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; userId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { orgSlug, userId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatarUrl: true, skillLevel: true, gender: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get all events in this org
  const orgEvents = await prisma.event.findMany({
    where: { organizationId: ctx.orgId, deletedAt: null },
    select: { id: true, name: true },
  });
  const orgEventIds = new Set(orgEvents.map((e) => e.id));
  const orgEventMap = new Map(orgEvents.map((e) => [e.id, e.name]));

  // Find all team memberships for this user in this org's events
  const memberships = await prisma.teamMember.findMany({
    where: {
      userId,
      deletedAt: null,
      team: { event: { organizationId: ctx.orgId }, deletedAt: null },
    },
    include: {
      team: { select: { id: true, name: true, eventId: true } },
    },
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

  // Aggregate GameStats for this user in this org's events
  const statsAgg = await prisma.gameStat.aggregate({
    where: {
      userId,
      game: { eventId: { in: [...orgEventIds] } },
    },
    _sum: { kills: true, aces: true, digs: true, blocks: true, errors: true },
    _count: { id: true },
  });

  // Count wins/losses: look at completed games where this user had a stat
  const teamIds = memberships.map((m) => m.team.id);
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
  let wins = 0;
  let losses = 0;

  for (const game of completedGames) {
    const homeId = game.homeTeamId;
    const awayId = game.awayTeamId;
    if (!homeId || !awayId) continue;

    const isHome = homeId !== null && userTeamSet.has(homeId);
    const isAway = awayId !== null && userTeamSet.has(awayId);
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

  return NextResponse.json({
    user,
    stats: {
      totalGames: statsAgg._count.id,
      wins,
      losses,
      kills: statsAgg._sum.kills ?? 0,
      aces: statsAgg._sum.aces ?? 0,
      digs: statsAgg._sum.digs ?? 0,
      blocks: statsAgg._sum.blocks ?? 0,
      errors: statsAgg._sum.errors ?? 0,
    },
    events,
  });
}
