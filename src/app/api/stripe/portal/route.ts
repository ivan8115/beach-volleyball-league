import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { orgSlug } = (await req.json()) as { orgSlug: string };

  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: ctx.orgId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe subscription found" }, { status: 400 });
  }

  const stripe = getStripe();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${APP_URL}/${orgSlug}/admin/billing`,
  });

  return NextResponse.json({ url: session.url });
}
