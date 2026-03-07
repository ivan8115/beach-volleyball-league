import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import type { EventVisibility, RefundPolicy, SeedingType, BracketType } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

interface DivisionInput {
  id?: string;
  name: string;
  bracketType: BracketType;
  playoffTeams: number;
  switchToSingleElimAtSemifinals: boolean;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    include: { divisions: { orderBy: { name: "asc" } } },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(event);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: { id: true, type: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    name?: string;
    status?: "DRAFT" | "REGISTRATION";
    visibility?: EventVisibility;
    description?: string | null;
    registrationDeadline?: string | null;
    rosterLockDate?: string | null;
    maxTeams?: number | null;
    minRosterSize?: number;
    maxRosterSize?: number;
    registrationFee?: number | null;
    refundPolicy?: RefundPolicy;
    refundDeadline?: string | null;
    seedingType?: SeedingType;
    startDate?: string | null;
    // League
    weeks?: number | null;
    collectAvailability?: boolean;
    maxSets?: number;
    pointsToWinSet?: number;
    pointsToWinDecider?: number;
    // Tournament
    endDate?: string | null;
    bracketType?: BracketType;
    switchToSingleElimAtSemifinals?: boolean;
    hasPoolPlay?: boolean;
    teamsPerPool?: number | null;
    teamsAdvancingPerPool?: number | null;
    hasThirdPlaceMatch?: boolean;
    divisions?: DivisionInput[];
  };

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        ...(body.name?.trim() && { name: body.name.trim() }),
        ...(body.status && { status: body.status }),
        ...(body.visibility && { visibility: body.visibility }),
        description: body.description?.trim() || null,
        registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : null,
        rosterLockDate: body.rosterLockDate ? new Date(body.rosterLockDate) : null,
        maxTeams: body.maxTeams ?? null,
        ...(body.minRosterSize !== undefined && { minRosterSize: body.minRosterSize }),
        ...(body.maxRosterSize !== undefined && { maxRosterSize: body.maxRosterSize }),
        registrationFee: body.registrationFee ?? null,
        ...(body.refundPolicy && { refundPolicy: body.refundPolicy }),
        refundDeadline: body.refundDeadline ? new Date(body.refundDeadline) : null,
        ...(body.seedingType && { seedingType: body.seedingType }),
        // League
        ...(event.type === "LEAGUE" && {
          startDate: body.startDate ? new Date(body.startDate) : null,
          weeks: body.weeks ?? null,
          ...(body.collectAvailability !== undefined && { collectAvailability: body.collectAvailability }),
          ...(body.maxSets !== undefined && { leagueMaxSets: body.maxSets }),
          ...(body.pointsToWinSet !== undefined && { leaguePointsToWinSet: body.pointsToWinSet }),
          ...(body.pointsToWinDecider !== undefined && { leaguePointsToWinDecider: body.pointsToWinDecider }),
        }),
        // Tournament
        ...(event.type === "TOURNAMENT" && {
          tournamentStartDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          ...(body.bracketType && { bracketType: body.bracketType }),
          ...(body.switchToSingleElimAtSemifinals !== undefined && {
            switchToSingleElimAtSemifinals: body.switchToSingleElimAtSemifinals,
          }),
          ...(body.hasPoolPlay !== undefined && { hasPoolPlay: body.hasPoolPlay }),
          teamsPerPool: body.teamsPerPool ?? null,
          teamsAdvancingPerPool: body.teamsAdvancingPerPool ?? null,
          ...(body.hasThirdPlaceMatch !== undefined && { hasThirdPlaceMatch: body.hasThirdPlaceMatch }),
          ...(body.maxSets !== undefined && { tournamentMaxSets: body.maxSets }),
          ...(body.pointsToWinSet !== undefined && { tournamentPointsToWinSet: body.pointsToWinSet }),
          ...(body.pointsToWinDecider !== undefined && { tournamentPointsToWinDecider: body.pointsToWinDecider }),
        }),
      },
    });

    if (body.divisions) {
      const incomingIds = body.divisions.filter((d) => d.id).map((d) => d.id as string);

      // Delete divisions not in the new payload
      await tx.division.deleteMany({
        where: { eventId, id: { notIn: incomingIds } },
      });

      // Upsert each division
      for (const d of body.divisions) {
        if (d.id) {
          await tx.division.update({
            where: { id: d.id },
            data: {
              name: d.name.trim(),
              bracketType: d.bracketType,
              playoffTeams: d.playoffTeams,
              switchToSingleElimAtSemifinals: d.switchToSingleElimAtSemifinals,
            },
          });
        } else {
          await tx.division.create({
            data: {
              eventId,
              name: d.name.trim(),
              bracketType: d.bracketType,
              playoffTeams: d.playoffTeams,
              switchToSingleElimAtSemifinals: d.switchToSingleElimAtSemifinals,
            },
          });
        }
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.event.update({
    where: { id: eventId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
