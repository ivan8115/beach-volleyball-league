import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventStatus } from "@/generated/prisma/enums";

interface MemberDashboardProps {
  params: Promise<{ orgSlug: string }>;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION: "Registration Open",
  ACTIVE: "Active",
  PLAYOFF: "Playoffs",
  COMPLETED: "Completed",
};

export default async function MemberDashboardPage({ params }: MemberDashboardProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true, name: true, avatarUrl: true },
  });

  if (!dbUser) redirect("/onboarding");

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    include: {
      events: {
        where: {
          deletedAt: null,
          status: { not: EventStatus.DRAFT },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          startDate: true,
          tournamentStartDate: true,
        },
      },
      announcements: {
        orderBy: { postedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          body: true,
          postedAt: true,
        },
      },
      members: {
        where: { userId: dbUser.id },
        select: { role: true },
      },
    },
  });

  if (!org) notFound();

  const membership = org.members[0];
  if (!membership) redirect(`/${orgSlug}/join`);

  const isAdmin = membership.role === "ADMIN" || membership.role === "SCORER";

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← All orgs
            </Link>
            <span className="font-semibold">{org.name}</span>
            <Badge variant="outline">{membership.role.toLowerCase()}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/${orgSlug}/admin`}>Admin</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/profile">Profile</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Events</h2>
            {org.events.length === 0 ? (
              <p className="text-muted-foreground">No events yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {org.events.map((event) => {
                  const startDate = event.startDate ?? event.tournamentStartDate;
                  return (
                    <Card key={event.id} className="hover:shadow-sm transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-medium">{event.name}</CardTitle>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {STATUS_LABELS[event.status]}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {event.type === "LEAGUE" ? "League" : "Tournament"}
                          {startDate && (
                            <>
                              {" · "}
                              {new Date(startDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </>
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold">Announcements</h2>
            {org.announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <div className="space-y-3">
                {org.announcements.map((a) => (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{a.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(a.postedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">{a.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
