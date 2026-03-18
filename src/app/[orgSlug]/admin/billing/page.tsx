"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: string;
  maxEvents: number;
  maxTeams: number;
  maxAdmins: number;
  features: Record<string, boolean>;
  stripePriceId: string | null;
}

interface Subscription {
  id: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING";
  currentPeriodEnd: string;
  cancelledAt: string | null;
  stripeCustomerId: string | null;
  plan: Plan;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  TRIALING: "bg-blue-100 text-blue-700",
  PAST_DUE: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

function limitLabel(val: number): string {
  return val === -1 ? "Unlimited" : String(val);
}

export default function BillingPage() {
  const params = useParams<{ orgSlug: string }>();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const justSubscribed = searchParams.get("success") === "1";

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/subscription`)
      .then((r) => r.json())
      .then((data: { subscription: Subscription | null; plans: Plan[] }) => {
        setSubscription(data.subscription);
        setPlans(data.plans);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orgSlug]);

  async function handleUpgrade(planName: string) {
    setActionLoading(planName);
    setError(null);
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, planName }),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      setError(data.error ?? "Failed to start checkout");
      setActionLoading(null);
      return;
    }
    window.location.href = data.url;
  }

  async function handlePortal() {
    setActionLoading("portal");
    setError(null);
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug }),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      setError(data.error ?? "Failed to open billing portal");
      setActionLoading(null);
      return;
    }
    window.location.href = data.url;
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  const currentPlanName = subscription?.plan.name ?? "Free";

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      {justSubscribed && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Subscription activated! Welcome to {currentPlanName}.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {/* Current plan */}
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{subscription.plan.name} plan</CardTitle>
                <CardDescription>
                  ${Number(subscription.plan.monthlyPrice).toFixed(0)}/month
                </CardDescription>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[subscription.status]}`}>
                {subscription.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Events</p>
                <p className="font-medium">{limitLabel(subscription.plan.maxEvents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Teams/event</p>
                <p className="font-medium">{limitLabel(subscription.plan.maxTeams)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Admins</p>
                <p className="font-medium">{limitLabel(subscription.plan.maxAdmins)}</p>
              </div>
            </div>
            {subscription.cancelledAt && (
              <p className="text-sm text-yellow-700">
                Cancels on {new Date(subscription.cancelledAt).toLocaleDateString()}
              </p>
            )}
            {!subscription.cancelledAt && subscription.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {subscription.stripeCustomerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handlePortal()}
                disabled={actionLoading === "portal"}
              >
                {actionLoading === "portal" ? "Opening…" : "Manage billing & invoices"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Free plan</CardTitle>
            <CardDescription>2 events · 20 teams · 1 admin</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Plan comparison */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Plans</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            const isPaid = Number(plan.monthlyPrice) > 0;
            const canUpgrade = !isCurrent && isPaid && !!plan.stripePriceId;
            const canDowngrade = !isCurrent && !isPaid && currentPlanName !== "Free";

            return (
              <Card key={plan.id} className={isCurrent ? "border-primary ring-1 ring-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                  </div>
                  <CardDescription className="text-lg font-bold text-foreground">
                    {Number(plan.monthlyPrice) === 0 ? "Free" : `$${Number(plan.monthlyPrice).toFixed(0)}/mo`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>{limitLabel(plan.maxEvents)} events</li>
                    <li>{limitLabel(plan.maxTeams)} teams per event</li>
                    <li>{limitLabel(plan.maxAdmins)} admin{plan.maxAdmins !== 1 ? "s" : ""}</li>
                    {(plan.features as Record<string, boolean>).customFields && (
                      <li>Custom registration fields</li>
                    )}
                    {(plan.features as Record<string, boolean>).activityLog && (
                      <li>Activity log</li>
                    )}
                    {(plan.features as Record<string, boolean>).prioritySupport && (
                      <li>Priority support</li>
                    )}
                  </ul>

                  {canUpgrade && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => void handleUpgrade(plan.name)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === plan.name ? "Redirecting…" : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                  {canDowngrade && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => void handlePortal()}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === "portal" ? "Opening…" : "Cancel subscription"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
