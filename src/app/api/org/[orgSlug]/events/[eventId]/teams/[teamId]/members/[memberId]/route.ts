import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; teamId: string; memberId: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, teamId, memberId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = ctx.role === "ADMIN"; // C4: Scorers cannot manage roster members

  const member = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      teamId,
      team: { eventId, event: { organizationId: ctx.orgId } },
      deletedAt: null,
    },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin) {
    const captainship = await prisma.teamMember.findFirst({
      where: { teamId, userId: ctx.userId, role: "CAPTAIN", deletedAt: null },
    });
    if (!captainship) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { role?: string; jerseyNumber?: number };
  const updated = await prisma.teamMember.update({
    where: { id: memberId },
    data: {
      ...(body.role !== undefined && { role: body.role as "CAPTAIN" | "PLAYER" }),
      ...(body.jerseyNumber !== undefined && { jerseyNumber: body.jerseyNumber }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, teamId, memberId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = ctx.role === "ADMIN"; // C4: Scorers cannot manage roster members

  const member = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      teamId,
      team: { eventId, event: { organizationId: ctx.orgId } },
      deletedAt: null,
    },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin) {
    const captainship = await prisma.teamMember.findFirst({
      where: { teamId, userId: ctx.userId, role: "CAPTAIN", deletedAt: null },
    });
    if (!captainship) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.teamMember.update({ where: { id: memberId }, data: { deletedAt: new Date() } });

  void logActivity({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    action: "ROSTER_PLAYER_REMOVED",
    entityType: "TEAM",
    entityId: teamId,
    metadata: { removedUserId: member.userId, memberId },
  });

  return NextResponse.json({ success: true });
}
