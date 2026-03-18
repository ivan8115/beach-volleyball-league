import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const action = url.searchParams.get("action");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const cursor = url.searchParams.get("cursor");

  const logs = await prisma.activityLog.findMany({
    where: {
      organizationId: ctx.orgId,
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    logs,
    nextCursor: logs.length === limit ? logs[logs.length - 1].createdAt.toISOString() : null,
  });
}
