"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PayPalButton } from "@/components/paypal-button";
import { AvailabilityForm } from "@/components/availability/availability-form";
import { CustomFieldsForm } from "@/components/registration/custom-fields-form";

type Flow = "create" | "join" | "free-agent";

interface EventInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  registrationDeadline: string | null;
  registrationFee: string | null;
  collectAvailability: boolean | null;
  maxRosterSize: number;
  divisions: { id: string; name: string }[];
}

interface Team {
  id: string;
  name: string;
  _count: { members: number };
}

export default function RegisterPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const { orgSlug, eventId } = params;
  const searchParams = useSearchParams();
  const router = useRouter();

  const flowParam = (searchParams.get("flow") ?? "create") as Flow;
  const teamIdParam = searchParams.get("team") ?? undefined;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<Flow>(flowParam);

  // Create team form state
  const [teamName, setTeamName] = useState("");
  const [divisionId, setDivisionId] = useState("");

  // Free agent form state
  const [faNotes, setFaNotes] = useState("");

  // Join team state
  const [joinTeamId, setJoinTeamId] = useState(teamIdParam ?? "");

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [doneTeamId, setDoneTeamId] = useState<string | null>(null);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/org/${orgSlug}/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/org/${orgSlug}/events/${eventId}/teams`).then((r) => r.json()),
    ]).then(([ev, tms]) => {
      setEvent(ev as EventInfo);
      setTeams(tms as Team[]);
      setLoading(false);
    });
  }, []);

  const fee = Number(event?.registrationFee ?? 0);
  const isFree = fee === 0;
  const isLeague = event?.type === "LEAGUE";
  const collectAvailability = isLeague && event?.collectAvailability;

  function proceedAfterRegistration(teamId?: string) {
    if (teamId) setDoneTeamId(teamId);
    // Flow: custom fields → availability → done
    setShowCustomFields(true);
  }

  function handleCustomFieldsDone() {
    setShowCustomFields(false);
    if (collectAvailability) {
      setShowAvailability(true);
    } else {
      setDone(true);
    }
  }

  function handleSuccess(data: Record<string, unknown>) {
    proceedAfterRegistration(data.teamId as string | undefined);
  }

  async function handleFreeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/events/${eventId}/free-agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: faNotes }),
    });
    const data = await res.json() as { error?: string; requiresPayment?: boolean };
    if (!res.ok && !data.requiresPayment) {
      setError(data.error ?? "Failed");
    } else if (data.requiresPayment) {
      // Will show PayPal button - but shouldn't reach here for free events
    } else {
      proceedAfterRegistration();
    }
    setSubmitting(false);
  }

  async function handleCreateFree(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/events/${eventId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName, divisionId: divisionId || undefined }),
    });
    const data = await res.json() as { error?: string; id?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed");
    } else {
      proceedAfterRegistration(data.id ?? undefined);
    }
    setSubmitting(false);
  }

  async function handleJoinFree(e: React.FormEvent) {
    e.preventDefault();
    if (!joinTeamId) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/events/${eventId}/teams/${joinTeamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // no userId = self-join
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed");
    } else {
      proceedAfterRegistration();
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Event not found</p>
      </div>
    );
  }

  if (event.status !== "REGISTRATION") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-medium">Registration is not open for this event.</p>
          <Link href={`/${orgSlug}/events/${eventId}`} className="text-sm text-primary hover:underline">
            Back to event
          </Link>
        </div>
      </div>
    );
  }

  if (showCustomFields) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Additional information</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Please fill in the following fields to complete your registration.
            </p>
          </div>
          <CustomFieldsForm
            orgSlug={orgSlug}
            eventId={eventId}
            onComplete={handleCustomFieldsDone}
            onSkip={handleCustomFieldsDone}
          />
        </div>
      </div>
    );
  }

  if (showAvailability) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Availability</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Let us know when you&apos;re unavailable so we can schedule around you.
            </p>
          </div>
          <AvailabilityForm
            orgSlug={orgSlug}
            eventId={eventId}
            redirectUrl={doneTeamId ? `/${orgSlug}/events/${eventId}/team/${doneTeamId}` : `/${orgSlug}/events/${eventId}`}
          />
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>
          <div>
            <h2 className="text-xl font-bold">You&apos;re registered!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your spot has been confirmed for {event.name}.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {doneTeamId && (
              <Button asChild>
                <Link href={`/${orgSlug}/events/${eventId}/team/${doneTeamId}`}>
                  View your team
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/${orgSlug}/events/${eventId}`}>Back to event</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-10 space-y-6">
        <div>
          <Link href={`/${orgSlug}/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← {event.name}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Register</h1>
        </div>

        {/* Flow selector */}
        <div className="flex gap-2 flex-wrap">
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${flow === "create" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
            onClick={() => setFlow("create")}
          >
            Create a team
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${flow === "join" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
            onClick={() => setFlow("join")}
          >
            Join a team
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${flow === "free-agent" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
            onClick={() => setFlow("free-agent")}
          >
            Free agent
          </button>
        </div>

        {/* CREATE TEAM */}
        {flow === "create" && (
          <div className="space-y-4 rounded-lg border p-6">
            <h2 className="font-semibold">Create a team</h2>
            {fee > 0 && (
              <p className="text-sm text-muted-foreground">
                Registration fee: <strong>${fee.toFixed(2)}</strong>
              </p>
            )}
            <div>
              <label className="text-sm font-medium">Team name *</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Sand Warriors"
              />
            </div>
            {event.divisions.length > 0 && (
              <div>
                <label className="text-sm font-medium">Division</label>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  value={divisionId}
                  onChange={(e) => setDivisionId(e.target.value)}
                >
                  <option value="">No preference</option>
                  {event.divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {isFree ? (
              <Button onClick={handleCreateFree as unknown as React.MouseEventHandler} disabled={submitting || !teamName.trim()}>
                {submitting ? "Registering…" : "Register team"}
              </Button>
            ) : (
              teamName.trim() ? (
                <PayPalButton
                  amount={fee}
                  description={`Team registration for ${event.name}`}
                  context={{ type: "TEAM_CREATE", eventId, divisionId: divisionId || undefined, notes: teamName }}
                  onSuccess={handleSuccess}
                  onError={(err) => setError(String(err))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Enter a team name to continue with payment.</p>
              )
            )}
          </div>
        )}

        {/* JOIN TEAM (league only) */}
        {flow === "join" && (
          <div className="space-y-4 rounded-lg border p-6">
            <h2 className="font-semibold">Join a team</h2>
            {!isLeague ? (
              <div className="rounded-md bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Tournaments use captain-managed rosters</p>
                <p>Ask your team captain to add you from the team management page.</p>
              </div>
            ) : (
              <>
                {fee > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Registration fee: <strong>${fee.toFixed(2)}</strong>
                  </p>
                )}
                <div>
                  <label className="text-sm font-medium">Select team</label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                    value={joinTeamId}
                    onChange={(e) => setJoinTeamId(e.target.value)}
                  >
                    <option value="">Choose a team…</option>
                    {teams
                      .filter((t) => t._count.members < event.maxRosterSize)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t._count.members} player{t._count.members !== 1 ? "s" : ""})
                        </option>
                      ))}
                  </select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {isFree ? (
                  <Button
                    onClick={handleJoinFree as unknown as React.MouseEventHandler}
                    disabled={submitting || !joinTeamId}
                  >
                    {submitting ? "Joining…" : "Join team"}
                  </Button>
                ) : (
                  joinTeamId ? (
                    <PayPalButton
                      amount={fee}
                      description={`Player registration for ${event.name}`}
                      context={{ type: "TEAM_JOIN", eventId, teamId: joinTeamId }}
                      onSuccess={handleSuccess}
                      onError={(err) => setError(String(err))}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a team to continue.</p>
                  )
                )}
              </>
            )}
          </div>
        )}

        {/* FREE AGENT */}
        {flow === "free-agent" && (
          <div className="space-y-4 rounded-lg border p-6">
            <h2 className="font-semibold">Sign up as free agent</h2>
            {fee > 0 && (
              <p className="text-sm text-muted-foreground">
                Registration fee: <strong>${fee.toFixed(2)}</strong>
              </p>
            )}
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm"
                rows={3}
                value={faNotes}
                onChange={(e) => setFaNotes(e.target.value)}
                placeholder="Skill level, availability, position preference…"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {isFree ? (
              <Button
                onClick={handleFreeSubmit as unknown as React.MouseEventHandler}
                disabled={submitting}
              >
                {submitting ? "Signing up…" : "Sign up"}
              </Button>
            ) : (
              <PayPalButton
                amount={fee}
                description={`Free agent registration for ${event.name}`}
                context={{ type: "FREE_AGENT", eventId, notes: faNotes }}
                onSuccess={() => proceedAfterRegistration()}
                onError={(err) => setError(String(err))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
