import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // Check if User row exists in DB
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
  });

  if (!dbUser) {
    // New user — send to onboarding
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Existing user — send to intended destination or dashboard
  return NextResponse.redirect(`${origin}${next}`);
}
