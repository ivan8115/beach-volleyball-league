"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Division {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  registrationStatus: string;
  division: Division | null;
  _count: { members: number };
}

interface EventInfo {
  divisions: Division[];
}

export default function AdminTeamsPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDivision, setNewDivision] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTeams() {
    const [teamsRes, eventRes] = await Promise.all([
      fetch(`/api/org/${orgSlug}/events/${eventId}/teams`),
      fetch(`/api/org/${orgSlug}/events/${eventId}`),
    ]);
    if (teamsRes.ok) setTeams(await teamsRes.json() as Team[]);
    if (eventRes.ok) {
      const ev = await eventRes.json() as { divisions?: Division[] };
      setEventInfo({ divisions: ev.divisions ?? [] });
    }
    setLoading(false);
  }

  useEffect(() => { void fetchTeams(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/events/${eventId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, divisionId: newDivision || undefined }),
    });
    if (!res.ok) {
      const data = await res.json() as { error: string };
      setError(data.error);
    } else {
      setShowCreate(false);
      setNewName("");
      setNewDivision("");
      await fetchTeams();
    }
    setCreating(false);
  }

  const statusColors: Record<string, string> = {
    REGISTERED: "bg-green-100 text-green-800",
    WAITLISTED: "bg-yellow-100 text-yellow-800",
    PENDING_PAYMENT: "bg-blue-100 text-blue-800",
    WITHDRAWN: "bg-gray-100 text-gray-600",
  };

  const statusLabels: Record<string, string> = {
    REGISTERED: "Registered",
    WAITLISTED: "Waitlisted",
    PENDING_PAYMENT: "Pending payment",
    WITHDRAWN: "Withdrawn",
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{teams.length} team(s)</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Create team
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">New team</h3>
          <div>
            <label className="text-xs font-medium">Team name</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Team name"
              required
            />
          </div>
          {(eventInfo?.divisions?.length ?? 0) > 0 && (
            <div>
              <label className="text-xs font-medium">Division (optional)</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                value={newDivision}
                onChange={(e) => setNewDivision(e.target.value)}
              >
                <option value="">No division</option>
                {eventInfo!.divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {teams.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No teams yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Division</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Players</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{team.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {team.division?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[team.registrationStatus] ?? ""}`}>
                      {statusLabels[team.registrationStatus] ?? team.registrationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{team._count.members}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${orgSlug}/admin/events/${eventId}/teams/${team.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
