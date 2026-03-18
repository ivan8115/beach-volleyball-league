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
