import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [subscription, plans] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: ctx.orgId },
      include: { plan: true },
    }),
    prisma.plan.findMany({ orderBy: { monthlyPrice: "asc" } }),
  ]);

  return NextResponse.json({ subscription, plans });
}
