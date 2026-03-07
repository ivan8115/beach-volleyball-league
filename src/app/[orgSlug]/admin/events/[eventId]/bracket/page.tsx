"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

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

interface Pool {
  id: string;
  name: string;
  poolTeams: Array<{ teamId: string; team: { name: string } }>;
}

export default function AdminBracketPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;

  const [games, setGames] = useState<Game[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
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

  async function generateBracket(force = false) {
    setGenerating(true);
    setError(null);
    const res = await fetch(`${base}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "GENERATE_BRACKET", force }),
    });
    setGenerating(false);
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.includes("already exist")) {
        if (confirm("Bracket already exists. Regenerate? This will delete all existing bracket games and scores.")) {
          await generateBracket(true);
        }
      } else {
        setError(data.error ?? "Failed to generate bracket");
      }
      return;
    }
    setSuccess(`Generated ${data.created} bracket games`);
    void fetchAll();
  }

  async function generatePoolPlay(force = false) {
    setGenerating(true);
    setError(null);
    const res = await fetch(`${base}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "GENERATE_POOL_PLAY", force }),
    });
    setGenerating(false);
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.includes("already exist")) {
        if (confirm("Pool games already exist. Regenerate?")) {
          await generatePoolPlay(true);
        }
      } else {
        setError(data.error ?? "Failed to generate pool play");
      }
      return;
    }
    setSuccess(`Generated ${data.created} pool games`);
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

  // Group bracket games by round and side
  const wbRounds = [...new Set(
    bracketGames.filter((g) => g.bracketSide === "WINNERS").map((g) => g.round ?? 0)
  )].sort((a, b) => a - b);

  const lbRounds = [...new Set(
    bracketGames.filter((g) => g.bracketSide === "LOSERS").map((g) => g.round ?? 0)
  )].sort((a, b) => a - b);

  const grandFinalGames = bracketGames.filter((g) => g.bracketSide === "GRAND_FINAL");

  function renderGame(game: Game) {
    const isExpanded = expandedGame === game.id;
    const scoreStr =
      game.sets.length > 0
        ? game.sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ")
        : null;

    return (
      <div
        key={game.id}
        className={`rounded-md border p-2 text-xs min-w-[140px] ${
          game.status === "COMPLETED"
            ? "bg-green-50 border-green-200"
            : game.status === "IN_PROGRESS"
              ? "bg-blue-50 border-blue-200"
              : "bg-background"
        }`}
      >
        <div className="space-y-0.5">
          <div className={`font-medium truncate ${game.sets.length > 0 && game.sets.reduce((acc, s) => acc + (s.homeScore > s.awayScore ? 1 : 0), 0) > game.sets.reduce((acc, s) => acc + (s.awayScore > s.homeScore ? 1 : 0), 0) ? "text-green-700" : ""}`}>
            {game.homeTeam?.name ?? "TBD"}
          </div>
          <div className="text-muted-foreground text-center text-[10px]">
            {scoreStr ?? "vs"}
          </div>
          <div className={`font-medium truncate ${game.sets.length > 0 && game.sets.reduce((acc, s) => acc + (s.awayScore > s.homeScore ? 1 : 0), 0) > game.sets.reduce((acc, s) => acc + (s.homeScore > s.awayScore ? 1 : 0), 0) ? "text-green-700" : ""}`}>
            {game.isBracketBye ? "BYE" : (game.awayTeam?.name ?? "TBD")}
          </div>
        </div>
        {!game.isBracketBye && game.bracketSide !== null && (
          <button
            onClick={() => setExpandedGame(isExpanded ? null : game.id)}
            className="mt-1 text-[10px] text-primary hover:underline w-full text-left"
          >
            {isExpanded ? "Close" : "Enter scores"}
          </button>
        )}
        {isExpanded && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {[1, 2, 3].map((setNum) => {
              const key = `${game.id}_${setNum}`;
              const existing = game.sets.find((s) => s.setNumber === setNum);
              return (
                <div key={setNum} className="flex items-center gap-1">
                  <span className="text-[10px] w-8">Set {setNum}</span>
                  <input
                    type="number"
                    min={0}
                    placeholder={existing ? String(existing.homeScore) : "H"}
                    value={scoreEntry[key]?.homeScore ?? ""}
                    onChange={(e) =>
                      setScoreEntry((prev) => ({
                        ...prev,
                        [key]: {
                          homeScore: e.target.value,
                          awayScore: prev[key]?.awayScore ?? "",
                        },
                      }))
                    }
                    className="w-10 rounded border px-1 py-0.5 text-xs"
                  />
                  <span className="text-[10px]">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder={existing ? String(existing.awayScore) : "A"}
                    value={scoreEntry[key]?.awayScore ?? ""}
                    onChange={(e) =>
                      setScoreEntry((prev) => ({
                        ...prev,
                        [key]: {
                          homeScore: prev[key]?.homeScore ?? "",
                          awayScore: e.target.value,
                        },
                      }))
                    }
                    className="w-10 rounded border px-1 py-0.5 text-xs"
                  />
                  <button
                    onClick={() => void submitScore(game.id, setNum)}
                    disabled={!scoreEntry[key]?.homeScore || !scoreEntry[key]?.awayScore}
                    className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading bracket...</p>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => void generatePoolPlay(false)}
          disabled={generating}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate pool play"}
        </button>
        <button
          onClick={() => void generateBracket(false)}
          disabled={generating}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? "Generating…" : bracketGames.length > 0 ? "Regenerate bracket" : "Generate bracket"}
        </button>
      </div>

      {/* View tabs */}
      {(bracketGames.length > 0 || poolGames.length > 0) && (
        <div className="flex gap-1 border-b">
          {poolGames.length > 0 && (
            <button
              onClick={() => setActiveView("pool")}
              className={`px-3 py-1.5 text-sm font-medium rounded-t-md border border-b-0 ${activeView === "pool" ? "bg-background" : "bg-muted"}`}
            >
              Pool play
            </button>
          )}
          {bracketGames.length > 0 && (
            <button
              onClick={() => setActiveView("bracket")}
              className={`px-3 py-1.5 text-sm font-medium rounded-t-md border border-b-0 ${activeView === "bracket" ? "bg-background" : "bg-muted"}`}
            >
              Bracket
            </button>
          )}
        </div>
      )}

      {/* Pool play view */}
      {activeView === "pool" && poolGames.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Pool Play</h2>
          <table className="w-full text-sm border rounded-md overflow-hidden">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date/Time</th>
                <th className="px-3 py-2 text-left">Home</th>
                <th className="px-3 py-2 text-left">Away</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {poolGames.map((game) => {
                const isExpanded = expandedGame === game.id;
                const scoreStr =
                  game.sets.length > 0
                    ? game.sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ")
                    : "—";
                return (
                  <>
                    <tr key={game.id} className="border-t">
                      <td className="px-3 py-2">{new Date(game.scheduledAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{game.homeTeam?.name ?? "—"}</td>
                      <td className="px-3 py-2">{game.awayTeam?.name ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{scoreStr}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${game.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {game.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          {isExpanded ? "Hide" : "Enter scores"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${game.id}_score`} className="border-t bg-muted/20">
                        <td colSpan={6} className="px-3 py-3">
                          <div className="flex flex-wrap gap-3">
                            {[1, 2, 3].map((setNum) => {
                              const key = `${game.id}_${setNum}`;
                              const existing = game.sets.find((s) => s.setNumber === setNum);
                              return (
                                <div key={setNum} className="flex items-center gap-1">
                                  <span className="text-xs">Set {setNum}:</span>
                                  <input type="number" min={0} placeholder={existing ? String(existing.homeScore) : "H"} value={scoreEntry[key]?.homeScore ?? ""} onChange={(e) => setScoreEntry((prev) => ({ ...prev, [key]: { homeScore: e.target.value, awayScore: prev[key]?.awayScore ?? "" } }))} className="w-14 rounded border px-1.5 py-1 text-sm" />
                                  <span>–</span>
                                  <input type="number" min={0} placeholder={existing ? String(existing.awayScore) : "A"} value={scoreEntry[key]?.awayScore ?? ""} onChange={(e) => setScoreEntry((prev) => ({ ...prev, [key]: { homeScore: prev[key]?.homeScore ?? "", awayScore: e.target.value } }))} className="w-14 rounded border px-1.5 py-1 text-sm" />
                                  <button onClick={() => void submitScore(game.id, setNum)} disabled={!scoreEntry[key]?.homeScore || !scoreEntry[key]?.awayScore} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50">Save</button>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bracket view */}
      {activeView === "bracket" && bracketGames.length > 0 && (
        <div className="space-y-6">
          {/* Winners bracket */}
          {wbRounds.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Winners bracket</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {wbRounds.map((round) => {
                  const roundGames = bracketGames
                    .filter((g) => g.bracketSide === "WINNERS" && g.round === round)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                  return (
                    <div key={round} className="flex flex-col gap-3 min-w-[150px]">
                      <p className="text-xs text-muted-foreground font-medium">Round {round}</p>
                      {roundGames.map(renderGame)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Losers bracket */}
          {lbRounds.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Losers bracket</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {lbRounds.map((round) => {
                  const roundGames = bracketGames
                    .filter((g) => g.bracketSide === "LOSERS" && g.round === round)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                  return (
                    <div key={round} className="flex flex-col gap-3 min-w-[150px]">
                      <p className="text-xs text-muted-foreground font-medium">LB Round {round}</p>
                      {roundGames.map(renderGame)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grand final */}
          {grandFinalGames.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Grand final</h3>
              <div className="flex gap-4">
                {grandFinalGames.map(renderGame)}
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
