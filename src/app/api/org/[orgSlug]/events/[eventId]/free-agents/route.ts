import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { notifyFreeAgentConfirmed } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const freeAgents = await prisma.freeAgent.findMany({
    where: { eventId, event: { organizationId: ctx.orgId } },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(freeAgents);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: { status: true, registrationDeadline: true, registrationFee: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (event.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Registration is not open" }, { status: 400 });
  }
  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    return NextResponse.json({ error: "Registration deadline has passed" }, { status: 400 });
  }

  // Check not already registered as free agent
  const existing = await prisma.freeAgent.findFirst({
    where: { userId: ctx.userId, eventId },
  });
  if (existing) {
    return NextResponse.json({ error: "Already registered as free agent" }, { status: 400 });
  }

  // Check not already on a team
  const teamMembership = await prisma.teamMember.findFirst({
    where: {
      userId: ctx.userId,
      team: { eventId, deletedAt: null },
      deletedAt: null,
    },
  });
  if (teamMembership) {
    return NextResponse.json({ error: "Already registered on a team" }, { status: 400 });
  }

  const fee = Number(event.registrationFee ?? 0);
  if (fee > 0) {
    return NextResponse.json({ requiresPayment: true, amount: fee }, { status: 200 });
  }

  const body = (await req.json()) as { notes?: string };

  const freeAgent = await prisma.freeAgent.create({
    data: {
      userId: ctx.userId,
      eventId,
      notes: body.notes?.trim() ?? "",
      status: "AVAILABLE",
    },
  });

  void notifyFreeAgentConfirmed({
    userId: ctx.userId,
    orgId: ctx.orgId,
    orgSlug,
    eventId,
  });

  return NextResponse.json(freeAgent, { status: 201 });
}
