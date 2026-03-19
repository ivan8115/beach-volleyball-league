"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsData {
  totals: { events: number; teams: number; players: number; revenue: number };
  registrationsByEvent: Array<{
    eventId: string;
    eventName: string;
    teamCount: number;
    playerCount: number;
    revenue: number;
  }>;
  revenueByMonth: Array<{ month: string; amount: number }>;
  eventsByStatus: Array<{ status: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  REGISTRATION: "#60a5fa",
  ACTIVE: "#34d399",
  PLAYOFF: "#f59e0b",
  COMPLETED: "#6366f1",
};

const PIE_COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#f59e0b", "#6366f1"];

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/analytics`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json() as Promise<AnalyticsData>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-destructive">{error ?? "No data available"}</p>
      </div>
    );
  }

  const { totals, registrationsByEvent, revenueByMonth, eventsByStatus } = data;

  // Shorten event names for chart
  const regChartData = registrationsByEvent.map((e) => ({
    name: e.eventName.length > 16 ? e.eventName.slice(0, 14) + "…" : e.eventName,
    Teams: e.teamCount,
    Players: e.playerCount,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Events" value={String(totals.events)} />
        <KpiCard title="Registered Teams" value={String(totals.teams)} />
        <KpiCard title="Registered Players" value={String(totals.players)} />
        <KpiCard
          title="Total Revenue"
          value={`$${totals.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      </div>

      {/* Registrations by Event */}
      {regChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registrations by Event</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regChartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Bar dataKey="Teams" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Players" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-35} textAnchor="end" interval={1} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Events by Status */}
        {eventsByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Events by Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={eventsByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name ?? ""} (${value ?? ""})`}
                  >
                    {eventsByStatus.map((entry, i) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
