import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

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

  // Get current user's team if logged in
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

  // Fetch all scheduled/in-progress/completed games
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

  // Group games by week (league) or round (bracket)
  const weeks = [
    ...new Set(games.filter((g) => g.week).map((g) => g.week!)),
  ].sort((a, b) => a - b);

  const rounds = [
    ...new Set(games.filter((g) => g.round && !g.week).map((g) => g.round!)),
  ].sort((a, b) => a - b);

  const isLeague = event.type === "LEAGUE";

  function renderScoreString(sets: Array<{ homeScore: number; awayScore: number }>) {
    if (sets.length === 0) return null;
    return sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ");
  }

  function renderGamesTable(groupGames: typeof games) {
    return (
      <table className="w-full text-sm border rounded-md overflow-hidden">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Date / Time</th>
            <th className="px-3 py-2 text-left">Court</th>
            <th className="px-3 py-2 text-left">Home</th>
            <th className="px-3 py-2 text-left">Away</th>
            <th className="px-3 py-2 text-left">Score</th>
          </tr>
        </thead>
        <tbody>
          {groupGames.map((game) => {
            const isMyGame =
              myTeamId &&
              (game.homeTeam?.id === myTeamId || game.awayTeam?.id === myTeamId);
            const score = renderScoreString(game.sets);
            return (
              <tr
                key={game.id}
                className={`border-t ${isMyGame ? "bg-primary/5 font-medium" : ""}`}
              >
                <td className="px-3 py-2">
                  {new Date(game.scheduledAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-3 py-2">{game.court?.name ?? "—"}</td>
                <td className="px-3 py-2">{game.homeTeam?.name ?? "TBD"}</td>
                <td className="px-3 py-2">{game.awayTeam?.name ?? "TBD"}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {score ?? (game.status === "SCHEDULED" ? "—" : game.status)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{org.name}</p>
          <h1 className="text-2xl font-bold">{event.name} – Schedule</h1>
          {myTeamId && (
            <p className="text-sm text-muted-foreground">
              Your games are highlighted.
            </p>
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
                  {renderGamesTable(weekGames)}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pool play games (no round or week, no bracketSide) */}
            {(() => {
              const poolGames = games.filter((g) => !g.week && !g.round);
              return poolGames.length > 0 ? (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">Pool Play</h2>
                  {renderGamesTable(poolGames)}
                </section>
              ) : null;
            })()}

            {/* Bracket rounds */}
            {rounds.map((round) => {
              const roundGames = games.filter((g) => g.round === round && !g.week);
              return (
                <section key={round} className="space-y-3">
                  <h2 className="text-lg font-semibold">Round {round}</h2>
                  {renderGamesTable(roundGames)}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
