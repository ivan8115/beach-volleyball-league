import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; id: string }>;
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, id } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const slot = await prisma.timeSlot.findFirst({
    where: { id, eventId, event: { organizationId: ctx.orgId } },
  });
  if (!slot) return NextResponse.json({ error: "Timeslot not found" }, { status: 404 });

  await prisma.timeSlot.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
