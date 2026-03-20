import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventStatus } from "@/generated/prisma/enums";

interface MemberDashboardProps {
  params: Promise<{ orgSlug: string }>;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION: "Registration Open",
  ACTIVE: "Active",
  PLAYOFF: "Playoffs",
  COMPLETED: "Completed",
};

export default async function MemberDashboardPage({ params }: MemberDashboardProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true, name: true, avatarUrl: true },
  });

  if (!dbUser) redirect("/onboarding");

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    include: {
      events: {
        where: {
          deletedAt: null,
          status: { not: EventStatus.DRAFT },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          startDate: true,
          tournamentStartDate: true,
        },
      },
      announcements: {
        orderBy: { postedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          body: true,
          postedAt: true,
        },
      },
      members: {
        where: { userId: dbUser.id },
        select: { role: true },
      },
    },
  });

  if (!org) notFound();

  const membership = org.members[0];
  if (!membership) redirect(`/${orgSlug}/join`);

  if (membership.role === "ADMIN" || membership.role === "SCORER") {
    redirect(`/${orgSlug}/admin`);
  }

  const isAdmin = false;

  // Fetch user's team registrations for this org's events
  const myTeams = await prisma.teamMember.findMany({
    where: {
      userId: dbUser.id,
      deletedAt: null,
      team: { deletedAt: null, event: { organizationId: org.id } },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          registrationStatus: true,
          event: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch upcoming games for the user's teams
  const myTeamIds = myTeams.map((tm) => tm.team.id);
  const upcomingGames = myTeamIds.length > 0
    ? await prisma.game.findMany({
        where: {
          event: { organizationId: org.id },
          deletedAt: null,
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          isBye: false,
          OR: [
            { homeTeamId: { in: myTeamIds } },
            { awayTeamId: { in: myTeamIds } },
          ],
          scheduledAt: { gte: new Date() },
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          event: { select: { id: true, name: true } },
          court: { select: { name: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← All orgs
            </Link>
            <span className="font-semibold">{org.name}</span>
            <Badge variant="outline">{membership.role.toLowerCase()}</Badge>
          </div>
          <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
              <Link href="/profile">Profile</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>

        {upcomingGames.length === 0 && myTeams.length === 0 && org.events.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center mb-8">
            <p className="font-medium mb-1">Nothing here yet</p>
            <p className="text-sm text-muted-foreground">
              No events are open for registration right now. Check back soon.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming games */}
            {upcomingGames.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">Upcoming games</h2>
                <div className="space-y-2">
                  {upcomingGames.map((game) => {
                    const isHome = myTeamIds.includes(game.homeTeamId ?? "");
                    const myTeamName = isHome ? game.homeTeam?.name : game.awayTeam?.name;
                    const oppTeamName = isHome ? game.awayTeam?.name : game.homeTeam?.name;
                    return (
                      <Link key={game.id} href={`/${orgSlug}/events/${game.event.id}/schedule`}>
                        <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                          <CardContent className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {myTeamName} vs {oppTeamName ?? "TBD"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {game.event.name}
                                {game.court && <> · {game.court.name}</>}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-medium">
                                {new Date(game.scheduledAt).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(game.scheduledAt).toLocaleTimeString(undefined, {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My teams */}
            {myTeams.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">My registrations</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {myTeams.map((tm) => (
                    <Card key={tm.id} className="hover:shadow-sm transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{tm.team.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {tm.team.event.name}
                          {" · "}
                          <span className="capitalize">{tm.role.toLowerCase()}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                            tm.team.registrationStatus === "REGISTERED"
                              ? "bg-green-100 text-green-800"
                              : tm.team.registrationStatus === "WAITLISTED"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {{
                              REGISTERED: "Registered",
                              WAITLISTED: "Waitlisted",
                              PENDING_PAYMENT: "Pending payment",
                              WITHDRAWN: "Withdrawn",
                            }[tm.team.registrationStatus] ?? tm.team.registrationStatus}
                          </span>
                          <Link
                            href={`/${orgSlug}/events/${tm.team.event.id}/team/${tm.team.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            View team
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Events</h2>
              {org.events.length === 0 ? (
                <p className="text-muted-foreground">No events yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {org.events.map((event) => {
                    const startDate = event.startDate ?? event.tournamentStartDate;
                    return (
                      <Link key={event.id} href={`/${orgSlug}/events/${event.id}`}>
                        <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-medium">{event.name}</CardTitle>
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                {STATUS_LABELS[event.status]}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs">
                              {event.type === "LEAGUE" ? "League" : "Tournament"}
                              {startDate && (
                                <>
                                  {" · "}
                                  {new Date(startDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </>
                              )}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold">Announcements</h2>
            {org.announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <div className="space-y-3">
                {org.announcements.map((a) => (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{a.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(a.postedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">{a.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
