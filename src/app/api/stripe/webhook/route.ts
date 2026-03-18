import { NextResponse } from "next/server";
import { getStripe, STRIPE_PRICE_TO_PLAN } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Stripe requires raw body for signature verification
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] Error handling event:", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;

  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.error("[stripe webhook] No organizationId in checkout metadata");
    return;
  }

  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;

  // Fetch the full subscription from Stripe to get period dates + price
  const stripe = getStripe();
  const stripeSub = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as Stripe.Subscription;

  const item = stripeSub.items.data[0];
  const priceId = item?.price.id ?? "";
  const planName = STRIPE_PRICE_TO_PLAN[priceId];
  const plan = planName
    ? await prisma.plan.findFirst({ where: { name: planName } })
    : null;

  // Fall back to free plan if no match
  const freePlan = await prisma.plan.findFirst({ where: { name: "Free" } });
  const planId = plan?.id ?? freePlan?.id;
  if (!planId) {
    console.error("[stripe webhook] No plan found for price", priceId);
    return;
  }

  // Period dates moved to SubscriptionItem in Stripe API 2025+
  const periodStart = item?.current_period_start ?? Math.floor(Date.now() / 1000);
  const periodEnd = item?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;

  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      planId,
      status: mapStripeStatus(stripeSub.status),
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      stripeSubscriptionId,
      stripeCustomerId,
    },
    update: {
      planId,
      status: mapStripeStatus(stripeSub.status),
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      stripeSubscriptionId,
      stripeCustomerId,
      cancelledAt: null,
    },
  });
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
  const organizationId = stripeSub.metadata?.organizationId;
  if (!organizationId) return;

  const priceId = stripeSub.items.data[0]?.price.id ?? "";
  const planName = STRIPE_PRICE_TO_PLAN[priceId];
  const plan = planName
    ? await prisma.plan.findFirst({ where: { name: planName } })
    : null;

  const subItem = stripeSub.items.data[0];
  const pStart = subItem?.current_period_start ?? Math.floor(Date.now() / 1000);
  const pEnd = subItem?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;

  const updateData: Record<string, unknown> = {
    status: mapStripeStatus(stripeSub.status),
    currentPeriodStart: new Date(pStart * 1000),
    currentPeriodEnd: new Date(pEnd * 1000),
  };

  if (plan) updateData.planId = plan.id;

  // Handle cancellation scheduled
  if (stripeSub.cancel_at_period_end && stripeSub.cancel_at) {
    updateData.cancelledAt = new Date(stripeSub.cancel_at * 1000);
  } else {
    updateData.cancelledAt = null;
  }

  await prisma.subscription.updateMany({
    where: { organizationId },
    data: updateData,
  });
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  const organizationId = stripeSub.metadata?.organizationId;
  if (!organizationId) return;

  const freePlan = await prisma.plan.findFirst({ where: { name: "Free" } });

  await prisma.subscription.updateMany({
    where: { organizationId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      ...(freePlan ? { planId: freePlan.id } : {}),
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) return;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId },
    data: { status: "PAST_DUE" },
  });
}

function mapStripeStatus(status: Stripe.Subscription.Status): "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING" {
  switch (status) {
    case "active": return "ACTIVE";
    case "trialing": return "TRIALING";
    case "past_due":
    case "unpaid": return "PAST_DUE";
    case "canceled":
    case "incomplete_expired": return "CANCELLED";
    default: return "ACTIVE";
  }
}
