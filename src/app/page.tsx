import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <VolleyballIcon className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Beach VB League</span>
          </div>
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
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/60 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Free to start — no credit card required
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            Run your beach volleyball league
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
            Manage leagues and tournaments, track standings, schedule games, and collect registrations
            — all in one place.
          </p>
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Button asChild size="lg">
              <Link href="/register">Create a free account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        {/* Hero visual */}
        <div className="mx-auto max-w-3xl px-4 pb-16">
          <div className="rounded-xl border bg-muted/30 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-400/70" />
              <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
              <div className="h-3 w-3 rounded-full bg-green-400/70" />
              <span className="ml-2 text-xs text-muted-foreground">Summer League 2025 — Week 4</span>
            </div>
            <div className="space-y-2">
              {[
                { home: "Sand Warriors", away: "Net Ninjas", score: "21–18, 21–15", status: "Final" },
                { home: "Beach Bombers", away: "Spike Squad", score: null, status: "Live" },
                { home: "Dig Deep", away: "Block Party", score: null, status: "6:00 PM · Court 2" },
              ].map((g, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{g.home} <span className="text-muted-foreground font-normal">vs</span> {g.away}</p>
                  </div>
                  <div className="text-right">
                    {g.score ? (
                      <span className="font-mono text-sm">{g.score}</span>
                    ) : (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        g.status === "Live" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
                      }`}>{g.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.Icon className="h-5 w-5" />
                  </div>
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

function VolleyballIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 6.32 16.07" />
      <path d="M2.68 16.07A10 10 0 0 1 12 2" />
      <path d="M12 22a10 10 0 0 1-6.32-16.07" />
      <path d="M21.32 7.93A10 10 0 0 1 12 22" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function BracketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="6" height="4" rx="1" />
      <rect x="2" y="10" width="6" height="4" rx="1" />
      <rect x="2" y="17" width="6" height="4" rx="1" />
      <rect x="16" y="6" width="6" height="4" rx="1" />
      <rect x="16" y="14" width="6" height="4" rx="1" />
      <path d="M8 5h4v12H8" />
      <line x1="12" y1="11" x2="16" y2="8" />
      <line x1="12" y1="11" x2="16" y2="16" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const features = [
  {
    Icon: TrophyIcon,
    title: "Leagues & Tournaments",
    description:
      "Run multi-week leagues with round-robin scheduling or single/double elimination tournaments with pool play.",
  },
  {
    Icon: ChartIcon,
    title: "Live Standings",
    description:
      "Standings calculated in real time from game scores. Tiebreakers handled automatically.",
  },
  {
    Icon: CalendarIcon,
    title: "Smart Scheduling",
    description:
      "Schedule games by week with court assignments. Collect player availability to minimize conflicts.",
  },
  {
    Icon: BracketIcon,
    title: "Brackets",
    description:
      "Generate single or double elimination brackets. Option to switch to single elimination at semifinals.",
  },
  {
    Icon: CreditCardIcon,
    title: "Registration & Payments",
    description:
      "Accept registration fees via PayPal. Leagues charge per player; tournaments charge per team.",
  },
  {
    Icon: UsersIcon,
    title: "Multi-org",
    description:
      "Run multiple organizations from one account. Invite admins, scorers, and players with join codes.",
  },
];
