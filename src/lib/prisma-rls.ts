/**
 * RLS-enforced transaction wrapper.
 *
 * How it works:
 *   1. Opens a Prisma transaction.
 *   2. Switches to the `beach_app` role (NOBYPASSRLS) — so all RESTRICTIVE
 *      RLS policies on org-scoped tables are active for this transaction.
 *   3. Sets `app.org_id` to the given org ID — policies check this value.
 *   4. Runs the caller's callback. Any query touching an org-scoped table that
 *      doesn't match `app.org_id` will be rejected at the DB level.
 *   5. Role reverts to `postgres` automatically when the transaction ends.
 *
 * Use this instead of bare `prisma.$transaction` in all org-scoped write routes.
 * For cross-org operations (user dashboard, webhooks) use `prisma` directly.
 */

import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@/generated/prisma/client";

export type OrgTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function withOrgTransaction<T>(
  orgId: string,
  fn: (tx: OrgTx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Drop to non-privileged role so RLS policies apply
    await tx.$executeRaw`SET LOCAL ROLE beach_app`;
    // Set org context checked by all RESTRICTIVE policies
    await tx.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
    return fn(tx as OrgTx);
  });
}
