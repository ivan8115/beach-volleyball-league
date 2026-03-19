import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createPaypalOrder } from "@/lib/paypal";

export interface PaypalContext {
  type: "TEAM_CREATE" | "TEAM_JOIN" | "FREE_AGENT";
  eventId: string;
  teamId?: string;
  divisionId?: string;
  notes?: string;
}

interface RequestBody {
  amount: number;
  description: string;
  context: PaypalContext;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = (await req.json()) as RequestBody;
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!body.context?.type || !body.context?.eventId) {
    return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({
    where: { id: body.context.eventId, deletedAt: null },
    select: { id: true, type: true, registrationFee: true, organizationId: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // C1: Enforce server-side amount — never trust the client-supplied value
  const expectedFee = event.registrationFee ?? 0;
  if (body.amount !== expectedFee) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  // M2: Verify the user is a member of the event's org
  const orgMembership = await prisma.organizationMember.findFirst({
    where: { userId: dbUser.id, organizationId: event.organizationId },
  });
  if (!orgMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orderID = await createPaypalOrder(body.amount, body.description);

  const paymentType =
    body.context.type === "TEAM_CREATE" ? "TEAM_REGISTRATION" : "PLAYER_REGISTRATION";

  // Store pending payment with orderID as placeholder transaction ID
  const payment = await prisma.payment.create({
    data: {
      payerId: dbUser.id,
      eventId: body.context.eventId,
      type: paymentType,
      teamId: body.context.teamId ?? null,
      amount: body.amount,
      status: "PENDING",
      paypalTransactionId: orderID, // placeholder; updated on capture
    },
  });

  return NextResponse.json({ orderID, paymentId: payment.id });
}
