"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
type DayOfWeek = (typeof DAYS)[number];

interface Timeslot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  courtId: string | null;
  court: { id: string; name: string; venue: { name: string } } | null;
}

interface GameSet {
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

interface Game {
  id: string;
  week: number | null;
  scheduledAt: string;
  status: string;
  isBye: boolean;
  homeTeam: { id: string; name: string } | null;
  awayTeam: { id: string; name: string } | null;
  court: { id: string; name: string } | null;
  sets: GameSet[];
}

interface Court {
  id: string;
  name: string;
  venue: { name: string };
}

export default function AdminSchedulePage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;

  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newSlot, setNewSlot] = useState<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    courtId: string;
  }>({ dayOfWeek: "MON", startTime: "18:00", courtId: "" });

  const [scoreEntry, setScoreEntry] = useState<
    Record<string, { homeScore: string; awayScore: string }>
  >({});
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<number>(1);

  const base = `/api/org/${orgSlug}/events/${eventId}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [slotsRes, gamesRes] = await Promise.all([
        fetch(`${base}/timeslots`),
        fetch(`${base}/games`),
      ]);
      const slotsData = await slotsRes.json();
      const gamesData = await gamesRes.json();
      setTimeslots(Array.isArray(slotsData) ? slotsData : []);
      setGames(Array.isArray(gamesData) ? gamesData : []);
    } catch {
      setError("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }, [base]);

  const fetchCourts = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${orgSlug}/venues`);
      const venues = await res.json();
      const allCourts: Court[] = [];
      if (Array.isArray(venues)) {
        for (const venue of venues) {
          const cr = await fetch(`/api/org/${orgSlug}/venues/${venue.id}/courts`);
          const courts = await cr.json();
          if (Array.isArray(courts)) {
            allCourts.push(
              ...courts.map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
                venue: { name: venue.name },
              })),
            );
          }
        }
      }
      setCourts(allCourts);
    } catch {
      // courts are optional
    }
  }, [orgSlug]);

  useEffect(() => {
    void fetchAll();
    void fetchCourts();
  }, [fetchAll, fetchCourts]);

  async function addTimeslot() {
    setError(null);
    const res = await fetch(`${base}/timeslots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: newSlot.dayOfWeek,
        startTime: newSlot.startTime,
        courtId: newSlot.courtId || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add timeslot");
      return;
    }
    setSuccess("Timeslot added");
    void fetchAll();
  }

  async function deleteTimeslot(id: string) {
    const res = await fetch(`${base}/timeslots/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete timeslot");
      return;
    }
    setSuccess("Timeslot removed");
    void fetchAll();
  }

  async function generateSchedule(force = false) {
    setGenerating(true);
    setError(null);
    const res = await fetch(`${base}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "GENERATE_LEAGUE", force }),
    });
    setGenerating(false);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 400 && data.error?.includes("already exist")) {
        if (
          confirm(
            "Games already exist. Regenerate? This will delete all existing games and scores.",
          )
        ) {
          await generateSchedule(true);
        }
      } else {
        setError(data.error ?? "Failed to generate schedule");
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

  const weeks = [...new Set(games.filter((g) => g.week).map((g) => g.week!))].sort(
    (a, b) => a - b,
  );
  const gamesThisWeek = games.filter((g) => g.week === activeWeek);
  const gamesExist = games.length > 0;

  if (loading) {
    return <p className="text-muted-foreground">Loading schedule...</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* Timeslots */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Timeslots</h2>

        {timeslots.length > 0 && (
          <table className="w-full text-sm border rounded-md overflow-hidden">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Day</th>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Court</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {timeslots.map((slot) => (
                <tr key={slot.id} className="border-t">
                  <td className="px-3 py-2">{slot.dayOfWeek}</td>
                  <td className="px-3 py-2">{slot.startTime}</td>
                  <td className="px-3 py-2">
                    {slot.court ? `${slot.court.venue.name} – ${slot.court.name}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => void deleteTimeslot(slot.id)}
                      className="text-destructive text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium">Day</label>
            <select
              value={newSlot.dayOfWeek}
              onChange={(e) =>
                setNewSlot((p) => ({ ...p, dayOfWeek: e.target.value as DayOfWeek }))
              }
              className="rounded-md border px-2 py-1 text-sm"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Time (HH:MM)</label>
            <input
              type="time"
              value={newSlot.startTime}
              onChange={(e) => setNewSlot((p) => ({ ...p, startTime: e.target.value }))}
              className="rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Court (optional)</label>
            <select
              value={newSlot.courtId}
              onChange={(e) => setNewSlot((p) => ({ ...p, courtId: e.target.value }))}
              className="rounded-md border px-2 py-1 text-sm"
            >
              <option value="">No specific court</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.venue.name} – {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void addTimeslot()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add timeslot
          </button>
        </div>
      </section>

      {/* Generate */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Schedule generation</h2>
        <p className="text-sm text-muted-foreground">
          Generates a round-robin schedule based on registered teams and timeslots above.
        </p>
        <button
          onClick={() => void generateSchedule(false)}
          disabled={generating || timeslots.length === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? "Generating…" : gamesExist ? "Regenerate schedule" : "Generate schedule"}
        </button>
      </section>

      {/* Weekly tabs + score entry */}
      {weeks.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Games</h2>

          <div className="flex gap-1 border-b">
            {weeks.map((w) => (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-md border border-b-0 ${
                  activeWeek === w ? "bg-background" : "bg-muted hover:bg-muted/70"
                }`}
              >
                Week {w}
              </button>
            ))}
          </div>

          <table className="w-full text-sm border rounded-md overflow-hidden">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date/Time</th>
                <th className="px-3 py-2 text-left">Court</th>
                <th className="px-3 py-2 text-left">Home</th>
                <th className="px-3 py-2 text-left">Away</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {gamesThisWeek.map((game) => {
                const isExpanded = expandedGame === game.id;
                const scoreStr =
                  game.sets.length > 0
                    ? game.sets.map((s) => `${s.homeScore}–${s.awayScore}`).join(", ")
                    : "—";

                return (
                  <>
                    <tr key={game.id} className="border-t">
                      <td className="px-3 py-2">
                        {new Date(game.scheduledAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{game.court?.name ?? "—"}</td>
                      <td className="px-3 py-2">{game.homeTeam?.name ?? "—"}</td>
                      <td className="px-3 py-2">
                        {game.isBye ? "BYE" : (game.awayTeam?.name ?? "—")}
                      </td>
                      <td className="px-3 py-2 font-mono">{scoreStr}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                            game.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : game.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {game.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!game.isBye && (
                          <button
                            onClick={() =>
                              setExpandedGame(isExpanded ? null : game.id)
                            }
                            className="text-xs text-primary hover:underline"
                          >
                            {isExpanded ? "Hide" : "Enter scores"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${game.id}_scores`} className="border-t bg-muted/20">
                        <td colSpan={7} className="px-3 py-3">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Enter set scores ({game.homeTeam?.name} vs{" "}
                              {game.awayTeam?.name})
                            </p>
                            {[1, 2, 3].map((setNum) => {
                              const key = `${game.id}_${setNum}`;
                              const existing = game.sets.find(
                                (s) => s.setNumber === setNum,
                              );
                              return (
                                <div
                                  key={setNum}
                                  className="flex items-center gap-2 flex-wrap"
                                >
                                  <span className="text-xs w-12">Set {setNum}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder={
                                      existing ? String(existing.homeScore) : "Home"
                                    }
                                    value={scoreEntry[key]?.homeScore ?? ""}
                                    onChange={(e) =>
                                      setScoreEntry((prev) => ({
                                        ...prev,
                                        [key]: {
                                          ...prev[key],
                                          homeScore: e.target.value,
                                          awayScore: prev[key]?.awayScore ?? "",
                                        },
                                      }))
                                    }
                                    className="w-16 rounded border px-2 py-1 text-sm"
                                  />
                                  <span className="text-xs">–</span>
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder={
                                      existing ? String(existing.awayScore) : "Away"
                                    }
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
                                    className="w-16 rounded border px-2 py-1 text-sm"
                                  />
                                  <button
                                    onClick={() => void submitScore(game.id, setNum)}
                                    disabled={
                                      !scoreEntry[key]?.homeScore ||
                                      !scoreEntry[key]?.awayScore
                                    }
                                    className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  {existing && (
                                    <span className="text-xs text-muted-foreground">
                                      Current: {existing.homeScore}–{existing.awayScore}
                                    </span>
                                  )}
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
              {gamesThisWeek.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground text-sm">
                    No games for week {activeWeek}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
