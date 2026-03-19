import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export default async function ExportPage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true },
  });
  if (!org) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: org.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!event) notFound();

  const base = `/api/org/${orgSlug}/events/${eventId}/export`;

  const exports = [
    {
      title: "Roster CSV",
      description: "All registered teams and player details (name, email, role).",
      href: `${base}?format=csv&type=roster`,
      filename: `roster-${eventId}.csv`,
      adminOnly: true,
    },
    {
      title: "Standings CSV",
      description: "Current standings with wins, losses, set %, and point %.",
      href: `${base}?format=csv&type=standings`,
      filename: `standings-${eventId}.csv`,
      adminOnly: true,
    },
    {
      title: "Schedule (.ics)",
      description: "Full game schedule as a calendar file. Import into Google Calendar, Apple Calendar, etc.",
      href: `${base}?format=ics`,
      filename: `schedule-${eventId}.ics`,
      adminOnly: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Export Data</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Download event data for {event.name}.
        </p>
      </div>

      <div className="space-y-4">
        {exports.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="mt-1">{item.description}</CardDescription>
                </div>
                <a
                  href={item.href}
                  download={item.filename}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Download
                </a>
              </div>
            </CardHeader>
            {item.adminOnly && (
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">Admin only</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
