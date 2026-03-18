import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { generateLeagueSchedule } from "@/lib/league-scheduler";
import {
  generateSingleElim,
  generateDoubleElim,
  generatePoolAssignments,
  generatePoolGames,
  type BracketGame,
} from "@/lib/bracket-generator";
import { advanceBracketTeams } from "@/lib/bracket-advancement";
import { notifySchedulePublished, notifyBracketPublished } from "@/lib/notifications";
import type { BracketSide } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const week = url.searchParams.get("week");
  const round = url.searchParams.get("round");
  const divisionId = url.searchParams.get("divisionId");
  const bracketSide = url.searchParams.get("bracketSide");

  const games = await prisma.game.findMany({
    where: {
      eventId,
      event: { organizationId: ctx.orgId },
      deletedAt: null,
      ...(week ? { week: parseInt(week) } : {}),
      ...(round ? { round: parseInt(round) } : {}),
      ...(divisionId ? { divisionId } : {}),
      ...(bracketSide ? { bracketSide: bracketSide as BracketSide } : {}),
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      court: { select: { id: true, name: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: [{ week: "asc" }, { round: "asc" }, { position: "asc" }, { scheduledAt: "asc" }],
  });

  return NextResponse.json(games);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = (await req.json()) as {
    action: "GENERATE_LEAGUE" | "GENERATE_BRACKET" | "GENERATE_POOL_PLAY";
    divisionId?: string;
    force?: boolean;
  };

  if (body.action === "GENERATE_LEAGUE") {
    return handleGenerateLeague(event, body.divisionId, body.force ?? false, ctx.orgId, orgSlug);
  }
  if (body.action === "GENERATE_BRACKET") {
    return handleGenerateBracket(event, body.divisionId, body.force ?? false, ctx.orgId, orgSlug);
  }
  if (body.action === "GENERATE_POOL_PLAY") {
    return handleGeneratePoolPlay(event, body.force ?? false, ctx.orgId, orgSlug);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ─── League schedule generation ───────────────────────────────────────────────

async function handleGenerateLeague(
  event: { id: string; type: string; startDate: Date | null; weeks: number | null },
  divisionId: string | undefined,
  force: boolean,
  orgId: string,
  orgSlug: string,
) {
  if (event.type !== "LEAGUE") {
    return NextResponse.json({ error: "Event is not a league" }, { status: 400 });
  }
  if (!event.startDate || !event.weeks) {
    return NextResponse.json(
      { error: "Event must have a startDate and weeks configured" },
      { status: 400 },
    );
  }

  // Check for existing games
  const existing = await prisma.game.count({
    where: {
      eventId: event.id,
      deletedAt: null,
      ...(divisionId ? { divisionId } : {}),
    },
  });

  if (existing > 0 && !force) {
    return NextResponse.json(
      { error: "Games already exist. Pass force: true to regenerate." },
      { status: 400 },
    );
  }

  // Fetch registered teams
  const teams = await prisma.team.findMany({
    where: {
      eventId: event.id,
      registrationStatus: "REGISTERED",
      deletedAt: null,
      ...(divisionId ? { divisionId } : {}),
    },
    select: { id: true },
  });

  if (teams.length < 2) {
    return NextResponse.json(
      { error: "At least 2 registered teams are required" },
      { status: 400 },
    );
  }

  // Fetch timeslots
  const timeslots = await prisma.timeSlot.findMany({
    where: { eventId: event.id },
    select: { id: true, dayOfWeek: true, startTime: true, courtId: true },
  });

  if (timeslots.length === 0) {
    return NextResponse.json(
      { error: "At least one timeslot is required before generating the schedule" },
      { status: 400 },
    );
  }

  const { games } = generateLeagueSchedule({
    teams,
    timeslots,
    startDate: event.startDate,
    weeks: event.weeks,
  });

  await prisma.$transaction(async (tx) => {
    // Delete existing if force
    if (force && existing > 0) {
      await tx.gameSet.deleteMany({
        where: {
          game: {
            eventId: event.id,
            deletedAt: null,
            ...(divisionId ? { divisionId } : {}),
          },
        },
      });
      await tx.game.deleteMany({
        where: {
          eventId: event.id,
          deletedAt: null,
          ...(divisionId ? { divisionId } : {}),
        },
      });
    }

    // Create games
    await tx.game.createMany({
      data: games.map((g) => ({
        eventId: event.id,
        divisionId: divisionId ?? null,
        status: "SCHEDULED",
        week: g.week,
        isBye: g.isBye,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        courtId: g.courtId,
        scheduledAt: g.scheduledAt,
      })),
    });

    // Set event status to ACTIVE
    await tx.event.update({
      where: { id: event.id },
      data: { status: "ACTIVE" },
    });
  });

  void notifySchedulePublished({ orgId, orgSlug, eventId: event.id, gameCount: games.length });

  return NextResponse.json({ created: games.length }, { status: 201 });
}

// ─── Bracket generation ────────────────────────────────────────────────────────

async function handleGenerateBracket(
  event: {
    id: string;
    type: string;
    bracketType: string | null;
    tournamentStartDate: Date | null;
    hasPoolPlay: boolean | null;
  },
  divisionId: string | undefined,
  force: boolean,
  orgId: string,
  orgSlug: string,
) {
  if (event.type !== "TOURNAMENT") {
    return NextResponse.json({ error: "Event is not a tournament" }, { status: 400 });
  }

  const scheduledAt = event.tournamentStartDate ?? new Date();

  // Check for existing bracket games
  const existing = await prisma.game.count({
    where: {
      eventId: event.id,
      deletedAt: null,
      bracketSide: { not: null },
      ...(divisionId ? { divisionId } : {}),
    },
  });

  if (existing > 0 && !force) {
    return NextResponse.json(
      { error: "Bracket already exists. Pass force: true to regenerate." },
      { status: 400 },
    );
  }

  // Get seeded teams (use TeamSeed if exists, else registration order)
  const teamSeeds = await prisma.teamSeed.findMany({
    where: { eventId: event.id },
    orderBy: { seed: "asc" },
  });

  let seededTeams: Array<{ id: string; seed: number }>;

  if (teamSeeds.length > 0) {
    seededTeams = teamSeeds.map((ts) => ({ id: ts.teamId, seed: ts.seed }));
  } else {
    // Use standings if this is league->playoff, else use registration order
    const teams = await prisma.team.findMany({
      where: {
        eventId: event.id,
        registrationStatus: "REGISTERED",
        deletedAt: null,
        ...(divisionId ? { divisionId } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    seededTeams = teams.map((t, i) => ({ id: t.id, seed: i + 1 }));
  }

  if (seededTeams.length < 2) {
    return NextResponse.json(
      { error: "At least 2 teams are required to generate a bracket" },
      { status: 400 },
    );
  }

  // Determine bracket type
  const bracketType =
    event.bracketType ??
    (await prisma.division
      .findFirst({ where: { id: divisionId }, select: { bracketType: true } })
      .then((d) => d?.bracketType ?? "SINGLE_ELIM"));

  const bracketGames =
    bracketType === "DOUBLE_ELIM"
      ? generateDoubleElim(seededTeams, scheduledAt)
      : generateSingleElim(seededTeams, scheduledAt);

  await prisma.$transaction(async (tx) => {
    if (force && existing > 0) {
      await tx.gameSet.deleteMany({
        where: {
          game: {
            eventId: event.id,
            bracketSide: { not: null },
            ...(divisionId ? { divisionId } : {}),
          },
        },
      });
      await tx.game.deleteMany({
        where: {
          eventId: event.id,
          bracketSide: { not: null },
          ...(divisionId ? { divisionId } : {}),
        },
      });
    }

    // Insert games in order (final first) so nextGameId can be set
    const tempIdToDbId = new Map<string, string>();

    for (const bracketGame of bracketGames) {
      const created = await tx.game.create({
        data: {
          eventId: event.id,
          divisionId: divisionId ?? null,
          status: "SCHEDULED",
          round: bracketGame.round,
          position: bracketGame.position,
          bracketSide: bracketGame.bracketSide,
          homeTeamId: bracketGame.homeTeamId,
          awayTeamId: bracketGame.awayTeamId,
          isBracketBye: bracketGame.isBracketBye,
          isBracketReset: bracketGame.isBracketReset,
          nextGameId: bracketGame.nextTempId
            ? (tempIdToDbId.get(bracketGame.nextTempId) ?? null)
            : null,
          loserNextGameId: bracketGame.loserNextTempId
            ? (tempIdToDbId.get(bracketGame.loserNextTempId) ?? null)
            : null,
          scheduledAt,
        },
      });
      tempIdToDbId.set(bracketGame.tempId, created.id);
    }

    // Auto-complete bracket bye games and advance the bye-receiving team
    const byeGames = await tx.game.findMany({
      where: {
        eventId: event.id,
        divisionId: divisionId ?? null,
        isBracketBye: true,
        deletedAt: null,
      },
      select: {
        id: true,
        eventId: true,
        divisionId: true,
        homeTeamId: true,
        awayTeamId: true,
        nextGameId: true,
        loserNextGameId: true,
        bracketSide: true,
        isBracketReset: true,
      },
    });

    for (const bye of byeGames) {
      await tx.game.update({ where: { id: bye.id }, data: { status: "COMPLETED" } });
      const winnerTeamId = bye.homeTeamId!; // bye games always have home team, null away
      await advanceBracketTeams(tx, bye, winnerTeamId, null);
    }

    await tx.event.update({
      where: { id: event.id },
      data: { status: "ACTIVE" },
    });
  });

  void notifyBracketPublished({ orgId, orgSlug, eventId: event.id });

  return NextResponse.json({ created: bracketGames.length }, { status: 201 });
}

// ─── Pool play generation ──────────────────────────────────────────────────────

async function handleGeneratePoolPlay(
  event: {
    id: string;
    type: string;
    teamsPerPool: number | null;
    tournamentStartDate: Date | null;
  },
  force: boolean,
  orgId: string,
  orgSlug: string,
) {
  if (event.type !== "TOURNAMENT") {
    return NextResponse.json({ error: "Event is not a tournament" }, { status: 400 });
  }
  if (!event.teamsPerPool) {
    return NextResponse.json({ error: "teamsPerPool not configured" }, { status: 400 });
  }

  const scheduledAt = event.tournamentStartDate ?? new Date();

  // Check for existing pool games (non-bracket)
  const existing = await prisma.game.count({
    where: { eventId: event.id, deletedAt: null, bracketSide: null, isBye: false },
  });

  if (existing > 0 && !force) {
    return NextResponse.json(
      { error: "Pool games already exist. Pass force: true to regenerate." },
      { status: 400 },
    );
  }

  // Get teams
  const teamSeeds = await prisma.teamSeed.findMany({
    where: { eventId: event.id },
    orderBy: { seed: "asc" },
  });

  let seededTeams: Array<{ id: string; seed: number }>;
  if (teamSeeds.length > 0) {
    seededTeams = teamSeeds.map((ts) => ({ id: ts.teamId, seed: ts.seed }));
  } else {
    const teams = await prisma.team.findMany({
      where: { eventId: event.id, registrationStatus: "REGISTERED", deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    seededTeams = teams.map((t, i) => ({ id: t.id, seed: i + 1 }));
  }

  const poolAssignments = generatePoolAssignments(seededTeams, event.teamsPerPool);
  const poolGames = generatePoolGames(poolAssignments, scheduledAt);

  await prisma.$transaction(async (tx) => {
    if (force && existing > 0) {
      await tx.gameSet.deleteMany({
        where: { game: { eventId: event.id, bracketSide: null } },
      });
      await tx.game.deleteMany({
        where: { eventId: event.id, bracketSide: null },
      });
      // Also remove existing pools
      await tx.poolTeam.deleteMany({
        where: { pool: { eventId: event.id } },
      });
      await tx.pool.deleteMany({ where: { eventId: event.id } });
    }

    // Create pools
    const numPools = Math.max(...poolAssignments.map((p) => p.poolIndex)) + 1;
    const poolLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const poolDbIds: string[] = [];

    for (let i = 0; i < numPools; i++) {
      const pool = await tx.pool.create({
        data: { eventId: event.id, name: `Pool ${poolLetters[i] ?? i + 1}` },
      });
      poolDbIds.push(pool.id);
    }

    // Assign teams to pools
    for (const assignment of poolAssignments) {
      await tx.poolTeam.create({
        data: { poolId: poolDbIds[assignment.poolIndex], teamId: assignment.teamId },
      });
    }

    // Create pool games
    await tx.game.createMany({
      data: poolGames.map((g) => ({
        eventId: event.id,
        status: "SCHEDULED",
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        scheduledAt: g.scheduledAt,
        courtId: g.courtId,
      })),
    });

    await tx.event.update({
      where: { id: event.id },
      data: { status: "ACTIVE" },
    });
  });

  void notifySchedulePublished({ orgId, orgSlug, eventId: event.id, gameCount: poolGames.length });

  return NextResponse.json({ created: poolGames.length }, { status: 201 });
}
