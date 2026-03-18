/**
 * Activity Log — audit trail for admin-visible actions.
 *
 * Call `logActivity` from API routes after significant mutations.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

interface LogInput {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logActivity(input: LogInput): Promise<void> {
  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
    },
  });
}
