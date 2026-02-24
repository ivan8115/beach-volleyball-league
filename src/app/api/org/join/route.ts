import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Profile not complete" }, { status: 403 });
  }

  const body = await request.json();
  const { code } = body;

  if (!code) {
    return NextResponse.json({ error: "Join code is required" }, { status: 400 });
  }

  const org = await prisma.organization.findFirst({
    where: { joinCode: code, deletedAt: null },
    select: { id: true, slug: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Invalid join code. Please check with your admin." }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: dbUser.id, organizationId: org.id } },
  });

  if (existing) {
    return NextResponse.json({ slug: org.slug });
  }

  await prisma.organizationMember.create({
    data: {
      userId: dbUser.id,
      organizationId: org.id,
      role: "MEMBER",
    },
  });

  return NextResponse.json({ slug: org.slug });
}
