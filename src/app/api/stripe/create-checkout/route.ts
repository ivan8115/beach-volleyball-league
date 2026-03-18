import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import { getStripe, PLAN_TO_STRIPE_PRICE } from "@/lib/stripe";

export async function POST(req: Request) {
  const { orgSlug, planName } = (await req.json()) as {
    orgSlug: string;
    planName: string;
  };

  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const priceId = PLAN_TO_STRIPE_PRICE[planName];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan or Stripe price not configured" }, { status: 400 });
  }

  const stripe = getStripe();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Reuse existing Stripe customer if available
  const existing = await prisma.subscription.findUnique({
    where: { organizationId: ctx.orgId },
    select: { stripeCustomerId: true },
  });

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true, name: true },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: existing?.stripeCustomerId ?? undefined,
    customer_email: !existing?.stripeCustomerId ? (user?.email ?? undefined) : undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/${orgSlug}/admin/billing?success=1`,
    cancel_url: `${APP_URL}/${orgSlug}/admin/billing`,
    metadata: {
      organizationId: ctx.orgId,
      orgSlug,
      planName,
    },
    subscription_data: {
      metadata: {
        organizationId: ctx.orgId,
        orgSlug,
      },
    },
    ...(org ? { client_reference_id: ctx.orgId } : {}),
  });

  return NextResponse.json({ url: session.url });
}
