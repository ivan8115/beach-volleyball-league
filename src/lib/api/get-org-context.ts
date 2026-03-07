import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/generated/prisma/enums";

export interface OrgContext {
  orgId: string;
  userId: string;
  role: OrgRole;
}

/**
 * Authenticates the current user and verifies they have at least the required
 * role in the given org. Returns null if auth fails, org not found, or
 * membership check fails.
 *
 * @param orgSlug  The org slug from the URL
 * @param minRole  "ADMIN" requires ADMIN only; "SCORER" accepts ADMIN or SCORER;
 *                 "MEMBER" accepts any membership
 */
export async function getOrgContext(
  orgSlug: string,
  minRole: "ADMIN" | "SCORER" | "MEMBER" = "ADMIN",
): Promise<OrgContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!dbUser) return null;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true },
  });
  if (!org) return null;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: dbUser.id, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership) return null;

  const roleHierarchy: OrgRole[] = ["MEMBER", "SCORER", "ADMIN"];
  const requiredIndex = roleHierarchy.indexOf(minRole);
  const actualIndex = roleHierarchy.indexOf(membership.role);
  if (actualIndex < requiredIndex) return null;

  return { orgId: org.id, userId: dbUser.id, role: membership.role };
}
