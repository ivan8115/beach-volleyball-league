import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export default async function EventAdminPage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;
  redirect(`/${orgSlug}/admin/events/${eventId}/teams`);
}
