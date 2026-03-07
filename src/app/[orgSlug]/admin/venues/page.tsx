"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Court {
  id: string;
  name: string;
  notes: string | null;
}

interface Venue {
  id: string;
  name: string;
  address: string;
  googleMapsUrl: string | null;
  courts: Court[];
}

export default function VenuesPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug;

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueMaps, setVenueMaps] = useState("");
  const [saving, setSaving] = useState(false);

  // Court add state per venue
  const [courtForms, setCourtForms] = useState<Record<string, { name: string; notes: string }>>({});

  async function load() {
    const res = await fetch(`/api/org/${orgSlug}/venues`);
    if (res.ok) setVenues(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createVenue() {
    if (!venueName.trim() || !venueAddress.trim()) return;
    setSaving(true);
    await fetch(`/api/org/${orgSlug}/venues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: venueName, address: venueAddress, googleMapsUrl: venueMaps }),
    });
    setVenueName(""); setVenueAddress(""); setVenueMaps("");
    setShowVenueForm(false);
    setSaving(false);
    await load();
  }

  async function deleteVenue(venueId: string) {
    if (!confirm("Delete this venue? This cannot be undone.")) return;
    await fetch(`/api/org/${orgSlug}/venues/${venueId}`, { method: "DELETE" });
    await load();
  }

  async function addCourt(venueId: string) {
    const form = courtForms[venueId];
    if (!form?.name.trim()) return;
    await fetch(`/api/org/${orgSlug}/venues/${venueId}/courts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, notes: form.notes }),
    });
    setCourtForms((prev) => ({ ...prev, [venueId]: { name: "", notes: "" } }));
    await load();
  }

  async function deleteCourt(venueId: string, courtId: string) {
    if (!confirm("Delete this court?")) return;
    await fetch(`/api/org/${orgSlug}/venues/${venueId}/courts/${courtId}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-muted-foreground">Loading venues...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Button onClick={() => setShowVenueForm((v) => !v)}>
          {showVenueForm ? "Cancel" : "Add venue"}
        </Button>
      </div>

      {showVenueForm && (
        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="font-semibold">New venue</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Name *</Label>
              <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Riverside Beach" />
            </div>
            <div>
              <Label>Address *</Label>
              <Input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} placeholder="123 Main St, City, State" />
            </div>
            <div className="sm:col-span-2">
              <Label>Google Maps URL</Label>
              <Input value={venueMaps} onChange={(e) => setVenueMaps(e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
          </div>
          <Button onClick={createVenue} disabled={saving}>
            {saving ? "Saving..." : "Create venue"}
          </Button>
        </div>
      )}

      {venues.length === 0 && !showVenueForm && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No venues yet. Add your first venue above.</p>
        </div>
      )}

      {venues.map((venue) => (
        <div key={venue.id} className="rounded-lg border overflow-hidden">
          <div className="flex items-start justify-between p-4 bg-muted/30">
            <div>
              <h2 className="font-semibold">{venue.name}</h2>
              <p className="text-sm text-muted-foreground">{venue.address}</p>
              {venue.googleMapsUrl && (
                <a href={venue.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  View on Google Maps
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => deleteVenue(venue.id)}
              className="text-sm text-destructive hover:underline"
            >
              Delete
            </button>
          </div>

          {/* Courts */}
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium">Courts</h3>
            {venue.courts.length === 0 && (
              <p className="text-sm text-muted-foreground">No courts added yet.</p>
            )}
            {venue.courts.map((court) => (
              <div key={court.id} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{court.name}</span>
                  {court.notes && <span className="ml-2 text-xs text-muted-foreground">{court.notes}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteCourt(venue.id, court.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Add court form */}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Court name"
                className="h-8 text-sm"
                value={courtForms[venue.id]?.name ?? ""}
                onChange={(e) =>
                  setCourtForms((prev) => ({
                    ...prev,
                    [venue.id]: { ...prev[venue.id], name: e.target.value, notes: prev[venue.id]?.notes ?? "" },
                  }))
                }
              />
              <Input
                placeholder="Notes (optional)"
                className="h-8 text-sm"
                value={courtForms[venue.id]?.notes ?? ""}
                onChange={(e) =>
                  setCourtForms((prev) => ({
                    ...prev,
                    [venue.id]: { ...prev[venue.id], notes: e.target.value, name: prev[venue.id]?.name ?? "" },
                  }))
                }
              />
              <Button size="sm" className="h-8" onClick={() => addCourt(venue.id)}>
                Add
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
