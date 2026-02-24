import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold">Beach VB League</span>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Run your beach volleyball league
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
          Manage leagues and tournaments, track standings, schedule games, and collect registrations
          — all in one place.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/register">Create a free account</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Everything you need</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <div className="mb-2 text-3xl">{f.icon}</div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="mt-4 text-muted-foreground">
          Free to start. Set up your organization in minutes.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/register">Create your organization</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Beach VB League &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "🏐",
    title: "Leagues & Tournaments",
    description:
      "Run multi-week leagues with round-robin scheduling or single/double elimination tournaments with pool play.",
  },
  {
    icon: "📊",
    title: "Live Standings",
    description:
      "Standings calculated in real time from game scores. Tiebreakers handled automatically.",
  },
  {
    icon: "📅",
    title: "Smart Scheduling",
    description:
      "Schedule games by week with court assignments. Collect player availability to minimize conflicts.",
  },
  {
    icon: "🏆",
    title: "Brackets",
    description:
      "Generate single or double elimination brackets. Option to switch to single elimination at semifinals.",
  },
  {
    icon: "💳",
    title: "Registration & Payments",
    description:
      "Accept registration fees via PayPal. Leagues charge per player; tournaments charge per team.",
  },
  {
    icon: "👥",
    title: "Multi-org",
    description:
      "Run multiple organizations from one account. Invite admins, scorers, and players with join codes.",
  },
];
