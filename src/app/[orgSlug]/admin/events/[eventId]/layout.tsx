import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface EventAdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export default async function EventAdminLayout({ children, params }: EventAdminLayoutProps) {
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

  const base = `/${orgSlug}/admin/events/${eventId}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/${orgSlug}/admin/events`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All events
        </Link>
        <h1 className="text-2xl font-bold">{event.name}</h1>
      </div>

      <nav className="flex gap-1 border-b pb-0">
        {[
          { href: `${base}/teams`, label: "Teams" },
          { href: `${base}/free-agents`, label: "Free agents" },
          { href: `${base}/waitlist`, label: "Waitlist" },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}
