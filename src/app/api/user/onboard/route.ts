import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Gender, SkillLevel } from "@/generated/prisma/enums";

const CURRENT_TOS_VERSION = "1.0";
const CURRENT_PRIVACY_VERSION = "1.0";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, gender, skillLevel, isOver18, tosAccepted } = body;

  if (!name || !gender || !skillLevel || isOver18 !== true || tosAccepted !== true) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!Object.values(Gender).includes(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  if (!Object.values(SkillLevel).includes(skillLevel)) {
    return NextResponse.json({ error: "Invalid skill level" }, { status: 400 });
  }

  // Check if user already has a profile (idempotent)
  const existing = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
  });

  if (existing) {
    return NextResponse.json({ ok: true });
  }

  await prisma.user.create({
    data: {
      email: user.email!,
      supabaseUserId: user.id,
      name: name.trim(),
      gender: gender as Gender,
      skillLevel: skillLevel as SkillLevel,
      isOver18: true,
      tosAcceptedAt: new Date(),
      tosVersion: CURRENT_TOS_VERSION,
      privacyPolicyAcceptedAt: new Date(),
      privacyPolicyVersion: CURRENT_PRIVACY_VERSION,
    },
  });

  return NextResponse.json({ ok: true });
}
