"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface FreeAgent {
  id: string;
  notes: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

export default function AdminFreeAgentsPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;
  const [agents, setAgents] = useState<FreeAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/events/${eventId}/free-agents`)
      .then((r) => r.json())
      .then((data) => { setAgents(data as FreeAgent[]); setLoading(false); });
  }, []);

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    PLACED: "bg-gray-100 text-gray-600",
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{agents.length} free agent(s)</p>

      {agents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No free agents yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{a.user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{a.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status] ?? ""}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString()}
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
