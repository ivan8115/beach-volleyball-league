import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export interface StandingsEntry {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsPlayed: number;
  pointsScored: number;
  pointsAgainst: number;
  pointsPlayed: number;
  setRatio: number;
  pointRatio: number;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const divisionId = url.searchParams.get("divisionId");

  // Get all registered teams in the event/division
  const teams = await prisma.team.findMany({
    where: {
      eventId,
      event: { organizationId: ctx.orgId },
      registrationStatus: "REGISTERED",
      deletedAt: null,
      ...(divisionId ? { divisionId } : {}),
    },
    select: { id: true, name: true },
  });

  if (teams.length === 0) {
    return NextResponse.json([]);
  }

  // Get all completed non-bye games for this event/division
  const games = await prisma.game.findMany({
    where: {
      eventId,
      event: { organizationId: ctx.orgId },
      status: { in: ["COMPLETED", "FORFEITED"] },
      isBye: false,
      deletedAt: null,
      ...(divisionId ? { divisionId } : {}),
    },
    include: { sets: true },
  });

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  // Initialize standings
  const standings = new Map<string, StandingsEntry>(
    teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        teamName: t.name,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        setsPlayed: 0,
        pointsScored: 0,
        pointsAgainst: 0,
        pointsPlayed: 0,
        setRatio: 0,
        pointRatio: 0,
      },
    ]),
  );

  for (const game of games) {
    const homeId = game.homeTeamId;
    const awayId = game.awayTeamId;

    if (!homeId || !awayId) continue;
    if (!teamMap.has(homeId) && !teamMap.has(awayId)) continue;

    if (game.status === "FORFEITED") {
      // Forfeiting team gets a loss; the other team gets a win
      // Count as 1 set win for winner
      const winnerId = game.forfeitingTeamId === homeId ? awayId : homeId;
      const loserId = game.forfeitingTeamId ?? (winnerId === homeId ? awayId : homeId);

      const winner = standings.get(winnerId);
      const loser = standings.get(loserId);
      if (winner) {
        winner.wins++;
        winner.setsWon++;
        winner.setsPlayed++;
      }
      if (loser) {
        loser.losses++;
        loser.setsLost++;
        loser.setsPlayed++;
      }
      continue;
    }

    // COMPLETED game — tally sets and points
    let homeSetsWon = 0;
    let awaySetsWon = 0;
    let homePoints = 0;
    let awayPoints = 0;

    for (const set of game.sets) {
      homePoints += set.homeScore;
      awayPoints += set.awayScore;
      if (set.homeScore > set.awayScore) homeSetsWon++;
      else awaySetsWon++;
    }

    const totalSets = game.sets.length;
    const totalPoints = homePoints + awayPoints;

    const homeEntry = standings.get(homeId);
    const awayEntry = standings.get(awayId);

    if (homeEntry) {
      homeEntry.setsWon += homeSetsWon;
      homeEntry.setsLost += awaySetsWon;
      homeEntry.setsPlayed += totalSets;
      homeEntry.pointsScored += homePoints;
      homeEntry.pointsAgainst += awayPoints;
      homeEntry.pointsPlayed += totalPoints;
      if (homeSetsWon > awaySetsWon) homeEntry.wins++;
      else homeEntry.losses++;
    }

    if (awayEntry) {
      awayEntry.setsWon += awaySetsWon;
      awayEntry.setsLost += homeSetsWon;
      awayEntry.setsPlayed += totalSets;
      awayEntry.pointsScored += awayPoints;
      awayEntry.pointsAgainst += homePoints;
      awayEntry.pointsPlayed += totalPoints;
      if (awaySetsWon > homeSetsWon) awayEntry.wins++;
      else awayEntry.losses++;
    }
  }

  // Calculate ratios and sort
  const result = Array.from(standings.values()).map((entry) => ({
    ...entry,
    setRatio: entry.setsPlayed > 0 ? entry.setsWon / entry.setsPlayed : 0,
    pointRatio: entry.pointsPlayed > 0 ? entry.pointsScored / entry.pointsPlayed : 0,
  }));

  result.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setRatio !== a.setRatio) return b.setRatio - a.setRatio;
    return b.pointRatio - a.pointRatio;
  });

  return NextResponse.json(result);
}
