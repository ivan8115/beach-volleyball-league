import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import type { DayOfWeek } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const timeslots = await prisma.timeSlot.findMany({
    where: {
      eventId,
      event: { organizationId: ctx.orgId },
    },
    include: {
      court: { select: { id: true, name: true, venue: { select: { name: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(timeslots);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = (await req.json()) as {
    dayOfWeek: DayOfWeek;
    startTime: string;
    courtId?: string;
  };

  const validDays: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  if (!validDays.includes(body.dayOfWeek)) {
    return NextResponse.json({ error: "Invalid dayOfWeek" }, { status: 400 });
  }
  if (!body.startTime || !/^\d{2}:\d{2}$/.test(body.startTime)) {
    return NextResponse.json({ error: "startTime must be HH:MM" }, { status: 400 });
  }

  // If courtId provided, verify court belongs to same org
  if (body.courtId) {
    const court = await prisma.court.findFirst({
      where: { id: body.courtId, venue: { organizationId: ctx.orgId } },
    });
    if (!court) return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const slot = await prisma.timeSlot.create({
    data: {
      eventId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      courtId: body.courtId ?? null,
    },
    include: {
      court: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
