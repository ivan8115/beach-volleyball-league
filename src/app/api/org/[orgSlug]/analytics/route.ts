import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = ctx;

  // Run all queries in parallel
  const [events, registeredTeams, teamMembers, payments] = await Promise.all([
    prisma.event.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        teams: {
          where: { registrationStatus: "REGISTERED", deletedAt: null },
          select: {
            id: true,
            members: {
              where: { registrationStatus: "REGISTERED", deletedAt: null },
              select: { id: true },
            },
          },
        },
        payments: {
          where: { status: "COMPLETED" },
          select: { amount: true },
        },
      },
    }),
    prisma.team.count({
      where: {
        event: { organizationId: orgId, deletedAt: null },
        registrationStatus: "REGISTERED",
        deletedAt: null,
      },
    }),
    prisma.teamMember.count({
      where: {
        team: {
          event: { organizationId: orgId, deletedAt: null },
          deletedAt: null,
        },
        registrationStatus: "REGISTERED",
        deletedAt: null,
      },
    }),
    prisma.payment.findMany({
      where: {
        event: { organizationId: orgId },
        status: "COMPLETED",
        paidAt: { not: null },
      },
      select: { amount: true, paidAt: true },
    }),
  ]);

  // Totals
  const totalRevenue = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  // Registrations by event
  const registrationsByEvent = events.map((e) => ({
    eventId: e.id,
    eventName: e.name,
    teamCount: e.teams.length,
    playerCount: e.teams.reduce((sum, t) => sum + t.members.length, 0),
    revenue: e.payments.reduce((sum, p) => sum + Number(p.amount), 0),
  }));

  // Revenue by month (last 12 months)
  const revenueByMonth: Record<string, number> = {};
  for (const p of payments) {
    if (!p.paidAt) continue;
    const d = new Date(p.paidAt);
    const key = d.toLocaleString("en-US", { month: "short", year: "numeric" });
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + Number(p.amount);
  }
  // Build sorted array for last 12 months
  const now = new Date();
  const revenueByMonthArray: Array<{ month: string; amount: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("en-US", { month: "short", year: "numeric" });
    revenueByMonthArray.push({ month: key, amount: revenueByMonth[key] ?? 0 });
  }

  // Events by status
  const statusCounts: Record<string, number> = {};
  for (const e of events) {
    statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
  }
  const eventsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  return NextResponse.json({
    totals: {
      events: events.length,
      teams: registeredTeams,
      players: teamMembers,
      revenue: totalRevenue,
    },
    registrationsByEvent,
    revenueByMonth: revenueByMonthArray,
    eventsByStatus,
  });
}
