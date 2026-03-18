import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

/** Maps Stripe price IDs (from env) to plan names */
export const STRIPE_PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_STARTER_PRICE_ID ?? ""]: "Starter",
  [process.env.STRIPE_PRO_PRICE_ID ?? ""]: "Pro",
};

export const PLAN_TO_STRIPE_PRICE: Record<string, string> = {
  Starter: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  Pro: process.env.STRIPE_PRO_PRICE_ID ?? "",
};
