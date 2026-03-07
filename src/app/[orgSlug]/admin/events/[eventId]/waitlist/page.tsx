"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface WaitlistEntry {
  id: string;
  position: number;
  joinedAt: string;
  team: {
    id: string;
    name: string;
    _count: { members: number };
  };
}

export default function AdminWaitlistPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/events/${eventId}/waitlist`)
      .then((r) => r.json())
      .then((data) => { setEntries(data as WaitlistEntry[]); setLoading(false); });
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{entries.length} team(s) on waitlist</p>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Waitlist is empty.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Position</th>
                <th className="px-4 py-3 text-left font-medium">Team</th>
                <th className="px-4 py-3 text-left font-medium">Players</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">#{e.position}</td>
                  <td className="px-4 py-3">{e.team.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.team._count.members}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(e.joinedAt).toLocaleDateString()}
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
