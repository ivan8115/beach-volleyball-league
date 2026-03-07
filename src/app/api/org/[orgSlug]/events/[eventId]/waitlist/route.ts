import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const waitlist = await prisma.waitlist.findMany({
    where: { eventId, event: { organizationId: ctx.orgId } },
    include: {
      team: {
        include: {
          _count: { select: { members: { where: { deletedAt: null } } } },
        },
      },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(waitlist);
}
