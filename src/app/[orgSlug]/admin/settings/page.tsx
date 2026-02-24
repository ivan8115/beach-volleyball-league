"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OrgSettings {
  name: string;
  slug: string;
  timezone: string;
  paypalEmail: string | null;
  website: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  joinCode: string;
}

export default function AdminSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const orgSlug = params.orgSlug;

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/settings`)
      .then((r) => r.json())
      .then((data: OrgSettings) => {
        setSettings(data);
        setName(data.name);
        setTimezone(data.timezone);
        setPaypalEmail(data.paypalEmail ?? "");
        setWebsite(data.website ?? "");
        setInstagramUrl(data.instagramUrl ?? "");
        setFacebookUrl(data.facebookUrl ?? "");
      })
      .catch(() => {});
  }, [orgSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const res = await fetch(`/api/org/${orgSlug}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        timezone,
        paypalEmail: paypalEmail || null,
        website: website || null,
        instagramUrl: instagramUrl || null,
        facebookUrl: facebookUrl || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save settings.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  if (!settings) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic organization information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                  Settings saved.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Organization name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>URL slug</Label>
                <Input value={settings.slug} disabled className="bg-muted font-mono" />
                <p className="text-xs text-muted-foreground">
                  Slug cannot be changed after creation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  required
                  placeholder="America/New_York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paypalEmail">PayPal email</Label>
                <Input
                  id="paypalEmail"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="payments@yourorg.com"
                />
                <p className="text-xs text-muted-foreground">
                  Used to receive event registration payments.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourorg.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/yourorg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/yourorg"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join code</CardTitle>
            <CardDescription>Share this code with players to let them join your org</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <p className="font-mono text-2xl font-bold tracking-widest">{settings.joinCode}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
