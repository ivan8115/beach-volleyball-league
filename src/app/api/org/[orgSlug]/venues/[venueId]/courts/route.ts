import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; venueId: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, venueId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify venue belongs to this org
  const venue = await prisma.venue.findFirst({ where: { id: venueId, organizationId: ctx.orgId } });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, notes } = body as { name: string; notes?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Court name is required" }, { status: 400 });
  }

  const court = await prisma.court.create({
    data: {
      venueId,
      name: name.trim(),
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(court, { status: 201 });
}
