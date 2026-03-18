import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; teamId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, teamId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stats = await prisma.gameStat.findMany({
    where: {
      teamId,
      game: { eventId, event: { organizationId: ctx.orgId }, deletedAt: null },
    },
    select: {
      userId: true,
      kills: true,
      aces: true,
      digs: true,
      blocks: true,
      errors: true,
      user: { select: { id: true, name: true } },
    },
  });

  // Aggregate by player
  const byPlayer: Record<string, {
    userId: string;
    name: string;
    kills: number;
    aces: number;
    digs: number;
    blocks: number;
    errors: number;
    games: number;
  }> = {};

  for (const s of stats) {
    if (!byPlayer[s.userId]) {
      byPlayer[s.userId] = {
        userId: s.userId,
        name: s.user.name,
        kills: 0, aces: 0, digs: 0, blocks: 0, errors: 0, games: 0,
      };
    }
    const p = byPlayer[s.userId];
    p.kills += s.kills;
    p.aces += s.aces;
    p.digs += s.digs;
    p.blocks += s.blocks;
    p.errors += s.errors;
    p.games += 1;
  }

  return NextResponse.json(Object.values(byPlayer).sort((a, b) => b.kills - a.kills));
}
