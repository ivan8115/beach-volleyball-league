import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";

interface AdminOverviewProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function AdminOverviewPage({ params }: AdminOverviewProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/onboarding");

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    include: {
      _count: {
        select: {
          members: true,
          events: { where: { deletedAt: null } },
        },
      },
      events: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          startDate: true,
          tournamentStartDate: true,
        },
      },
    },
  });

  if (!org) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${orgSlug}/admin/settings`}>Settings</Link>
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{org._count.members}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{org._count.events}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Join code</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <p className="font-mono text-xl font-bold tracking-widest">{org.joinCode}</p>
            <CopyButton text={org.joinCode} />
          </CardContent>
        </Card>
      </div>

      {org.events.length === 0 && org._count.members <= 1 && (
        <div className="mb-8 rounded-lg border border-dashed p-6">
          <h2 className="font-semibold mb-1">Get started</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Here&apos;s how to set up your first league or tournament:
          </p>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              <div>
                <span className="font-medium">Add a venue & courts</span>
                <span className="text-muted-foreground"> — </span>
                <Link href={`/${orgSlug}/admin/venues`} className="text-primary hover:underline">
                  Go to Venues
                </Link>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              <div>
                <span className="font-medium">Create an event</span>
                <span className="text-muted-foreground"> — </span>
                <Link href={`/${orgSlug}/admin/events`} className="text-primary hover:underline">
                  Go to Events
                </Link>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">3</span>
              <div>
                <span className="font-medium">Share your join code</span>
                <span className="text-muted-foreground"> — players join your org with the code above, then register for events</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">4</span>
              <div>
                <span className="font-medium">Generate the schedule or bracket</span>
                <span className="text-muted-foreground"> — once teams have registered</span>
              </div>
            </li>
          </ol>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent events</h2>
          {org.events.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${orgSlug}/admin/events`}>All events</Link>
            </Button>
          )}
        </div>
        {org.events.length === 0 ? (
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">No events yet.</p>
            <Button asChild size="sm">
              <Link href={`/${orgSlug}/admin/events`}>Create event</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {org.events.map((event) => (
              <Link
                key={event.id}
                href={`/${orgSlug}/admin/events/${event.id}/teams`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.type === "LEAGUE" ? "League" : "Tournament"}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{event.status.toLowerCase().replace("_", " ")}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
