import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!org) notFound();

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
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max teams</dt>
              <dd className="mt-1 text-sm">{event._count.teams} / {event.maxTeams}</dd>
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
