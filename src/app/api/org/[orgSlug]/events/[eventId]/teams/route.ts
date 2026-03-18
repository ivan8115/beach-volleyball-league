import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { notifyRegistrationConfirmed } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teams = await prisma.team.findMany({
    where: {
      eventId,
      event: { organizationId: ctx.orgId },
      deletedAt: null,
    },
    include: {
      division: { select: { id: true, name: true } },
      _count: { select: { members: { where: { deletedAt: null } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(teams);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = ctx.role === "ADMIN" || ctx.role === "SCORER";

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: {
      id: true,
      status: true,
      registrationDeadline: true,
      maxTeams: true,
      type: true,
    },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (!isAdmin) {
    if (event.status !== "REGISTRATION") {
      return NextResponse.json({ error: "Registration is not open" }, { status: 400 });
    }
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return NextResponse.json({ error: "Registration deadline has passed" }, { status: 400 });
    }
  }

  const body = (await req.json()) as {
    name: string;
    divisionId?: string;
    adminNotes?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  // Determine if team should be waitlisted
  let registrationStatus: "REGISTERED" | "WAITLISTED" = "REGISTERED";
  let waitlistPosition: number | null = null;

  if (event.maxTeams) {
    const activeCount = await prisma.team.count({
      where: {
        eventId,
        registrationStatus: { in: ["REGISTERED", "PENDING_PAYMENT"] },
        deletedAt: null,
      },
    });
    if (activeCount >= event.maxTeams) {
      registrationStatus = "WAITLISTED";
      const maxEntry = await prisma.waitlist.findFirst({
        where: { eventId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      waitlistPosition = (maxEntry?.position ?? 0) + 1;
    }
  }

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name: body.name.trim(),
        eventId,
        divisionId: body.divisionId ?? null,
        registrationStatus,
        adminNotes: body.adminNotes ?? null,
      },
    });

    // Create captain membership
    await tx.teamMember.create({
      data: {
        userId: ctx.userId,
        teamId: created.id,
        role: "CAPTAIN",
        registrationStatus: "REGISTERED",
      },
    });

    if (registrationStatus === "WAITLISTED" && waitlistPosition !== null) {
      await tx.waitlist.create({
        data: { eventId, teamId: created.id, position: waitlistPosition },
      });
    }

    return created;
  });

  void notifyRegistrationConfirmed({
    userId: ctx.userId,
    orgId: ctx.orgId,
    orgSlug,
    eventId,
    teamId: team.id,
    teamName: team.name,
    role: "CAPTAIN",
  });

  return NextResponse.json(
    { id: team.id, name: team.name, registrationStatus: team.registrationStatus },
    { status: 201 },
  );
}
