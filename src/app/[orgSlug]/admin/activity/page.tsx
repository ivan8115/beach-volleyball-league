"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string };
}

const ACTION_LABELS: Record<string, string> = {
  SCORE_ENTERED: "Score entered",
  SCORE_UPDATED: "Score corrected",
  GAME_FORFEITED: "Game forfeited",
  GAME_CANCELLED: "Game cancelled",
  GAME_RESCHEDULED: "Game rescheduled",
  GAME_UPDATED: "Game updated",
  ANNOUNCEMENT_POSTED: "Announcement posted",
  ANNOUNCEMENT_DELETED: "Announcement deleted",
  ROSTER_PLAYER_ADDED: "Player added to roster",
  ROSTER_PLAYER_REMOVED: "Player removed from roster",
};

const ENTITY_FILTERS = [
  { value: "all", label: "All types" },
  { value: "GAME", label: "Games" },
  { value: "TEAM", label: "Teams" },
  { value: "ANNOUNCEMENT", label: "Announcements" },
];

export default function ActivityLogPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const base = `/api/org/${orgSlug}/activity-log`;

  const fetchLogs = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (entityFilter !== "all") params.set("entityType", entityFilter);
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "50");

      const res = await fetch(`${base}?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      return data as { logs: LogEntry[]; nextCursor: string | null };
    },
    [base, entityFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchLogs().then((data) => {
      if (data) {
        setLogs(data.logs);
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [fetchLogs]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const data = await fetchLogs(nextCursor);
    if (data) {
      setLogs((prev) => [...prev, ...data.logs]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  function formatMetadata(entry: LogEntry): string {
    const m = entry.metadata;
    if (!m || Object.keys(m).length === 0) return "";

    const parts: string[] = [];

    if (m.setNumber) parts.push(`Set ${m.setNumber}`);
    if (m.homeScore !== undefined && m.awayScore !== undefined) {
      parts.push(`${m.homeScore}-${m.awayScore}`);
    }
    if (m.previousHomeScore !== undefined) {
      parts.push(`(was ${m.previousHomeScore}-${m.previousAwayScore})`);
    }
    if (m.newStatus) parts.push(`Status: ${String(m.newStatus).toLowerCase()}`);
    if (m.rescheduleReason) parts.push(`Reason: ${m.rescheduleReason}`);
    if (m.title) parts.push(`"${m.title}"`);
    if (m.role) parts.push(`Role: ${String(m.role).toLowerCase()}`);

    return parts.join(" · ");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity log</h1>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="space-y-1">
          {logs.map((entry) => {
            const meta = formatMetadata(entry);
            return (
              <div
                key={entry.id}
                className="flex items-start gap-4 rounded-md border px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{entry.user.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </div>
                  {meta && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {meta}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {nextCursor && (
            <div className="pt-4 text-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
