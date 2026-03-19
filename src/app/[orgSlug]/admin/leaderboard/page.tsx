"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  value: number;
}

interface LeaderboardData {
  kills: LeaderboardEntry[];
  aces: LeaderboardEntry[];
  digs: LeaderboardEntry[];
  blocks: LeaderboardEntry[];
  errors: LeaderboardEntry[];
}

const TABS = [
  { key: "kills", label: "Kills" },
  { key: "aces", label: "Aces" },
  { key: "digs", label: "Digs" },
  { key: "blocks", label: "Blocks" },
  { key: "errors", label: "Errors" },
] as const;

type StatKey = (typeof TABS)[number]["key"];

export default function LeaderboardPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatKey>("kills");

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load leaderboard");
        return r.json() as Promise<LeaderboardData>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  const entries = data?.[activeTab] ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-background border-border"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top {TABS.find((t) => t.key === activeTab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No stats recorded yet.
            </p>
          )}
          {!loading && !error && entries.length > 0 && (
            <ol className="space-y-2">
              {entries.map((entry, i) => {
                const initials = entry.userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <li
                    key={entry.userId}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <span className="w-6 text-sm font-bold text-muted-foreground">
                      {i + 1}.
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {initials}
                    </div>
                    <Link
                      href={`/${orgSlug}/players/${entry.userId}`}
                      className="flex-1 text-sm font-medium hover:underline"
                    >
                      {entry.userName}
                    </Link>
                    <span className="text-sm font-bold tabular-nums">
                      {entry.value}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
