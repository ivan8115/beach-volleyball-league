import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-muted text-muted-foreground",
};

export default async function PublicSchedulePage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true },
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
    select: { id: true, name: true, type: true, status: true },
  });
  if (!event) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let myTeamId: string | null = null;

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true },
    });
    if (dbUser) {
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId: dbUser.id,
          team: { eventId, deletedAt: null },
          deletedAt: null,
        },
        select: { teamId: true },
      });
      myTeamId = teamMember?.teamId ?? null;
    }
  }

  const games = await prisma.game.findMany({
    where: {
      eventId,
      deletedAt: null,
      status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
      isBye: false,
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      court: { select: { id: true, name: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: [{ week: "asc" }, { round: "asc" }, { scheduledAt: "asc" }],
  });

  const weeks = [...new Set(games.filter((g) => g.week).map((g) => g.week!))].sort((a, b) => a - b);
  const rounds = [...new Set(games.filter((g) => g.round && !g.week).map((g) => g.round!))].sort((a, b) => a - b);
  const isLeague = event.type === "LEAGUE";

  function scoreString(sets: Array<{ homeScore: number; awayScore: number }>) {
    if (sets.length === 0) return null;
    return sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ");
  }

  function homeWon(sets: Array<{ homeScore: number; awayScore: number }>) {
    let h = 0, a = 0;
    for (const s of sets) { if (s.homeScore > s.awayScore) h++; else a++; }
    return h > a;
  }

  function renderGameCards(groupGames: typeof games) {
    return (
      <div className="space-y-2">
        {groupGames.map((game) => {
          const isMyGame = myTeamId && (game.homeTeam?.id === myTeamId || game.awayTeam?.id === myTeamId);
          const score = scoreString(game.sets);
          const completed = game.status === "COMPLETED" && game.sets.length > 0;
          const hWon = completed && homeWon(game.sets);

          return (
            <div
              key={game.id}
              className={`rounded-lg border p-3 ${isMyGame ? "ring-2 ring-primary/30 bg-primary/5" : ""}`}
            >
              {/* Teams & Score */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${completed && hWon ? "font-semibold" : ""}`}>
                      {game.homeTeam ? (
                        <Link
                          href={`/${orgSlug}/events/${eventId}/team/${game.homeTeam.id}`}
                          className="hover:underline"
                        >
                          {game.homeTeam.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">TBD</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${completed && !hWon ? "font-semibold" : ""}`}>
                      {game.awayTeam ? (
                        <Link
                          href={`/${orgSlug}/events/${eventId}/team/${game.awayTeam.id}`}
                          className="hover:underline"
                        >
                          {game.awayTeam.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">TBD</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Score or status */}
                <div className="shrink-0 text-right">
                  {score ? (
                    <span className="font-mono text-sm">{score}</span>
                  ) : (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[game.status] ?? ""}`}>
                      {game.status === "SCHEDULED" ? "Upcoming" : game.status === "IN_PROGRESS" ? "Live" : game.status.toLowerCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {new Date(game.scheduledAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {game.court && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <span>{game.court.name}</span>
                  </>
                )}
                {completed && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="text-green-600">Final</span>
                  </>
                )}
                {game.status === "IN_PROGRESS" && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="text-blue-600 font-medium">In progress</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        <div className="space-y-1">
          <Link
            href={`/${orgSlug}/events/${eventId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {event.name}
          </Link>
          <h1 className="text-2xl font-bold">Schedule</h1>
          {myTeamId && (
            <p className="text-sm text-primary">Your games are highlighted.</p>
          )}
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games scheduled yet.</p>
        ) : isLeague ? (
          <div className="space-y-8">
            {weeks.map((week) => {
              const weekGames = games.filter((g) => g.week === week);
              return (
                <section key={week} className="space-y-3">
                  <h2 className="text-lg font-semibold">Week {week}</h2>
                  {renderGameCards(weekGames)}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {(() => {
              const poolGames = games.filter((g) => !g.week && !g.round);
              return poolGames.length > 0 ? (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">Pool Play</h2>
                  {renderGameCards(poolGames)}
                </section>
              ) : null;
            })()}

            {rounds.map((round) => {
              const roundGames = games.filter((g) => g.round === round && !g.week);
              return (
                <section key={round} className="space-y-3">
                  <h2 className="text-lg font-semibold">Round {round}</h2>
                  {renderGameCards(roundGames)}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
