"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type GameSet = { setNumber: number; homeScore: number; awayScore: number };

export type LiveGame = {
  id: string;
  status: string;
  week: number | null;
  round: number | null;
  scheduledAt: Date | string;
  homeTeam: { id: string; name: string } | null;
  awayTeam: { id: string; name: string } | null;
  court: { id: string; name: string } | null;
  sets: GameSet[];
};

interface Props {
  initialGames: LiveGame[];
  myTeamId: string | null;
  orgSlug: string;
  eventId: string;
  isLeague: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-muted text-muted-foreground",
};

function scoreString(sets: GameSet[]) {
  if (sets.length === 0) return null;
  return sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ");
}

function homeWon(sets: GameSet[]) {
  let h = 0,
    a = 0;
  for (const s of sets) {
    if (s.homeScore > s.awayScore) h++;
    else a++;
  }
  return h > a;
}

export function LiveScheduleView({
  initialGames,
  myTeamId,
  orgSlug,
  eventId,
  isLeague,
}: Props) {
  const [games, setGames] = useState<LiveGame[]>(initialGames);

  const liveCount = games.filter((g) => g.status === "IN_PROGRESS").length;

  useEffect(() => {
    const supabase = createClient();
    const gameIdSet = new Set(initialGames.map((g) => g.id));

    const channel = supabase
      .channel(`schedule-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "GameSet" },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          const gameId = record?.gameId as string | undefined;
          if (!gameId || !gameIdSet.has(gameId)) return;

          const setNumber = record?.setNumber as number;
          const homeScore = record?.homeScore as number;
          const awayScore = record?.awayScore as number;

          setGames((prev) =>
            prev.map((game) => {
              if (game.id !== gameId) return game;
              const idx = game.sets.findIndex((s) => s.setNumber === setNumber);
              const newSets = [...game.sets];
              if (idx >= 0) {
                newSets[idx] = { setNumber, homeScore, awayScore };
              } else {
                newSets.push({ setNumber, homeScore, awayScore });
                newSets.sort((a, b) => a.setNumber - b.setNumber);
              }
              return { ...game, sets: newSets };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Game" },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          const id = record?.id as string | undefined;
          const status = record?.status as string | undefined;
          if (!id || !gameIdSet.has(id) || !status) return;
          setGames((prev) =>
            prev.map((g) => (g.id === id ? { ...g, status } : g))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, initialGames]);

  function renderGameCards(groupGames: LiveGame[]) {
    return (
      <div className="space-y-2">
        {groupGames.map((game) => {
          const isMyGame =
            myTeamId &&
            (game.homeTeam?.id === myTeamId || game.awayTeam?.id === myTeamId);
          const score = scoreString(game.sets);
          const completed =
            game.status === "COMPLETED" && game.sets.length > 0;
          const hWon = completed && homeWon(game.sets);
          const isLive = game.status === "IN_PROGRESS";

          return (
            <div
              key={game.id}
              className={`rounded-lg border p-3 ${isMyGame ? "ring-2 ring-primary/30 bg-primary/5" : ""} ${isLive ? "border-blue-200" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm truncate ${completed && hWon ? "font-semibold" : ""}`}
                    >
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
                    <span
                      className={`text-sm truncate ${completed && !hWon ? "font-semibold" : ""}`}
                    >
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

                <div className="shrink-0 text-right">
                  {score ? (
                    <span className="font-mono text-sm">{score}</span>
                  ) : (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[game.status] ?? ""}`}
                    >
                      {game.status === "SCHEDULED"
                        ? "Upcoming"
                        : game.status === "IN_PROGRESS"
                          ? "Live"
                          : game.status.toLowerCase()}
                    </span>
                  )}
                </div>
              </div>

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
                {isLive && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="text-blue-600 font-medium animate-pulse">
                      ● Live
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const weeks = [
    ...new Set(games.filter((g) => g.week).map((g) => g.week!)),
  ].sort((a, b) => a - b);
  const rounds = [
    ...new Set(
      games.filter((g) => g.round && !g.week).map((g) => g.round!)
    ),
  ].sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      {liveCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
          <span className="animate-pulse">●</span>
          <span>{liveCount} game{liveCount > 1 ? "s" : ""} live</span>
        </div>
      )}

      {isLeague ? (
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
            const roundGames = games.filter(
              (g) => g.round === round && !g.week
            );
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
  );
}
