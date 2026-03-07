import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; venueId: string; courtId: string }>;
}

async function getCourtForOrg(courtId: string, venueId: string, orgId: string) {
  return prisma.court.findFirst({
    where: { id: courtId, venueId, venue: { organizationId: orgId } },
  });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { orgSlug, venueId, courtId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const court = await getCourtForOrg(courtId, venueId, ctx.orgId);
  if (!court) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, notes } = body as { name?: string; notes?: string | null };

  const updated = await prisma.court.update({
    where: { id: courtId },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, venueId, courtId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const court = await getCourtForOrg(courtId, venueId, ctx.orgId);
  if (!court) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.court.delete({ where: { id: courtId } });
  return NextResponse.json({ ok: true });
}
