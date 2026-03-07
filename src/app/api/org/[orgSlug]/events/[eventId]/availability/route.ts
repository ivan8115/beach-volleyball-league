import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import type { AvailabilityConstraintType, DayOfWeek } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

interface ConstraintInput {
  type: AvailabilityConstraintType;
  dayOfWeek?: DayOfWeek;
  specificDate?: string;
  startTime?: string;
  endTime?: string;
  startDateTime?: string;
  endDateTime?: string;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const availability = await prisma.playerAvailability.findUnique({
    where: { userId_eventId: { userId: ctx.userId, eventId } },
    include: { constraints: true },
  });

  return NextResponse.json(availability ?? { constraints: [] });
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: { type: true, collectAvailability: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.type !== "LEAGUE" || !event.collectAvailability) {
    return NextResponse.json({ error: "Availability not collected for this event" }, { status: 400 });
  }

  const body = (await req.json()) as { constraints: ConstraintInput[] };

  await prisma.$transaction(async (tx) => {
    // Upsert PlayerAvailability
    const pa = await tx.playerAvailability.upsert({
      where: { userId_eventId: { userId: ctx.userId, eventId } },
      create: { userId: ctx.userId, eventId },
      update: {},
    });

    // Replace all constraints
    await tx.availabilityConstraint.deleteMany({
      where: { playerAvailabilityId: pa.id },
    });

    if (body.constraints?.length) {
      await tx.availabilityConstraint.createMany({
        data: body.constraints.map((c) => ({
          playerAvailabilityId: pa.id,
          type: c.type,
          dayOfWeek: c.dayOfWeek ?? null,
          specificDate: c.specificDate ? new Date(c.specificDate) : null,
          startTime: c.startTime ?? null,
          endTime: c.endTime ?? null,
          startDateTime: c.startDateTime ? new Date(c.startDateTime) : null,
          endDateTime: c.endDateTime ? new Date(c.endDateTime) : null,
        })),
      });
    }
  });

  return NextResponse.json({ success: true });
}
