"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Division {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  targetType: string;
  targetId: string | null;
  postedAt: string;
  postedBy: { name: string };
}

export default function EventAnnouncementsPage() {
  const { orgSlug, eventId } = useParams<{ orgSlug: string; eventId: string }>();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("EVENT");
  const [targetId, setTargetId] = useState("");

  const base = `/api/org/${orgSlug}`;

  async function load() {
    const [annRes, eventRes] = await Promise.all([
      fetch(`${base}/announcements?eventId=${eventId}`),
      fetch(`${base}/events/${eventId}/teams?status=REGISTERED`),
    ]);
    if (annRes.ok) setAnnouncements(await annRes.json());
    // Fetch divisions from event data via teams endpoint response or directly
    setLoading(false);
  }

  async function loadDivisionsAndTeams() {
    const [divRes, teamRes] = await Promise.all([
      fetch(`${base}/events/${eventId}/divisions`).catch(() => null),
      fetch(`${base}/events/${eventId}/teams`),
    ]);
    if (divRes?.ok) setDivisions(await divRes.json());
    if (teamRes.ok) {
      const t = await teamRes.json();
      setTeams(Array.isArray(t) ? t : t.teams ?? []);
    }
  }

  useEffect(() => {
    void load();
    void loadDivisionsAndTeams();
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch(`${base}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        title,
        body,
        targetType,
        targetId: targetType !== "EVENT" && targetId ? targetId : undefined,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setAnnouncements((prev) => [created, ...prev]);
      setTitle("");
      setBody("");
      setTargetType("EVENT");
      setTargetId("");
      setOpen(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to post announcement");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetch(`${base}/announcements/${id}`, { method: "DELETE" });
    if (res.ok) setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  const targetOptions =
    targetType === "DIVISION"
      ? divisions
      : targetType === "TEAM"
      ? teams
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Announcements</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Post announcement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post announcement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Message</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Audience</Label>
                <Select value={targetType} onValueChange={(v) => { setTargetType(v); setTargetId(""); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVENT">Everyone in this event</SelectItem>
                    <SelectItem value="DIVISION">Specific division</SelectItem>
                    <SelectItem value="TEAM">Specific team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetOptions.length > 0 && (
                <div className="space-y-1">
                  <Label>{targetType === "DIVISION" ? "Division" : "Team"}</Label>
                  <Select value={targetId} onValueChange={setTargetId} required>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${targetType.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.postedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {a.postedBy.name}
                    {a.targetType !== "EVENT" && (
                      <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                        {a.targetType.toLowerCase()}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(a.id)}
                >
                  Delete
                </Button>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
