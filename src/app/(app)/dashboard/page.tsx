import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    include: {
      organizations: {
        include: {
          organization: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!dbUser) redirect("/onboarding");

  return (
    <>
      <AppNav userName={dbUser.name} avatarUrl={dbUser.avatarUrl} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {dbUser.name.split(" ")[0]}</h1>
            <p className="text-muted-foreground">Manage your leagues and organizations</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/join">Join org</Link>
            </Button>
            <Button asChild>
              <Link href="/create-org">Create org</Link>
            </Button>
          </div>
        </div>

        {dbUser.organizations.length === 0 ? (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>No organizations yet</CardTitle>
              <CardDescription>
                Create a new organization to start managing leagues, or join an existing one with a
                join code.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/join">Join with a code</Link>
              </Button>
              <Button asChild>
                <Link href="/create-org">Create organization</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Your organizations</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dbUser.organizations.map(({ organization, role }) => (
                <Card key={organization.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{organization.name}</CardTitle>
                      <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
                        {role.toLowerCase()}
                      </Badge>
                    </div>
                    <CardDescription>/{organization.slug}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/${organization.slug}/dashboard`}>Open</Link>
                      </Button>
                      {role === "ADMIN" && (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/${organization.slug}/admin`}>Admin</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
