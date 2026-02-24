import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { id: true },
  });

  if (!org) {
    notFound();
  }

  return <>{children}</>;
}
