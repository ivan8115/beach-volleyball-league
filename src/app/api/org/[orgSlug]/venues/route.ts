import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const venues = await prisma.venue.findMany({
    where: { organizationId: ctx.orgId },
    include: { courts: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(venues);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, address, googleMapsUrl } = body as {
    name: string;
    address: string;
    googleMapsUrl?: string;
  };

  if (!name?.trim() || !address?.trim()) {
    return NextResponse.json({ error: "Name and address are required" }, { status: 400 });
  }

  const venue = await prisma.venue.create({
    data: {
      organizationId: ctx.orgId,
      name: name.trim(),
      address: address.trim(),
      googleMapsUrl: googleMapsUrl?.trim() || null,
    },
  });

  return NextResponse.json(venue, { status: 201 });
}
