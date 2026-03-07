import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create event</h1>
      <EventWizard orgSlug={orgSlug} mode="create" />
    </div>
  );
}
