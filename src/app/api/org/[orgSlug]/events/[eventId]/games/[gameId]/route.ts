import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import type { GameStatus } from "@/generated/prisma/enums";
import { advanceBracketTeams } from "@/lib/bracket-advancement";
import { logActivity } from "@/lib/activity-log";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; gameId: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, gameId } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const game = await prisma.game.findFirst({
    where: { id: gameId, eventId, event: { organizationId: ctx.orgId }, deletedAt: null },
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
      originalScheduledAt: true,
      scheduledAt: true,
      status: true,
      forfeitingTeamId: true,
    },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const body = (await req.json()) as {
    scheduledAt?: string;
    courtId?: string | null;
    status?: GameStatus;
    forfeitingTeamId?: string | null;
    notes?: string;
    rescheduleReason?: string;
  };

  const updateData: Record<string, unknown> = {};

  if (body.scheduledAt !== undefined) {
    const newDate = new Date(body.scheduledAt);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
    }
    // Preserve original if rescheduling for first time
    if (!game.originalScheduledAt) {
      updateData.originalScheduledAt = game.scheduledAt;
    }
    updateData.scheduledAt = newDate;
    if (body.rescheduleReason) {
      updateData.rescheduleReason = body.rescheduleReason;
    }
  }

  if (body.courtId !== undefined) {
    if (body.courtId !== null) {
      const court = await prisma.court.findFirst({
        where: { id: body.courtId, venue: { organizationId: ctx.orgId } },
      });
      if (!court) return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }
    updateData.courtId = body.courtId;
  }

  if (body.status !== undefined) {
    const validStatuses: GameStatus[] = [
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "FORFEITED",
    ];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updateData.status = body.status;

    if (body.status === "FORFEITED" && body.forfeitingTeamId !== undefined) {
      updateData.forfeitingTeamId = body.forfeitingTeamId;
    }
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.game.update({
      where: { id: gameId },
      data: updateData,
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        court: { select: { id: true, name: true } },
      },
    });

    // Advance teams in bracket when a game is forfeited
    if (
      body.status === "FORFEITED" &&
      body.forfeitingTeamId &&
      game.bracketSide
    ) {
      const winnerTeamId =
        body.forfeitingTeamId === game.homeTeamId
          ? game.awayTeamId!
          : game.homeTeamId!;
      const loserTeamId =
        body.forfeitingTeamId === game.homeTeamId
          ? game.homeTeamId
          : game.awayTeamId;
      await advanceBracketTeams(tx, game, winnerTeamId, loserTeamId);
    }

    return result;
  });

  // Determine the action for activity log
  let action = "GAME_UPDATED";
  if (body.status === "FORFEITED") action = "GAME_FORFEITED";
  else if (body.status === "CANCELLED") action = "GAME_CANCELLED";
  else if (body.scheduledAt !== undefined) action = "GAME_RESCHEDULED";

  void logActivity({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    action,
    entityType: "GAME",
    entityId: gameId,
    metadata: {
      ...(body.scheduledAt ? { newScheduledAt: body.scheduledAt, rescheduleReason: body.rescheduleReason } : {}),
      ...(body.status ? { newStatus: body.status } : {}),
      ...(body.forfeitingTeamId ? { forfeitingTeamId: body.forfeitingTeamId } : {}),
    },
  });

  return NextResponse.json(updated);
}
