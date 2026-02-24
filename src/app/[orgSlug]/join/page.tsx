import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OrgJoinPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgJoinPage({ params }: OrgJoinPageProps) {
  const { orgSlug } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null },
    select: { name: true, joinCode: true },
  });

  if (!org) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Join {org.name}</CardTitle>
          <CardDescription>
            Sign in or create an account to join this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Join code</p>
            <p className="text-2xl font-mono font-bold tracking-widest">{org.joinCode}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You&apos;ll need to sign in first. After signing in, use the join code above or go
            to{" "}
            <strong>
              beachvbl.com/{orgSlug}/join
            </strong>
            .
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href={`/login?redirect=/${orgSlug}/join`}>Sign in to join</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/register?redirect=/${orgSlug}/join`}>Create an account</Link>
            </Button>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${orgSlug}`}>Back to {org.name}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
