import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

type LeaderboardEntry = {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  value: number;
};

export async function GET(req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all event IDs in this org
  const events = await prisma.event.findMany({
    where: { organizationId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) {
    return NextResponse.json({
      kills: [],
      aces: [],
      digs: [],
      blocks: [],
      errors: [],
    });
  }

  // Aggregate GameStats per user for games in this org's events
  const stats = await prisma.gameStat.groupBy({
    by: ["userId"],
    where: {
      game: { eventId: { in: eventIds } },
    },
    _sum: {
      kills: true,
      aces: true,
      digs: true,
      blocks: true,
      errors: true,
    },
  });

  if (stats.length === 0) {
    return NextResponse.json({
      kills: [],
      aces: [],
      digs: [],
      blocks: [],
      errors: [],
    });
  }

  // Fetch user info for all players with stats
  const userIds = stats.map((s) => s.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  function buildLeaderboard(
    statKey: "kills" | "aces" | "digs" | "blocks" | "errors"
  ): LeaderboardEntry[] {
    return stats
      .map((s) => {
        const user = userMap.get(s.userId);
        return {
          userId: s.userId,
          userName: user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl ?? null,
          value: s._sum[statKey] ?? 0,
        };
      })
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  return NextResponse.json({
    kills: buildLeaderboard("kills"),
    aces: buildLeaderboard("aces"),
    digs: buildLeaderboard("digs"),
    blocks: buildLeaderboard("blocks"),
    errors: buildLeaderboard("errors"),
  });
}
