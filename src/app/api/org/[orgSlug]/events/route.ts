import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { checkEventLimit } from "@/lib/plan-limits";
import type { EventType, EventVisibility, RefundPolicy, SeedingType, BracketType } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

interface DivisionInput {
  name: string;
  bracketType: BracketType;
  playoffTeams: number;
  switchToSingleElimAtSemifinals: boolean;
}

interface CreateEventBody {
  type: EventType;
  name: string;
  status?: "DRAFT" | "REGISTRATION";
  visibility: EventVisibility;
  description?: string;
  registrationDeadline?: string;
  rosterLockDate?: string;
  maxTeams?: number;
  minRosterSize: number;
  maxRosterSize: number;
  registrationFee?: number;
  refundPolicy: RefundPolicy;
  refundDeadline?: string;
  seedingType: SeedingType;
  // League fields
  startDate?: string;
  weeks?: number;
  collectAvailability?: boolean;
  maxSets?: number;
  pointsToWinSet?: number;
  pointsToWinDecider?: number;
  // Tournament fields
  endDate?: string;
  bracketType?: BracketType;
  switchToSingleElimAtSemifinals?: boolean;
  hasPoolPlay?: boolean;
  teamsPerPool?: number;
  teamsAdvancingPerPool?: number;
  hasThirdPlaceMatch?: boolean;
  divisions: DivisionInput[];
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const events = await prisma.event.findMany({
    where: { organizationId: ctx.orgId, deletedAt: null },
    include: { _count: { select: { teams: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as CreateEventBody;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Event name is required" }, { status: 400 });
  }
  if (!body.divisions?.length) {
    return NextResponse.json({ error: "At least one division is required" }, { status: 400 });
  }

  const limitError = await checkEventLimit(ctx.orgId);
  if (limitError) {
    return NextResponse.json({ error: limitError, limitReached: true }, { status: 403 });
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        organizationId: ctx.orgId,
        type: body.type,
        name: body.name.trim(),
        status: body.status ?? "DRAFT",
        visibility: body.visibility,
        description: body.description?.trim() || null,
        registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : null,
        rosterLockDate: body.rosterLockDate ? new Date(body.rosterLockDate) : null,
        maxTeams: body.maxTeams ?? null,
        minRosterSize: body.minRosterSize,
        maxRosterSize: body.maxRosterSize,
        registrationFee: body.registrationFee ?? null,
        refundPolicy: body.refundPolicy,
        refundDeadline: body.refundDeadline ? new Date(body.refundDeadline) : null,
        seedingType: body.seedingType,
        // League
        ...(body.type === "LEAGUE" && {
          startDate: body.startDate ? new Date(body.startDate) : null,
          weeks: body.weeks ?? null,
          collectAvailability: body.collectAvailability ?? false,
          leagueMaxSets: body.maxSets ?? 3,
          leaguePointsToWinSet: body.pointsToWinSet ?? 21,
          leaguePointsToWinDecider: body.pointsToWinDecider ?? 15,
        }),
        // Tournament
        ...(body.type === "TOURNAMENT" && {
          tournamentStartDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          bracketType: body.bracketType ?? "SINGLE_ELIM",
          switchToSingleElimAtSemifinals: body.switchToSingleElimAtSemifinals ?? false,
          hasPoolPlay: body.hasPoolPlay ?? false,
          teamsPerPool: body.teamsPerPool ?? null,
          teamsAdvancingPerPool: body.teamsAdvancingPerPool ?? null,
          hasThirdPlaceMatch: body.hasThirdPlaceMatch ?? false,
          tournamentMaxSets: body.maxSets ?? 3,
          tournamentPointsToWinSet: body.pointsToWinSet ?? 21,
          tournamentPointsToWinDecider: body.pointsToWinDecider ?? 15,
        }),
      },
    });

    await tx.division.createMany({
      data: body.divisions.map((d) => ({
        eventId: created.id,
        name: d.name.trim(),
        bracketType: d.bracketType,
        playoffTeams: d.playoffTeams,
        switchToSingleElimAtSemifinals: d.switchToSingleElimAtSemifinals,
      })),
    });

    return created;
  });

  return NextResponse.json({ id: event.id, name: event.name }, { status: 201 });
}
