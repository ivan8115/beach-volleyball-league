import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; gameId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, gameId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stats = await prisma.gameStat.findMany({
    where: {
      gameId,
      game: { eventId, event: { organizationId: ctx.orgId } },
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: [{ teamId: "asc" }, { user: { name: "asc" } }],
  });

  return NextResponse.json(stats);
}

export async function PUT(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, gameId } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify game belongs to this event + org
  const game = await prisma.game.findFirst({
    where: { id: gameId, eventId, event: { organizationId: ctx.orgId }, deletedAt: null },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const body = (await req.json()) as Array<{
    userId: string;
    teamId: string;
    kills?: number;
    aces?: number;
    digs?: number;
    blocks?: number;
    errors?: number;
  }>;

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array of stat entries" }, { status: 400 });
  }

  if (body.length === 0) {
    return NextResponse.json([]);
  }

  // Validate each entry: required fields + non-negative integer stats
  for (const entry of body) {
    if (!entry.userId || !entry.teamId) {
      return NextResponse.json({ error: "Each entry must have userId and teamId" }, { status: 400 });
    }
    for (const field of ["kills", "aces", "digs", "blocks", "errors"] as const) {
      const val = entry[field];
      if (val !== undefined && (typeof val !== "number" || val < 0 || !Number.isInteger(val))) {
        return NextResponse.json({ error: `${field} must be a non-negative integer` }, { status: 400 });
      }
    }
  }

  // Verify every (userId, teamId) pair is a real member of that team in this event
  const uniqueTeamIds = [...new Set(body.map((e) => e.teamId))];
  const validMembers = await prisma.teamMember.findMany({
    where: {
      teamId: { in: uniqueTeamIds },
      team: { eventId, event: { organizationId: ctx.orgId } },
      deletedAt: null,
    },
    select: { userId: true, teamId: true },
  });

  const validSet = new Set(validMembers.map((m) => `${m.userId}:${m.teamId}`));
  const invalid = body.find((e) => !validSet.has(`${e.userId}:${e.teamId}`));
  if (invalid) {
    return NextResponse.json(
      { error: `User ${invalid.userId} is not a member of team ${invalid.teamId}` },
      { status: 400 }
    );
  }

  // Upsert each stat entry
  const results = await prisma.$transaction(
    body.map((entry) =>
      prisma.gameStat.upsert({
        where: { gameId_userId: { gameId, userId: entry.userId } },
        create: {
          gameId,
          userId: entry.userId,
          teamId: entry.teamId,
          kills: entry.kills ?? 0,
          aces: entry.aces ?? 0,
          digs: entry.digs ?? 0,
          blocks: entry.blocks ?? 0,
          errors: entry.errors ?? 0,
        },
        update: {
          kills: entry.kills ?? 0,
          aces: entry.aces ?? 0,
          digs: entry.digs ?? 0,
          blocks: entry.blocks ?? 0,
          errors: entry.errors ?? 0,
        },
      })
    )
  );

  return NextResponse.json(results);
}
