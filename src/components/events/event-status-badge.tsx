import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/generated/prisma/enums";

const statusConfig: Record<EventStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  REGISTRATION: { label: "Registration", variant: "default" },
  ACTIVE: { label: "Active", variant: "default" },
  PLAYOFF: { label: "Playoff", variant: "default" },
  COMPLETED: { label: "Completed", variant: "outline" },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, variant } = statusConfig[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={variant}>{label}</Badge>;
}
