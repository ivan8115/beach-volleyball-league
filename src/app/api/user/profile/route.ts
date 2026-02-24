import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Gender, SkillLevel } from "@/generated/prisma/enums";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: {
      name: true,
      email: true,
      avatarUrl: true,
      gender: true,
      skillLevel: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(dbUser);
}

export async function PATCH(request: Request) {
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
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, gender, skillLevel } = body;

  if (!name || !gender || !skillLevel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!Object.values(Gender).includes(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  if (!Object.values(SkillLevel).includes(skillLevel)) {
    return NextResponse.json({ error: "Invalid skill level" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      name: name.trim(),
      gender: gender as Gender,
      skillLevel: skillLevel as SkillLevel,
    },
  });

  return NextResponse.json({ ok: true });
}
