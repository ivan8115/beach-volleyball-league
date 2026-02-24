import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

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
  const { name, slug, timezone } = body;

  if (!name || !slug || !timezone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^[a-z0-9-]{2,50}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
  }

  // Check slug uniqueness
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "That URL is already taken. Please choose another." }, { status: 409 });
  }

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug,
      timezone,
      joinCode: nanoid(8).toUpperCase(),
      members: {
        create: {
          userId: dbUser.id,
          role: "ADMIN",
        },
      },
    },
  });

  return NextResponse.json({ slug: org.slug });
}
