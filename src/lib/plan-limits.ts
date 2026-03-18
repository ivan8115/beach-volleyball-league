/**
 * Plan limit helpers — check whether an org is allowed to perform an action
 * based on their current subscription plan.
 *
 * -1 in a plan field means unlimited.
 */
import { prisma } from "@/lib/prisma";

interface PlanLimits {
  maxEvents: number;
  maxAdmins: number;
}

async function getOrgPlanLimits(orgId: string): Promise<PlanLimits> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    select: { plan: { select: { maxEvents: true, maxAdmins: true } } },
  });

  // No subscription = Free tier defaults
  return {
    maxEvents: subscription?.plan.maxEvents ?? 2,
    maxAdmins: subscription?.plan.maxAdmins ?? 1,
  };
}

/**
 * Returns an error string if the org cannot create another event, null if allowed.
 */
export async function checkEventLimit(orgId: string): Promise<string | null> {
  const limits = await getOrgPlanLimits(orgId);
  if (limits.maxEvents === -1) return null; // unlimited

  const count = await prisma.event.count({
    where: { organizationId: orgId, deletedAt: null },
  });

  if (count >= limits.maxEvents) {
    return `Your plan allows a maximum of ${limits.maxEvents} event${limits.maxEvents === 1 ? "" : "s"}. Upgrade your plan to create more.`;
  }
  return null;
}

/**
 * Returns an error string if the org cannot have another admin, null if allowed.
 */
export async function checkAdminLimit(orgId: string): Promise<string | null> {
  const limits = await getOrgPlanLimits(orgId);
  if (limits.maxAdmins === -1) return null; // unlimited

  const count = await prisma.organizationMember.count({
    where: { organizationId: orgId, role: "ADMIN" },
  });

  if (count >= limits.maxAdmins) {
    return `Your plan allows a maximum of ${limits.maxAdmins} admin${limits.maxAdmins === 1 ? "" : "s"}. Upgrade your plan to add more.`;
  }
  return null;
}
