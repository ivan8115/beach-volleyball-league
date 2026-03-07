import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { EventWizard, type EventInitialData } from "@/components/events/event-wizard";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/${orgSlug}/admin/events/${eventId}/edit`);

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/onboarding");

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true },
  });
  if (!org) notFound();

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: dbUser.id, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership || membership.role !== "ADMIN") notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: org.id, deletedAt: null },
    include: { divisions: { orderBy: { name: "asc" } } },
  });
  if (!event) notFound();

  // Serialize for client component (Dates → strings, Decimal → number)
  const initialData: EventInitialData = {
    type: event.type,
    name: event.name,
    status: event.status === "DRAFT" || event.status === "REGISTRATION" ? event.status : "DRAFT",
    visibility: event.visibility,
    description: event.description ?? null,
    registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
    rosterLockDate: event.rosterLockDate?.toISOString() ?? null,
    maxTeams: event.maxTeams ?? null,
    minRosterSize: event.minRosterSize,
    maxRosterSize: event.maxRosterSize,
    registrationFee: event.registrationFee ? Number(event.registrationFee) : null,
    refundPolicy: event.refundPolicy,
    refundDeadline: event.refundDeadline?.toISOString() ?? null,
    seedingType: event.seedingType,
    // League uses startDate, Tournament uses tournamentStartDate
    startDate:
      event.type === "LEAGUE"
        ? (event.startDate?.toISOString().split("T")[0] ?? null)
        : (event.tournamentStartDate?.toISOString().split("T")[0] ?? null),
    maxSets:
      event.type === "LEAGUE"
        ? (event.leagueMaxSets ?? undefined)
        : (event.tournamentMaxSets ?? undefined),
    pointsToWinSet:
      event.type === "LEAGUE"
        ? (event.leaguePointsToWinSet ?? undefined)
        : (event.tournamentPointsToWinSet ?? undefined),
    pointsToWinDecider:
      event.type === "LEAGUE"
        ? (event.leaguePointsToWinDecider ?? undefined)
        : (event.tournamentPointsToWinDecider ?? undefined),
    // League
    weeks: event.weeks ?? null,
    collectAvailability: event.collectAvailability ?? undefined,
    // Tournament
    endDate: event.endDate?.toISOString().split("T")[0] ?? null,
    bracketType: event.bracketType ?? undefined,
    switchToSingleElimAtSemifinals: event.switchToSingleElimAtSemifinals ?? undefined,
    hasPoolPlay: event.hasPoolPlay ?? undefined,
    teamsPerPool: event.teamsPerPool ?? null,
    teamsAdvancingPerPool: event.teamsAdvancingPerPool ?? null,
    hasThirdPlaceMatch: event.hasThirdPlaceMatch ?? undefined,
    divisions: event.divisions.map((d) => ({
      id: d.id,
      name: d.name,
      bracketType: d.bracketType,
      playoffTeams: d.playoffTeams,
      switchToSingleElimAtSemifinals: d.switchToSingleElimAtSemifinals,
    })),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit event</h1>
      <EventWizard
        orgSlug={orgSlug}
        mode="edit"
        eventId={eventId}
        initialData={initialData}
      />
    </div>
  );
}
