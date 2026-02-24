import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventStatus, EventVisibility } from "@/generated/prisma/enums";

interface OrgPageProps {
  params: Promise<{ orgSlug: string }>;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION: "Registration Open",
  ACTIVE: "Active",
  PLAYOFF: "Playoffs",
  COMPLETED: "Completed",
};

const STATUS_VARIANT: Record<
  EventStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  REGISTRATION: "default",
  ACTIVE: "default",
  PLAYOFF: "default",
  COMPLETED: "secondary",
};

export default async function OrgPublicPage({ params }: OrgPageProps) {
  const { orgSlug } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    include: {
      events: {
        where: {
          visibility: EventVisibility.PUBLIC,
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
          registrationFee: true,
        },
      },
      _count: { select: { members: true } },
    },
  });

  if (!org) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Beach VB League</span>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`/${orgSlug}/join`}>Join</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold">{org.name}</h1>
          <p className="mt-2 text-muted-foreground">{org._count.members} members</p>
          {org.website && (
            <a
              href={org.website}
              className="mt-1 text-sm text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {org.website}
            </a>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link href={`/${orgSlug}/join`}>Join this organization</Link>
            </Button>
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Events</h2>
          {org.events.length === 0 ? (
            <p className="text-muted-foreground">No public events at this time.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {org.events.map((event) => {
                const startDate = event.startDate ?? event.tournamentStartDate;
                return (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{event.name}</CardTitle>
                        <Badge variant={STATUS_VARIANT[event.status]}>
                          {STATUS_LABELS[event.status]}
                        </Badge>
                      </div>
                      <CardDescription>
                        {event.type === "LEAGUE" ? "League" : "Tournament"}
                        {startDate && (
                          <>
                            {" · "}
                            {new Date(startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    {event.registrationFee && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Registration: ${Number(event.registrationFee).toFixed(2)}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
