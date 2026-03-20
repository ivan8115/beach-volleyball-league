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
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      registrationDeadline: true,
      maxTeams: true,
      startDate: true,
      tournamentStartDate: true,
      _count: { select: { teams: true } },
    },
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
        <div className="space-y-3">
          {events.map((event) => {
            const isFull = event.maxTeams != null && event._count.teams >= event.maxTeams;
            const isNearFull = event.maxTeams != null && !isFull && event._count.teams >= event.maxTeams * 0.8;
            const regDeadline = event.registrationDeadline;
            const daysUntilDeadline = regDeadline
              ? Math.ceil((regDeadline.getTime() - Date.now()) / 86_400_000)
              : null;
            const deadlineSoon = daysUntilDeadline != null && daysUntilDeadline >= 0 && daysUntilDeadline <= 3;
            const startDate = event.startDate ?? event.tournamentStartDate;

            const defaultHref = `/${orgSlug}/admin/events/${event.id}/teams`;
            return (
              <div key={event.id} className="relative rounded-lg border p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={defaultHref} className="font-medium hover:underline before:absolute before:inset-0">
                        {event.name}
                      </Link>
                      <EventStatusBadge status={event.status as EventStatus} />
                      {isFull && (
                        <span className="text-xs font-medium text-destructive">Full</span>
                      )}
                      {isNearFull && (
                        <span className="text-xs font-medium text-amber-600">Nearly full</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{typeLabel[event.type]}</span>
                      {event.maxTeams != null ? (
                        <span className={isFull ? "text-destructive font-medium" : ""}>
                          {event._count.teams} / {event.maxTeams} teams
                        </span>
                      ) : (
                        <span>{event._count.teams} teams</span>
                      )}
                      {startDate && (
                        <span>
                          Starts {new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      {deadlineSoon && (
                        <span className="text-amber-600 font-medium">
                          Registration closes in {daysUntilDeadline === 0 ? "today" : `${daysUntilDeadline}d`}
                        </span>
                      )}
                    </div>
                    {event.maxTeams != null && (
                      <div className="mt-1.5 h-1 w-40 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isFull ? "bg-destructive" : isNearFull ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, (event._count.teams / event.maxTeams) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 flex items-center gap-2 shrink-0">
                    <Link
                      href={`/${orgSlug}/events/${event.id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Public page
                    </Link>
                    {event.type === "LEAGUE" ? (
                      <Link
                        href={`/${orgSlug}/admin/events/${event.id}/schedule`}
                        className="text-xs text-primary hover:underline"
                      >
                        Schedule
                      </Link>
                    ) : (
                      <Link
                        href={`/${orgSlug}/admin/events/${event.id}/bracket`}
                        className="text-xs text-primary hover:underline"
                      >
                        Bracket
                      </Link>
                    )}
                    {membership.role === "ADMIN" && (
                      <Link
                        href={`/${orgSlug}/admin/events/${event.id}/edit`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
