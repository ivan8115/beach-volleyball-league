import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import type { EventStatus, EventType } from "@/generated/prisma/enums";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

const typeLabel: Record<EventType, string> = {
  LEAGUE: "League",
  TOURNAMENT: "Tournament",
};

export default async function AdminEventsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!dbUser) notFound();

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: dbUser.id, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "ADMIN" && membership.role !== "SCORER")) notFound();

  const events = await prisma.event.findMany({
    where: { organizationId: org.id, deletedAt: null },
    include: { _count: { select: { teams: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        {membership.role === "ADMIN" && (
          <Link
            href={`/${orgSlug}/admin/events/new`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create event
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No events yet.</p>
          {membership.role === "ADMIN" && (
            <Link
              href={`/${orgSlug}/admin/events/new`}
              className="mt-3 inline-block text-sm text-primary underline"
            >
              Create your first event
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Teams</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/${orgSlug}/events/${event.id}`}
                      className="hover:underline"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{typeLabel[event.type]}</td>
                  <td className="px-4 py-3">
                    <EventStatusBadge status={event.status as EventStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{event._count.teams}</td>
                  <td className="px-4 py-3">
                    {membership.role === "ADMIN" && (
                      <Link
                        href={`/${orgSlug}/admin/events/${event.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
