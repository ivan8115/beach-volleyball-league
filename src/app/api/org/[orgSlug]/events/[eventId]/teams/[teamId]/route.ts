import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; teamId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, teamId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      eventId,
      event: { organizationId: ctx.orgId },
      deletedAt: null,
    },
    include: {
      division: { select: { id: true, name: true } },
      members: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(team);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, teamId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = ctx.role === "ADMIN" || ctx.role === "SCORER";

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      eventId,
      event: { organizationId: ctx.orgId },
      deletedAt: null,
    },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Captaincy check for non-admins
  if (!isAdmin) {
    const captainship = await prisma.teamMember.findFirst({
      where: { teamId, userId: ctx.userId, role: "CAPTAIN", deletedAt: null },
    });
    if (!captainship) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    divisionId?: string;
    registrationStatus?: string;
    adminNotes?: string;
  };

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (isAdmin) {
    if (body.divisionId !== undefined) data.divisionId = body.divisionId;
    if (body.registrationStatus !== undefined) data.registrationStatus = body.registrationStatus;
    if (body.adminNotes !== undefined) data.adminNotes = body.adminNotes;
  }

  const updated = await prisma.team.update({ where: { id: teamId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, teamId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      eventId,
      event: { organizationId: ctx.orgId },
      deletedAt: null,
    },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
