import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

async function getAdminMembership(supabaseUserId: string, orgSlug: string) {
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
  return { orgId: org.id };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = await getAdminMembership(user.id, orgSlug);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: admin.orgId },
    select: {
      name: true,
      slug: true,
      timezone: true,
      paypalEmail: true,
      website: true,
      instagramUrl: true,
      facebookUrl: true,
      joinCode: true,
    },
  });

  return NextResponse.json(org);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = await getAdminMembership(user.id, orgSlug);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, timezone, paypalEmail, website, instagramUrl, facebookUrl } = body;

  if (!name || !timezone) {
    return NextResponse.json({ error: "Name and timezone are required" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: admin.orgId },
    data: {
      name: name.trim(),
      timezone,
      paypalEmail: paypalEmail ?? null,
      website: website ?? null,
      instagramUrl: instagramUrl ?? null,
      facebookUrl: facebookUrl ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
