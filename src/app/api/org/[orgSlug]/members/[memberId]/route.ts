import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OrgRole } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ orgSlug: string; memberId: string }>;
}

async function getAdminContext(supabaseUserId: string, orgSlug: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: { id: true },
  });
  if (!dbUser) return null;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true },
  });
  if (!org) return null;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: dbUser.id, organizationId: org.id } },
    select: { role: true },
  });

  if (!membership || membership.role !== "ADMIN") return null;
  return { orgId: org.id, requesterId: dbUser.id };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { orgSlug, memberId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ctx = await getAdminContext(user.id, orgSlug);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { role } = body;

  if (!Object.values(OrgRole).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.orgId },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent admin from demoting themselves
  if (member.userId === ctx.requesterId && role !== "ADMIN") {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }

  await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: role as OrgRole },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, memberId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ctx = await getAdminContext(user.id, orgSlug);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.orgId },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent self-removal
  if (member.userId === ctx.requesterId) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  return NextResponse.json({ ok: true });
}
