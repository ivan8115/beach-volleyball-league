"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Player {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
}

interface StatRow {
  kills: string;
  aces: string;
  digs: string;
  blocks: string;
  errors: string;
}

interface ExistingStat {
  userId: string;
  kills: number;
  aces: number;
  digs: number;
  blocks: number;
  errors: number;
  user: { id: string; name: string };
  team: { id: string; name: string };
}

interface Props {
  orgSlug: string;
  eventId: string;
  gameId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

const STAT_COLS: { key: keyof StatRow; label: string }[] = [
  { key: "kills", label: "K" },
  { key: "aces", label: "A" },
  { key: "digs", label: "D" },
  { key: "blocks", label: "B" },
  { key: "errors", label: "E" },
];

export function GameStatsEntry({ orgSlug, eventId, gameId, homeTeamId, awayTeamId }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rows, setRows] = useState<Record<string, StatRow>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const base = `/api/org/${orgSlug}/events/${eventId}`;

  useEffect(() => {
    if (!open) return;

    async function load() {
      const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];
      const [membersResults, existingStats] = await Promise.all([
        Promise.all(
          teamIds.map((tid) =>
            fetch(`${base}/teams/${tid}`)
              .then((r) => r.json())
              .then((t: { name: string; members: Array<{ user: { id: string; name: string }; deletedAt: string | null }> }) =>
                (t.members ?? [])
                  .filter((m) => !m.deletedAt)
                  .map((m) => ({ id: m.user.id, name: m.user.name, teamId: tid, teamName: t.name }))
              )
          )
        ),
        fetch(`${base}/games/${gameId}/stats`).then((r) => r.json()) as Promise<ExistingStat[]>,
      ]);

      const allPlayers = membersResults.flat();
      setPlayers(allPlayers);

      // Pre-fill rows from existing stats
      const initialRows: Record<string, StatRow> = {};
      for (const p of allPlayers) {
        const existing = Array.isArray(existingStats)
          ? existingStats.find((s) => s.userId === p.id)
          : undefined;
        initialRows[p.id] = {
          kills: String(existing?.kills ?? 0),
          aces: String(existing?.aces ?? 0),
          digs: String(existing?.digs ?? 0),
          blocks: String(existing?.blocks ?? 0),
          errors: String(existing?.errors ?? 0),
        };
      }
      setRows(initialRows);
    }

    void load();
  }, [open, base, gameId, homeTeamId, awayTeamId]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload = players.map((p) => ({
      userId: p.id,
      teamId: p.teamId,
      kills: parseInt(rows[p.id]?.kills ?? "0") || 0,
      aces: parseInt(rows[p.id]?.aces ?? "0") || 0,
      digs: parseInt(rows[p.id]?.digs ?? "0") || 0,
      blocks: parseInt(rows[p.id]?.blocks ?? "0") || 0,
      errors: parseInt(rows[p.id]?.errors ?? "0") || 0,
    }));

    const res = await fetch(`${base}/games/${gameId}/stats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to save stats");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!homeTeamId && !awayTeamId) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-primary hover:underline"
      >
        {open ? "Hide stats" : "Enter player stats"}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {error && <p className="text-xs text-destructive">{error}</p>}

          {players.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading players…</p>
          ) : (
            <>
              {/* Group by team */}
              {[homeTeamId, awayTeamId].filter(Boolean).map((tid) => {
                const teamPlayers = players.filter((p) => p.teamId === tid);
                if (teamPlayers.length === 0) return null;
                const teamName = teamPlayers[0].teamName;
                return (
                  <div key={tid}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{teamName}</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left font-normal pb-1 pr-3">Player</th>
                          {STAT_COLS.map((c) => (
                            <th key={c.key} className="text-center font-normal pb-1 w-12" title={
                              c.key === "kills" ? "Kills" : c.key === "aces" ? "Aces" : c.key === "digs" ? "Digs" : c.key === "blocks" ? "Blocks" : "Errors"
                            }>
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamPlayers.map((p) => (
                          <tr key={p.id}>
                            <td className="pr-3 py-0.5 truncate max-w-[100px]">{p.name}</td>
                            {STAT_COLS.map((c) => (
                              <td key={c.key} className="py-0.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={rows[p.id]?.[c.key] ?? "0"}
                                  onChange={(e) =>
                                    setRows((prev) => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], [c.key]: e.target.value },
                                    }))
                                  }
                                  className="w-10 rounded border px-1 py-0.5 text-center text-xs"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Saving…" : saved ? "Saved!" : "Save stats"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
