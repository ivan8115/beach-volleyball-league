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

interface EventOption {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  targetType: string;
  postedAt: string;
  postedBy: { name: string };
  event: { id: string; name: string } | null;
}

export default function OrgAnnouncementsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventId, setEventId] = useState("none");

  const base = `/api/org/${orgSlug}`;

  async function load() {
    const [annRes, eventsRes] = await Promise.all([
      fetch(`${base}/announcements`),
      fetch(`${base}/events`),
    ]);
    if (annRes.ok) setAnnouncements(await annRes.json());
    if (eventsRes.ok) {
      const data = await eventsRes.json();
      setEvents(Array.isArray(data) ? data : data.events ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [orgSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch(`${base}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(eventId !== "none" ? { eventId } : {}),
        title,
        body,
        targetType: "EVENT",
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setAnnouncements((prev) => [created, ...prev]);
      setTitle("");
      setBody("");
      setEventId("none");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
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
                <Label>Event (optional)</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Org-wide (no event)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Org-wide (no event)</SelectItem>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    {a.event && <> · {a.event.name}</>}
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
