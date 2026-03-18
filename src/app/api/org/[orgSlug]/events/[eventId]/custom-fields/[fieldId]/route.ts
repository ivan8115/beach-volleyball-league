import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string; fieldId: string }>;
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, fieldId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const field = await prisma.customField.findFirst({
    where: { id: fieldId, eventId, event: { organizationId: ctx.orgId } },
  });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete responses first, then the field
  await prisma.$transaction([
    prisma.customFieldResponse.deleteMany({ where: { customFieldId: fieldId } }),
    prisma.customField.delete({ where: { id: fieldId } }),
  ]);

  return NextResponse.json({ ok: true });
}
