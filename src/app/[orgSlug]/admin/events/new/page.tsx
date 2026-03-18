import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkEventLimit } from "@/lib/plan-limits";
import { EventWizard } from "@/components/events/event-wizard";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function NewEventPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/${orgSlug}/admin/events/new`);

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/onboarding");

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true },
  });
  if (!org) notFound();

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: dbUser.id, organizationId: org.id } },
    select: { role: true },
  });
  if (!membership || membership.role !== "ADMIN") notFound();

  const limitError = await checkEventLimit(org.id);

  if (limitError) {
    return (
      <div className="space-y-6 max-w-lg">
        <h1 className="text-2xl font-bold">Create event</h1>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-3">
          <p className="font-medium text-sm">{limitError}</p>
          <Link
            href={`/${orgSlug}/admin/billing`}
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upgrade plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create event</h1>
      <EventWizard orgSlug={orgSlug} mode="create" />
    </div>
  );
}
