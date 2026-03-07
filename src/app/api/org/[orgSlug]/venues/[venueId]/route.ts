import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; venueId: string }>;
}

async function getVenueForOrg(venueId: string, orgId: string) {
  return prisma.venue.findFirst({ where: { id: venueId, organizationId: orgId } });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { orgSlug, venueId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const venue = await getVenueForOrg(venueId, ctx.orgId);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, address, googleMapsUrl } = body as {
    name?: string;
    address?: string;
    googleMapsUrl?: string | null;
  };

  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(address?.trim() && { address: address.trim() }),
      googleMapsUrl: googleMapsUrl?.trim() || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, venueId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const venue = await getVenueForOrg(venueId, ctx.orgId);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.venue.delete({ where: { id: venueId } });
  return NextResponse.json({ ok: true });
}
