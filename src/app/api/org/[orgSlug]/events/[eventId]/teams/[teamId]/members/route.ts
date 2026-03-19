import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { notifyRegistrationConfirmed, notifyWelcomeToTeam } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; teamId: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, teamId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = ctx.role === "ADMIN"; // C4: Scorers cannot add roster members

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      eventId,
      event: { organizationId: ctx.orgId },
      deletedAt: null,
    },
    include: {
      event: {
        select: {
          type: true,
          maxRosterSize: true,
          status: true,
          registrationDeadline: true,
        },
      },
      _count: { select: { members: { where: { deletedAt: null } } } },
    },
  });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Only captain or admin can add members
  if (!isAdmin) {
    const captainship = await prisma.teamMember.findFirst({
      where: { teamId, userId: ctx.userId, role: "CAPTAIN", deletedAt: null },
    });
    if (!captainship) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    userId?: string;
    role?: "CAPTAIN" | "PLAYER";
    jerseyNumber?: number;
  };

  // Allow self-join: if no userId provided, use the current user
  const targetUserId = body.userId ?? ctx.userId;

  // Non-admins can only add themselves (self-join) or when they're captain
  if (!isAdmin && targetUserId !== ctx.userId) {
    const captainship = await prisma.teamMember.findFirst({
      where: { teamId, userId: ctx.userId, role: "CAPTAIN", deletedAt: null },
    });
    if (!captainship) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify target user is an org member
  const orgMembership = await prisma.organizationMember.findFirst({
    where: { userId: targetUserId, organizationId: ctx.orgId },
  });
  if (!orgMembership) {
    return NextResponse.json({ error: "User is not an org member" }, { status: 400 });
  }

  // Check not already on this team
  const existing = await prisma.teamMember.findFirst({
    where: { teamId, userId: targetUserId, deletedAt: null },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already on this team" }, { status: 400 });
  }

  // Roster size check
  if (team._count.members >= team.event.maxRosterSize) {
    return NextResponse.json({ error: "Roster is full" }, { status: 400 });
  }

  const member = await prisma.teamMember.create({
    data: {
      userId: targetUserId,
      teamId,
      role: body.role ?? "PLAYER",
      jerseyNumber: body.jerseyNumber ?? null,
      registrationStatus: "REGISTERED",
    },
    include: { user: { select: { id: true, name: true } } },
  });

  void logActivity({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    action: "ROSTER_PLAYER_ADDED",
    entityType: "TEAM",
    entityId: teamId,
    metadata: { addedUserId: targetUserId, role: body.role ?? "PLAYER" },
  });

  // Send email: welcome-to-team if added by someone else, registration confirmation if self-join
  if (targetUserId !== ctx.userId) {
    void notifyWelcomeToTeam({
      addedUserId: targetUserId,
      addedByUserId: ctx.userId,
      orgId: ctx.orgId,
      orgSlug,
      eventId,
      teamId,
      teamName: team.name,
    });
  } else {
    void notifyRegistrationConfirmed({
      userId: ctx.userId,
      orgId: ctx.orgId,
      orgSlug,
      eventId,
      teamId,
      teamName: team.name,
      role: body.role ?? "PLAYER",
    });
  }

  return NextResponse.json(member, { status: 201 });
}
