import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AdminNavLinks } from "@/components/admin-nav-links";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${orgSlug}/admin`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true, name: true, avatarUrl: true },
  });

  if (!dbUser) redirect("/onboarding");

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });

  if (!org) notFound();

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: dbUser.id, organizationId: org.id } },
    select: { role: true },
  });

  if (!membership || (membership.role !== "ADMIN" && membership.role !== "SCORER")) {
    // Not an admin or scorer
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-muted-foreground">
            You don&apos;t have admin access to this organization.
          </p>
          <Link href="/dashboard" className="mt-4 block text-primary underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← All orgs
            </Link>
            <span className="font-semibold">Admin</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <AdminNavLinks orgSlug={orgSlug} isAdmin={membership.role === "ADMIN"} />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
