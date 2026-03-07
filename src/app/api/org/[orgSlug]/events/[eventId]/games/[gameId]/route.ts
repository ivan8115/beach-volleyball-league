import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import type { GameStatus } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; gameId: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, gameId } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const game = await prisma.game.findFirst({
    where: { id: gameId, eventId, event: { organizationId: ctx.orgId }, deletedAt: null },
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

  const updated = await prisma.game.update({
    where: { id: gameId },
    data: updateData,
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      court: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
