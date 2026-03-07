"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface StandingsEntry {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsPlayed: number;
  pointsScored: number;
  pointsAgainst: number;
  pointsPlayed: number;
  setRatio: number;
  pointRatio: number;
}

interface Division {
  id: string;
  name: string;
}

export default function AdminStandingsPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;

  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPlayoffDialog, setShowPlayoffDialog] = useState(false);
  const [bracketType, setBracketType] = useState<"SINGLE_ELIM" | "DOUBLE_ELIM">("SINGLE_ELIM");

  const base = `/api/org/${orgSlug}/events/${eventId}`;

  const fetchDivisions = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${orgSlug}/events/${eventId}`);
      const data = await res.json();
      if (data?.divisions) setDivisions(data.divisions);
    } catch {
      // ignore
    }
  }, [orgSlug, eventId]);

  const fetchStandings = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedDivision
        ? `${base}/standings?divisionId=${selectedDivision}`
        : `${base}/standings`;
      const res = await fetch(url);
      const data = await res.json();
      setStandings(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load standings");
    } finally {
      setLoading(false);
    }
  }, [base, selectedDivision]);

  useEffect(() => {
    void fetchDivisions();
  }, [fetchDivisions]);

  useEffect(() => {
    void fetchStandings();
  }, [fetchStandings]);

  async function generatePlayoffs() {
    setGenerating(true);
    setError(null);
    setShowPlayoffDialog(false);

    // First, seed teams based on current standings
    const seedData = standings.map((entry, idx) => ({
      teamId: entry.teamId,
      seed: idx + 1,
    }));

    // Save seeds via team seed endpoint (we'll use the games API directly)
    const res = await fetch(`${base}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "GENERATE_BRACKET",
        divisionId: selectedDivision || undefined,
        bracketType,
        seeds: seedData,
      }),
    });

    setGenerating(false);
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.includes("already exist")) {
        if (confirm("Bracket already exists. Regenerate?")) {
          setGenerating(true);
          const r2 = await fetch(`${base}/games`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "GENERATE_BRACKET",
              force: true,
              divisionId: selectedDivision || undefined,
              bracketType,
            }),
          });
          setGenerating(false);
          const d2 = await r2.json();
          if (!r2.ok) setError(d2.error ?? "Failed");
          else setSuccess(`Generated ${d2.created} bracket games`);
        }
      } else {
        setError(data.error ?? "Failed to generate playoffs");
      }
      return;
    }
    setSuccess(`Generated ${data.created} playoff bracket games`);
  }

  if (loading) return <p className="text-muted-foreground">Loading standings...</p>;

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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Standings</h2>
        <div className="flex items-center gap-3">
          {divisions.length > 0 && (
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
            >
              <option value="">All divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowPlayoffDialog(true)}
            disabled={standings.length === 0}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Generate playoffs
          </button>
        </div>
      </div>

      {showPlayoffDialog && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="font-semibold">Generate Playoff Bracket</h3>
          <p className="text-sm text-muted-foreground">
            Teams will be seeded in current standings order. This will create a bracket in the
            Bracket tab.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bracket type</label>
            <select
              value={bracketType}
              onChange={(e) =>
                setBracketType(e.target.value as "SINGLE_ELIM" | "DOUBLE_ELIM")
              }
              className="rounded-md border px-2 py-1.5 text-sm w-full"
            >
              <option value="SINGLE_ELIM">Single elimination</option>
              <option value="DOUBLE_ELIM">Double elimination</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void generatePlayoffs()}
              disabled={generating}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {generating ? "Generating…" : "Confirm"}
            </button>
            <button
              onClick={() => setShowPlayoffDialog(false)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {standings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No standings yet. Standings are calculated from completed games.
        </p>
      ) : (
        <table className="w-full text-sm border rounded-md overflow-hidden">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-center">W</th>
              <th className="px-3 py-2 text-center">L</th>
              <th className="px-3 py-2 text-center">Sets W–L</th>
              <th className="px-3 py-2 text-center">Set %</th>
              <th className="px-3 py-2 text-center">Pts</th>
              <th className="px-3 py-2 text-center">Pts %</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry, idx) => (
              <tr key={entry.teamId} className="border-t">
                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-2 font-medium">{entry.teamName}</td>
                <td className="px-3 py-2 text-center">{entry.wins}</td>
                <td className="px-3 py-2 text-center">{entry.losses}</td>
                <td className="px-3 py-2 text-center">
                  {entry.setsWon}–{entry.setsLost}
                </td>
                <td className="px-3 py-2 text-center">
                  {(entry.setRatio * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-center">
                  {entry.pointsScored}–{entry.pointsAgainst}
                </td>
                <td className="px-3 py-2 text-center">
                  {(entry.pointRatio * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
