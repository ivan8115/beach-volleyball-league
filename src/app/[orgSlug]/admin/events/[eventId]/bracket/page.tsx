"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GameSet {
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

interface Game {
  id: string;
  round: number | null;
  position: number | null;
  bracketSide: "WINNERS" | "LOSERS" | "GRAND_FINAL" | null;
  status: string;
  isBracketBye: boolean;
  isBracketReset: boolean;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeam: { id: string; name: string } | null;
  awayTeam: { id: string; name: string } | null;
  court: { id: string; name: string } | null;
  scheduledAt: string;
  sets: GameSet[];
  nextGameId: string | null;
}

export default function AdminBracketPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [scoreEntry, setScoreEntry] = useState<
    Record<string, { homeScore: string; awayScore: string }>
  >({});
  const [activeView, setActiveView] = useState<"bracket" | "pool">("bracket");

  const base = `/api/org/${orgSlug}/events/${eventId}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/games`);
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load games");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function generate(action: string, force = false) {
    setGenerating(true);
    setError(null);
    const res = await fetch(`${base}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, force }),
    });
    setGenerating(false);
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.includes("already exist")) {
        if (confirm("Already exists. Regenerate? This will delete all existing games and scores.")) {
          await generate(action, true);
        }
      } else {
        setError(data.error ?? "Failed");
      }
      return;
    }
    setSuccess(`Generated ${data.created} games`);
    void fetchAll();
  }

  async function submitScore(gameId: string, setNumber: number) {
    const key = `${gameId}_${setNumber}`;
    const entry = scoreEntry[key];
    if (!entry) return;
    setError(null);

    const res = await fetch(`${base}/games/${gameId}/sets/${setNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore: parseInt(entry.homeScore),
        awayScore: parseInt(entry.awayScore),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save score");
      return;
    }
    setSuccess("Score saved");
    setScoreEntry((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    void fetchAll();
  }

  const bracketGames = games.filter((g) => g.bracketSide !== null);
  const poolGames = games.filter((g) => g.bracketSide === null && !g.isBracketBye);

  const wbRounds = [...new Set(
    bracketGames.filter((g) => g.bracketSide === "WINNERS").map((g) => g.round ?? 0)
  )].sort((a, b) => a - b);

  const lbRounds = [...new Set(
    bracketGames.filter((g) => g.bracketSide === "LOSERS").map((g) => g.round ?? 0)
  )].sort((a, b) => a - b);

  const grandFinalGames = bracketGames
    .filter((g) => g.bracketSide === "GRAND_FINAL")
    .sort((a, b) => (a.round ?? 0) - (b.round ?? 0));

  function setsWon(sets: GameSet[]) {
    let h = 0, a = 0;
    for (const s of sets) { if (s.homeScore > s.awayScore) h++; else a++; }
    return { home: h, away: a };
  }

  function getRoundLabel(round: number, totalRounds: number) {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semifinals";
    if (round === totalRounds - 2) return "Quarterfinals";
    return `Round ${round}`;
  }

  function renderScoreEntry(game: Game) {
    return (
      <div className="mt-3 space-y-2 border-t pt-3">
        {[1, 2, 3].map((setNum) => {
          const key = `${game.id}_${setNum}`;
          const existing = game.sets.find((s) => s.setNumber === setNum);
          return (
            <div key={setNum} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10">Set {setNum}</span>
              <input
                type="number"
                min={0}
                placeholder={existing ? String(existing.homeScore) : "H"}
                value={scoreEntry[key]?.homeScore ?? ""}
                onChange={(e) =>
                  setScoreEntry((prev) => ({
                    ...prev,
                    [key]: { homeScore: e.target.value, awayScore: prev[key]?.awayScore ?? "" },
                  }))
                }
                className="w-14 rounded-md border px-2 py-1 text-sm text-center"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="number"
                min={0}
                placeholder={existing ? String(existing.awayScore) : "A"}
                value={scoreEntry[key]?.awayScore ?? ""}
                onChange={(e) =>
                  setScoreEntry((prev) => ({
                    ...prev,
                    [key]: { homeScore: prev[key]?.homeScore ?? "", awayScore: e.target.value },
                  }))
                }
                className="w-14 rounded-md border px-2 py-1 text-sm text-center"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void submitScore(game.id, setNum)}
                disabled={!scoreEntry[key]?.homeScore || !scoreEntry[key]?.awayScore}
                className="h-7 text-xs"
              >
                Save
              </Button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderBracketGame(game: Game) {
    const isExpanded = expandedGame === game.id;
    const { home: hWins, away: aWins } = setsWon(game.sets);
    const completed = game.status === "COMPLETED";
    const hWon = completed && hWins > aWins;
    const aWon = completed && aWins > hWins;
    const scoreStr = game.sets.length > 0
      ? game.sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ")
      : null;

    return (
      <div
        key={game.id}
        className={`rounded-lg border p-3 w-[220px] shrink-0 ${
          completed
            ? "bg-green-50/60 border-green-200"
            : game.status === "IN_PROGRESS"
              ? "bg-blue-50/60 border-blue-200"
              : "bg-background"
        }`}
      >
        {/* Home team */}
        <div className={`flex items-center justify-between gap-2 ${hWon ? "font-semibold" : ""}`}>
          <span className={`text-sm truncate ${hWon ? "text-green-700" : game.homeTeam ? "" : "text-muted-foreground"}`}>
            {game.homeTeam?.name ?? "TBD"}
          </span>
          {completed && (
            <span className="text-xs font-mono shrink-0 text-muted-foreground">{hWins}</span>
          )}
        </div>

        {/* Score or vs */}
        <div className="my-1 text-center">
          {scoreStr ? (
            <span className="text-xs font-mono text-muted-foreground">{scoreStr}</span>
          ) : (
            <span className="text-xs text-muted-foreground">vs</span>
          )}
        </div>

        {/* Away team */}
        <div className={`flex items-center justify-between gap-2 ${aWon ? "font-semibold" : ""}`}>
          <span className={`text-sm truncate ${aWon ? "text-green-700" : game.isBracketBye ? "text-muted-foreground italic" : game.awayTeam ? "" : "text-muted-foreground"}`}>
            {game.isBracketBye ? "BYE" : (game.awayTeam?.name ?? "TBD")}
          </span>
          {completed && (
            <span className="text-xs font-mono shrink-0 text-muted-foreground">{aWins}</span>
          )}
        </div>

        {/* Score entry toggle */}
        {!game.isBracketBye && game.homeTeam && game.awayTeam && (
          <button
            onClick={() => setExpandedGame(isExpanded ? null : game.id)}
            className="mt-2 text-xs text-primary hover:underline w-full text-left"
          >
            {isExpanded ? "Close" : completed ? "Edit scores" : "Enter scores"}
          </button>
        )}
        {isExpanded && renderScoreEntry(game)}

        {/* Reset badge */}
        {game.isBracketReset && (
          <Badge variant="outline" className="mt-2 text-xs">Reset game</Badge>
        )}
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading bracket...</p>;

  const maxWbRound = wbRounds.length > 0 ? Math.max(...wbRounds) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void generate("GENERATE_POOL_PLAY")}
          disabled={generating}
        >
          {generating ? "Generating..." : "Generate pool play"}
        </Button>
        <Button
          size="sm"
          onClick={() => void generate("GENERATE_BRACKET")}
          disabled={generating}
        >
          {generating ? "Generating..." : bracketGames.length > 0 ? "Regenerate bracket" : "Generate bracket"}
        </Button>
      </div>

      {/* View tabs */}
      {(bracketGames.length > 0 || poolGames.length > 0) && (
        <div className="flex gap-1 border-b">
          {poolGames.length > 0 && (
            <button
              onClick={() => setActiveView("pool")}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 ${activeView === "pool" ? "bg-background" : "bg-muted text-muted-foreground"}`}
            >
              Pool play
            </button>
          )}
          {bracketGames.length > 0 && (
            <button
              onClick={() => setActiveView("bracket")}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 ${activeView === "bracket" ? "bg-background" : "bg-muted text-muted-foreground"}`}
            >
              Bracket
            </button>
          )}
        </div>
      )}

      {/* Pool play view */}
      {activeView === "pool" && poolGames.length > 0 && (
        <div className="space-y-2">
          {poolGames.map((game) => {
            const isExpanded = expandedGame === game.id;
            const scoreStr = game.sets.length > 0
              ? game.sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ")
              : null;
            return (
              <div key={game.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{game.homeTeam?.name ?? "—"}</span>
                    <span className="text-muted-foreground mx-2 text-xs">vs</span>
                    <span className="text-sm">{game.awayTeam?.name ?? "—"}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {scoreStr ? (
                      <span className="font-mono text-sm">{scoreStr}</span>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {game.status === "SCHEDULED" ? "Upcoming" : game.status.toLowerCase()}
                      </Badge>
                    )}
                    <button
                      onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      {isExpanded ? "Close" : "Scores"}
                    </button>
                  </div>
                </div>
                {isExpanded && renderScoreEntry(game)}
              </div>
            );
          })}
        </div>
      )}

      {/* Bracket view */}
      {activeView === "bracket" && bracketGames.length > 0 && (
        <div className="space-y-8">
          {/* Winners bracket */}
          {wbRounds.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Winners bracket
              </h3>
              <div className="flex gap-6 overflow-x-auto pb-4">
                {wbRounds.map((round) => {
                  const roundGames = bracketGames
                    .filter((g) => g.bracketSide === "WINNERS" && g.round === round)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                  return (
                    <div key={round} className="flex flex-col gap-4 shrink-0">
                      <p className="text-xs font-semibold text-muted-foreground text-center">
                        {getRoundLabel(round, maxWbRound)}
                      </p>
                      <div className="flex flex-col gap-4 justify-around flex-1">
                        {roundGames.map(renderBracketGame)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Losers bracket */}
          {lbRounds.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Losers bracket
              </h3>
              <div className="flex gap-6 overflow-x-auto pb-4">
                {lbRounds.map((round) => {
                  const roundGames = bracketGames
                    .filter((g) => g.bracketSide === "LOSERS" && g.round === round)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                  return (
                    <div key={round} className="flex flex-col gap-4 shrink-0">
                      <p className="text-xs font-semibold text-muted-foreground text-center">
                        LB Round {round}
                      </p>
                      <div className="flex flex-col gap-4 justify-around flex-1">
                        {roundGames.map(renderBracketGame)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grand final */}
          {grandFinalGames.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Grand final
              </h3>
              <div className="flex gap-6">
                {grandFinalGames.map(renderBracketGame)}
              </div>
            </div>
          )}
        </div>
      )}

      {bracketGames.length === 0 && poolGames.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No games generated yet. Use the buttons above to generate pool play or bracket games.
        </p>
      )}
    </div>
  );
}
