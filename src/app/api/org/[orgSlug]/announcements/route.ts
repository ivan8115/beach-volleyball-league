import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTargetType } from "@/generated/prisma/enums";
import { logActivity } from "@/lib/activity-log";
import { notifyAnnouncementPosted } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");

  const announcements = await prisma.announcement.findMany({
    where: {
      organizationId: ctx.orgId,
      ...(eventId ? { eventId } : {}),
    },
    include: {
      postedBy: { select: { id: true, name: true } },
      event: { select: { id: true, name: true } },
    },
    orderBy: { postedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(announcements);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    eventId?: string;
    title: string;
    body: string;
    targetType: AnnouncementTargetType;
    targetId?: string;
  };

  if (!body.title?.trim() || !body.body?.trim() || !body.targetType) {
    return NextResponse.json({ error: "title, body, and targetType are required" }, { status: 400 });
  }

  const validTargetTypes: AnnouncementTargetType[] = ["EVENT", "DIVISION", "TEAM"];
  if (!validTargetTypes.includes(body.targetType)) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  // If targeting a division or team, eventId is required
  if ((body.targetType === "DIVISION" || body.targetType === "TEAM") && !body.eventId) {
    return NextResponse.json({ error: "eventId is required for division/team announcements" }, { status: 400 });
  }

  // Verify event belongs to org (if provided)
  if (body.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: body.eventId, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      eventId: body.eventId ?? null,
      organizationId: ctx.orgId,
      title: body.title.trim(),
      body: body.body.trim(),
      targetType: body.targetType,
      targetId: body.targetId ?? null,
      postedById: ctx.userId,
    },
    include: {
      postedBy: { select: { id: true, name: true } },
      event: { select: { id: true, name: true } },
    },
  });

  void logActivity({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    action: "ANNOUNCEMENT_POSTED",
    entityType: "ANNOUNCEMENT",
    entityId: announcement.id,
    metadata: { title: announcement.title, targetType: body.targetType, eventId: body.eventId ?? null },
  });

  void notifyAnnouncementPosted({
    orgId: ctx.orgId,
    orgSlug,
    eventId: body.eventId,
    title: announcement.title,
    body: announcement.body,
    targetType: body.targetType,
  });

  return NextResponse.json(announcement, { status: 201 });
}
