import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import type { EventStatus, EventType } from "@/generated/prisma/enums";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

const typeLabel: Record<EventType, string> = {
  LEAGUE: "League",
  TOURNAMENT: "Tournament",
};

export default async function PublicEventPage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;

  // Check if the current user is an org member (to show Register button)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isMember = false;
  let alreadyRegistered = false;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!org) notFound();

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true },
    });
    if (dbUser) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: dbUser.id, organizationId: org.id },
      });
      isMember = !!membership;

      if (isMember) {
        const teamMembership = await prisma.teamMember.findFirst({
          where: {
            userId: dbUser.id,
            team: { eventId, deletedAt: null },
            deletedAt: null,
          },
        });
        const freeAgent = await prisma.freeAgent.findFirst({
          where: { userId: dbUser.id, eventId },
        });
        alreadyRegistered = !!(teamMembership ?? freeAgent);
      }
    }
  }

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: org.id,
      deletedAt: null,
      visibility: { in: ["PUBLIC", "UNLISTED"] },
      status: { not: "DRAFT" },
    },
    include: {
      divisions: { orderBy: { name: "asc" } },
      _count: { select: { teams: true } },
      announcements: {
        orderBy: { postedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          body: true,
          postedAt: true,
          targetType: true,
        },
      },
    },
  });
  if (!event) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{org.name}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <EventStatusBadge status={event.status as EventStatus} />
          </div>
          <p className="text-muted-foreground">{typeLabel[event.type]}</p>
        </div>

        {/* Schedule & standings links when event is active */}
        {(event.status === "ACTIVE" || event.status === "PLAYOFF" || event.status === "COMPLETED") && (
          <div className="rounded-lg border bg-muted/30 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-medium">
              {event.status === "COMPLETED" ? "Event complete" : "Event is underway"}
            </p>
            <div className="flex gap-2">
              <Link
                href={`/${orgSlug}/events/${eventId}/schedule`}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Schedule
              </Link>
            </div>
          </div>
        )}

        {/* Register CTA */}
        {event.status === "REGISTRATION" &&
          (!event.registrationDeadline || new Date() < event.registrationDeadline) && (
            <div className="rounded-lg border bg-muted/30 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              {alreadyRegistered ? (
                <p className="text-sm font-medium text-green-700">You&apos;re registered for this event.</p>
              ) : isMember ? (
                <>
                  <p className="text-sm font-medium">Registration is open!</p>
                  <Link
                    href={`/${orgSlug}/events/${eventId}/register`}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link href={`/${orgSlug}/join`} className="text-primary hover:underline">
                    Join the org
                  </Link>{" "}
                  to register for this event.
                </p>
              )}
            </div>
          )}

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-4 rounded-lg border p-6 sm:grid-cols-2">
          {(event.type === "LEAGUE" ? event.startDate : event.tournamentStartDate) && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start date</dt>
              <dd className="mt-1 text-sm">
                {(event.type === "LEAGUE" ? event.startDate : event.tournamentStartDate)!.toLocaleDateString()}
              </dd>
            </div>
          )}
          {event.type === "TOURNAMENT" && event.endDate && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End date</dt>
              <dd className="mt-1 text-sm">{event.endDate.toLocaleDateString()}</dd>
            </div>
          )}
          {event.type === "LEAGUE" && event.weeks && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</dt>
              <dd className="mt-1 text-sm">{event.weeks} weeks</dd>
            </div>
          )}
          {event.registrationDeadline && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registration closes</dt>
              <dd className="mt-1 text-sm">{event.registrationDeadline.toLocaleDateString()}</dd>
            </div>
          )}
          {event.maxTeams && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Teams</dt>
              <dd className="mt-1 text-sm">
                {event._count.teams} / {event.maxTeams}
                {event._count.teams >= event.maxTeams && (
                  <span className="ml-2 text-xs text-destructive font-medium">Full</span>
                )}
              </dd>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    event._count.teams >= event.maxTeams ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, (event._count.teams / event.maxTeams) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {event.registrationFee !== null && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registration fee</dt>
              <dd className="mt-1 text-sm">
                {Number(event.registrationFee) === 0 ? "Free" : `$${Number(event.registrationFee).toFixed(2)}`}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Roster size</dt>
            <dd className="mt-1 text-sm">{event.minRosterSize}–{event.maxRosterSize} players</dd>
          </div>
        </div>

        {/* Announcements */}
        {event.announcements.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Announcements</h2>
            <div className="space-y-3">
              {event.announcements.map((a) => (
                <div key={a.id} className="rounded-lg border p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(a.postedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Description */}
        {event.description && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">About this event</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{event.description}</p>
          </section>
        )}

        {/* Divisions */}
        {event.divisions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Divisions</h2>
            <div className="grid gap-2">
              {event.divisions.map((division) => (
                <div key={division.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                  <span className="font-medium">{division.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {division.bracketType === "SINGLE_ELIM" ? "Single elimination" : "Double elimination"}
                    {" · "}Top {division.playoffTeams}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
