import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

interface RouteParams {
  params: Promise<{ orgSlug: string; announcementId: string }>;
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { orgSlug, announcementId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, organizationId: ctx.orgId },
  });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.announcement.delete({ where: { id: announcementId } });

  void logActivity({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    action: "ANNOUNCEMENT_DELETED",
    entityType: "ANNOUNCEMENT",
    entityId: announcementId,
    metadata: { title: announcement.title },
  });

  return NextResponse.json({ ok: true });
}
