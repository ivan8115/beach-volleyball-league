"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  role: string;
  jerseyNumber: number | null;
  registrationStatus: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface OrgMember {
  userId: string;
  user: { id: string; name: string };
}

interface Team {
  id: string;
  name: string;
  registrationStatus: string;
  adminNotes: string | null;
  division: { id: string; name: string } | null;
  members: Member[];
}

export default function AdminTeamDetailPage() {
  const params = useParams<{ orgSlug: string; eventId: string; teamId: string }>();
  const { orgSlug, eventId, teamId } = params;

  const [team, setTeam] = useState<Team | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserId, setAddUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");

  async function fetchData() {
    const [teamRes, membersRes] = await Promise.all([
      fetch(`/api/org/${orgSlug}/events/${eventId}/teams/${teamId}`),
      fetch(`/api/org/${orgSlug}/members`),
    ]);
    if (teamRes.ok) {
      const t = await teamRes.json() as Team;
      setTeam(t);
      setEditNotes(t.adminNotes ?? "");
      setEditStatus(t.registrationStatus);
    }
    if (membersRes.ok) {
      setOrgMembers(await membersRes.json() as OrgMember[]);
    }
    setLoading(false);
  }

  useEffect(() => { void fetchData(); }, []);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addUserId) return;
    setAdding(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/events/${eventId}/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: addUserId }),
    });
    if (!res.ok) {
      const data = await res.json() as { error: string };
      setError(data.error);
    } else {
      setAddUserId("");
      await fetchData();
    }
    setAdding(false);
  }

  const REGISTRATION_STATUS_LABELS: Record<string, string> = {
    REGISTERED: "Registered",
    WAITLISTED: "Waitlisted",
    PENDING_PAYMENT: "Pending payment",
    WITHDRAWN: "Withdrawn",
  };

  async function handleRemoveMember(memberId: string) {
    const member = team?.members.find((m) => m.id === memberId);
    if (!confirm(`Remove ${member?.user.name ?? "this player"} from the team?`)) return;
    const res = await fetch(
      `/api/org/${orgSlug}/events/${eventId}/teams/${teamId}/members/${memberId}`,
      { method: "DELETE" },
    );
    if (res.ok) await fetchData();
  }

  async function handleSaveTeam(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/org/${orgSlug}/events/${eventId}/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNotes: editNotes, registrationStatus: editStatus }),
    });
    setSaving(false);
    await fetchData();
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!team) return <p className="text-destructive">Team not found</p>;

  const memberUserIds = new Set(team.members.map((m) => m.user.id));
  const availableToAdd = orgMembers.filter((m) => !memberUserIds.has(m.userId));

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Team settings */}
        <form onSubmit={handleSaveTeam} className="space-y-4 rounded-lg border p-4">
          <h2 className="font-semibold">Team settings</h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              {Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Admin notes</label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>

        {/* Add member */}
        <form onSubmit={handleAddMember} className="space-y-4 rounded-lg border p-4">
          <h2 className="font-semibold">Add player</h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Org member</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
            >
              <option value="">Select member…</option>
              {availableToAdd.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={adding || !addUserId}>
            {adding ? "Adding…" : "Add player"}
          </Button>
        </form>
      </div>

      {/* Roster */}
      <div className="space-y-3">
        <h2 className="font-semibold">Roster ({team.members.length})</h2>
        {team.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Jersey</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{m.user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{m.role.toLowerCase()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.jerseyNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {REGISTRATION_STATUS_LABELS[m.registrationStatus] ?? m.registrationStatus}
                    </td>
                    <td className="px-4 py-3">
                      {m.role !== "CAPTAIN" ? (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground" title="Transfer captain role before removing">Captain</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
