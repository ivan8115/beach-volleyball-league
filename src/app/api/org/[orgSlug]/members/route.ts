import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

async function getAdminOrScorerContext(supabaseUserId: string, orgSlug: string) {
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

  if (!membership || (membership.role !== "ADMIN" && membership.role !== "SCORER")) return null;
  return { orgId: org.id, requesterId: dbUser.id, requesterRole: membership.role };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ctx = await getAdminOrScorerContext(user.id, orgSlug);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          skillLevel: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}
