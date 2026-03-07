import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string; teamId: string }>;
}

export default async function PublicTeamPage({ params }: PageProps) {
  const { orgSlug, eventId, teamId } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      eventId,
      event: { organizationId: org.id, deletedAt: null },
      deletedAt: null,
    },
    include: {
      event: { select: { id: true, name: true, type: true, status: true, maxRosterSize: true, registrationFee: true } },
      division: { select: { name: true } },
      members: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!team) notFound();

  // Check if current user is already on this team
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isOnTeam = false;
  let canJoin = false;
  let isMember = false;

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

      const teamMembership = team.members.find((m) => m.user.id === dbUser.id);
      isOnTeam = !!teamMembership;

      canJoin =
        !isOnTeam &&
        isMember &&
        team.event.status === "REGISTRATION" &&
        team.members.length < team.event.maxRosterSize &&
        team.event.type === "LEAGUE"; // tournament players added by captain only
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div>
          <Link
            href={`/${orgSlug}/events/${eventId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {team.event.name}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{team.name}</h1>
          {team.division && (
            <p className="text-muted-foreground text-sm">{team.division.name}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {team.members.length} / {team.event.maxRosterSize} players
          </span>
          <span className="text-muted-foreground">·</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            team.registrationStatus === "REGISTERED"
              ? "bg-green-100 text-green-800"
              : team.registrationStatus === "WAITLISTED"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-600"
          }`}>
            {team.registrationStatus}
          </span>
        </div>

        {/* Roster */}
        <div className="space-y-3">
          <h2 className="font-semibold">Roster</h2>
          <div className="divide-y rounded-lg border">
            {team.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{m.user.name}</p>
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  {m.role.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {canJoin && (
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm">
              Want to join this team?{" "}
              {Number(team.event.registrationFee ?? 0) > 0 && (
                <span className="text-muted-foreground">
                  Fee: ${Number(team.event.registrationFee).toFixed(2)}
                </span>
              )}
            </p>
            <Link
              href={`/${orgSlug}/events/${eventId}/register?flow=join&team=${teamId}`}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Join this team
            </Link>
          </div>
        )}

        {isOnTeam && (
          <p className="text-sm text-green-700 font-medium">You&apos;re on this team.</p>
        )}

        {!user && team.event.status === "REGISTRATION" && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              <Link href={`/login`} className="text-primary hover:underline">Sign in</Link>
              {" "}to join this team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
