import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
          <CardContent>
            <p className="font-mono text-xl font-bold tracking-widest">{org.joinCode}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent events</h2>
        </div>
        {org.events.length === 0 ? (
          <p className="text-muted-foreground">No events yet.</p>
        ) : (
          <div className="space-y-2">
            {org.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.type === "LEAGUE" ? "League" : "Tournament"}
                  </p>
                </div>
                <Badge variant="outline">{event.status.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
