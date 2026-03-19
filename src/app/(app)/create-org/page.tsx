"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COMMON_TIMEZONES = [
  { label: "Eastern Time (US & Canada)", value: "America/New_York" },
  { label: "Central Time (US & Canada)", value: "America/Chicago" },
  { label: "Mountain Time (US & Canada)", value: "America/Denver" },
  { label: "Pacific Time (US & Canada)", value: "America/Los_Angeles" },
  { label: "Alaska", value: "America/Anchorage" },
  { label: "Hawaii", value: "Pacific/Honolulu" },
  { label: "Atlantic Time (Canada)", value: "America/Halifax" },
  { label: "Toronto / Montreal", value: "America/Toronto" },
  { label: "Vancouver", value: "America/Vancouver" },
  { label: "Phoenix (no DST)", value: "America/Phoenix" },
  { label: "London", value: "Europe/London" },
  { label: "Paris / Berlin / Rome", value: "Europe/Paris" },
  { label: "Helsinki / Kyiv", value: "Europe/Helsinki" },
  { label: "Dubai", value: "Asia/Dubai" },
  { label: "Singapore / Hong Kong", value: "Asia/Singapore" },
  { label: "Tokyo / Seoul", value: "Asia/Tokyo" },
  { label: "Sydney", value: "Australia/Sydney" },
  { label: "Melbourne", value: "Australia/Melbourne" },
  { label: "Auckland", value: "Pacific/Auckland" },
  { label: "São Paulo", value: "America/Sao_Paulo" },
  { label: "Mexico City", value: "America/Mexico_City" },
  { label: "Bogotá / Lima", value: "America/Bogota" },
  { label: "Buenos Aires", value: "America/Argentina/Buenos_Aires" },
  { label: "UTC", value: "UTC" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultTz =
    COMMON_TIMEZONES.find((t) => t.value === detectedTz)?.value ?? "America/New_York";
  const [timezone, setTimezone] = useState(defaultTz);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/org/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug, timezone }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create organization.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/${data.slug}/admin`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create an organization</CardTitle>
          <CardDescription>
            Set up your organization to start managing leagues and tournaments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                placeholder="e.g. Sunset Beach VB"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="slug">URL slug</Label>
                <span className="text-xs text-muted-foreground">Auto-generated from name</span>
              </div>
              <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">beachvbl.com/</span>
                <input
                  id="slug"
                  className="flex-1 bg-transparent outline-none"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="your-org"
                  required
                  pattern="[a-z0-9-]+"
                  minLength={2}
                  maxLength={50}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only. Cannot be changed later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Creating…" : "Create organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
