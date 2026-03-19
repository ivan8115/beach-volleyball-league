import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withOrgTransaction } from "@/lib/prisma-rls";
import { capturePaypalOrder } from "@/lib/paypal";
import type { PaypalContext } from "@/app/api/paypal/create-order/route";

interface RequestBody {
  orderID: string;
  paymentId: string;
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

  // Verify payment belongs to this user
  const payment = await prisma.payment.findFirst({
    where: { id: body.paymentId, payerId: dbUser.id, status: "PENDING" },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const { transactionId } = await capturePaypalOrder(body.orderID);

  const event = await prisma.event.findFirst({
    where: { id: body.context.eventId, deletedAt: null },
    select: { id: true, type: true, maxTeams: true, organizationId: true },
  });
  if (!event) {
    console.error(`[PayPal orphan] capture ${transactionId} - event not found`);
    return NextResponse.json({ error: "Event not found" }, { status: 500 });
  }

  try {
    const result = await withOrgTransaction(event.organizationId, async (tx) => {
      // Update payment to COMPLETED
      await tx.payment.update({
        where: { id: body.paymentId },
        data: {
          status: "COMPLETED",
          paypalTransactionId: transactionId,
          paidAt: new Date(),
        },
      });

      if (body.context.type === "TEAM_CREATE") {
        // Determine registration status
        let registrationStatus: "REGISTERED" | "WAITLISTED" = "REGISTERED";
        let waitlistPosition: number | null = null;

        if (event.maxTeams) {
          const activeCount = await tx.team.count({
            where: {
              eventId: event.id,
              registrationStatus: { in: ["REGISTERED", "PENDING_PAYMENT"] },
              deletedAt: null,
            },
          });
          if (activeCount >= event.maxTeams) {
            registrationStatus = "WAITLISTED";
            const maxEntry = await tx.waitlist.findFirst({
              where: { eventId: event.id },
              orderBy: { position: "desc" },
              select: { position: true },
            });
            waitlistPosition = (maxEntry?.position ?? 0) + 1;
          }
        }

        const team = await tx.team.create({
          data: {
            name: (body.context.notes ?? "My Team").slice(0, 100), // cap team name length
            eventId: event.id,
            divisionId: body.context.divisionId ?? null,
            registrationStatus,
          },
        });

        await tx.teamMember.create({
          data: {
            userId: dbUser.id,
            teamId: team.id,
            role: "CAPTAIN",
            registrationStatus: "REGISTERED",
          },
        });

        await tx.payment.update({
          where: { id: body.paymentId },
          data: { teamId: team.id },
        });

        if (registrationStatus === "WAITLISTED" && waitlistPosition !== null) {
          await tx.waitlist.create({
            data: { eventId: event.id, teamId: team.id, position: waitlistPosition },
          });
        }

        return { teamId: team.id, registrationStatus };
      } else if (body.context.type === "TEAM_JOIN") {
        if (!body.context.teamId) throw new Error("teamId required for TEAM_JOIN");

        const team = await tx.team.findFirst({
          where: { id: body.context.teamId, eventId: event.id, deletedAt: null },
          include: { event: { select: { maxRosterSize: true } }, _count: { select: { members: { where: { deletedAt: null } } } } },
        });
        if (!team) throw new Error("Team not found");
        if (team._count.members >= team.event.maxRosterSize) throw new Error("Roster is full");

        const existing = await tx.teamMember.findFirst({
          where: { teamId: body.context.teamId, userId: dbUser.id, deletedAt: null },
        });
        if (existing) throw new Error("Already on this team");

        const member = await tx.teamMember.create({
          data: {
            userId: dbUser.id,
            teamId: body.context.teamId,
            role: "PLAYER",
            registrationStatus: "REGISTERED",
          },
        });

        await tx.payment.update({
          where: { id: body.paymentId },
          data: { teamId: body.context.teamId },
        });

        return { teamMemberId: member.id };
      } else if (body.context.type === "FREE_AGENT") {
        const freeAgent = await tx.freeAgent.create({
          data: {
            userId: dbUser.id,
            eventId: event.id,
            notes: body.context.notes?.trim().slice(0, 500) ?? "", // M5: cap notes length
            status: "AVAILABLE",
          },
        });
        return { freeAgentId: freeAgent.id };
      }

      throw new Error("Unknown context type");
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error(`[PayPal orphan] capture ${transactionId} - DB error:`, err);
    return NextResponse.json(
      { error: "Payment captured but registration failed. Please contact support.", transactionId },
      { status: 500 },
    );
  }
}
