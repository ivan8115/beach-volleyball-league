"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AvailabilityConstraintType, DayOfWeek } from "@/generated/prisma/enums";

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

const CONSTRAINT_TYPES: { value: AvailabilityConstraintType; label: string }[] = [
  { value: "DAY_OF_WEEK", label: "Day of week" },
  { value: "SPECIFIC_DATE", label: "Specific date" },
  { value: "TIME_RANGE", label: "Time range (weekly)" },
  { value: "DATE_TIME_RANGE", label: "Date/time range" },
];

interface Constraint {
  id: string;
  type: AvailabilityConstraintType;
  dayOfWeek?: DayOfWeek;
  specificDate?: string;
  startTime?: string;
  endTime?: string;
  startDateTime?: string;
  endDateTime?: string;
}

interface AvailabilityFormProps {
  orgSlug: string;
  eventId: string;
  initial?: Constraint[];
  redirectUrl?: string;
}

function emptyConstraint(): Constraint {
  return { id: crypto.randomUUID(), type: "DAY_OF_WEEK" };
}

export function AvailabilityForm({
  orgSlug,
  eventId,
  initial = [],
  redirectUrl,
}: AvailabilityFormProps) {
  const router = useRouter();
  const [constraints, setConstraints] = useState<Constraint[]>(
    initial.length ? initial : [emptyConstraint()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    setConstraints((prev) => [...prev, emptyConstraint()]);
  }

  function removeRow(id: string) {
    setConstraints((prev) => prev.filter((c) => c.id !== id));
  }

  function updateRow(id: string, patch: Partial<Constraint>) {
    setConstraints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/org/${orgSlug}/events/${eventId}/availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ constraints }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        setError(data.error ?? "Failed to save");
        return;
      }
      if (redirectUrl) router.push(redirectUrl);
      else router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {constraints.map((c) => (
          <div key={c.id} className="flex flex-wrap items-start gap-3 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
                value={c.type}
                onChange={(e) =>
                  updateRow(c.id, { type: e.target.value as AvailabilityConstraintType })
                }
              >
                {CONSTRAINT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {c.type === "DAY_OF_WEEK" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Day</label>
                <select
                  className="rounded-md border bg-background px-3 py-1.5 text-sm"
                  value={c.dayOfWeek ?? ""}
                  onChange={(e) => updateRow(c.id, { dayOfWeek: e.target.value as DayOfWeek })}
                >
                  <option value="">Select day</option>
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {c.type === "SPECIFIC_DATE" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  className="rounded-md border bg-background px-3 py-1.5 text-sm"
                  value={c.specificDate ?? ""}
                  onChange={(e) => updateRow(c.id, { specificDate: e.target.value })}
                />
              </div>
            )}

            {c.type === "TIME_RANGE" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Start time</label>
                  <input
                    type="time"
                    className="rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={c.startTime ?? ""}
                    onChange={(e) => updateRow(c.id, { startTime: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">End time</label>
                  <input
                    type="time"
                    className="rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={c.endTime ?? ""}
                    onChange={(e) => updateRow(c.id, { endTime: e.target.value })}
                  />
                </div>
              </>
            )}

            {c.type === "DATE_TIME_RANGE" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Start</label>
                  <input
                    type="datetime-local"
                    className="rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={c.startDateTime ?? ""}
                    onChange={(e) => updateRow(c.id, { startDateTime: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">End</label>
                  <input
                    type="datetime-local"
                    className="rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={c.endDateTime ?? ""}
                    onChange={(e) => updateRow(c.id, { endDateTime: e.target.value })}
                  />
                </div>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-5 text-destructive hover:text-destructive"
              onClick={() => removeRow(c.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + Add constraint
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save availability"}
        </Button>
      </div>
    </form>
  );
}
