import Link from "next/link";

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  espresso:    "#1A0E06",
  espressoMid: "#2C1A0E",
  espressoLt:  "#3D2415",
  terra:       "#C84B31",
  terraDim:    "#A63C28",
  terraGlow:   "rgba(200,75,49,0.18)",
  sand:        "#E8C98A",
  sandLt:      "#F3E4C0",
  cream:       "#FDF6EC",
  surface:     "#F5EAD8",
  white:       "#FFFFFF",
  brown:       "#8B6A4F",
  brownLt:     "#B89070",
};

const BARLOW = "var(--font-barlow)";
const DM     = "var(--font-dm)";

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: DM, backgroundColor: C.cream, color: C.espresso, overflowX: "hidden" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: `1px solid rgba(26,14,6,0.08)`, backgroundColor: C.cream, position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <VolleyballIcon size={28} color={C.terra} />
            <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 22, letterSpacing: "0.04em", color: C.espresso }}>
              BEACH VB LEAGUE
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/login" className="nav-signin">
              Sign in
            </Link>
            <Link href="/register" className="nav-cta">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        position: "relative",
        background: `
          radial-gradient(ellipse at 60% 0%, rgba(200,75,49,0.12) 0%, transparent 50%),
          linear-gradient(175deg, ${C.espresso} 0%, ${C.espressoMid} 50%, #0D0702 100%)
        `,
        padding: "96px 24px 100px",
        overflow: "hidden",
      }}>
        {/* Grain texture overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />

        {/* Decorative volleyball */}
        <div style={{ position: "absolute", top: -60, right: -60, opacity: 0.05, pointerEvents: "none" }}>
          <VolleyballIcon size={520} color={C.sand} />
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", position: "relative" }}>

          {/* Left: headline + CTAs */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "rgba(232,201,138,0.12)", border: `1px solid rgba(232,201,138,0.25)`, borderRadius: 100, padding: "6px 16px", marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.terra, display: "inline-block", boxShadow: `0 0 8px ${C.terra}` }} />
              <span style={{ fontFamily: DM, fontSize: 13, color: C.sand, letterSpacing: "0.03em" }}>Free to start — no credit card required</span>
            </div>

            <h1 style={{
              fontFamily: BARLOW,
              fontWeight: 800,
              fontSize: "clamp(3.2rem, 7vw, 5.8rem)",
              lineHeight: 0.93,
              letterSpacing: "0.01em",
              color: C.cream,
              marginBottom: 24,
              textTransform: "uppercase",
            }}>
              Run Your<br />
              <span style={{ color: C.terra }}>Beach Volleyball</span><br />
              League
            </h1>

            <p style={{ fontFamily: DM, fontSize: 18, lineHeight: 1.65, color: C.brownLt, maxWidth: 460, marginBottom: 40 }}>
              Schedule games, track standings, run tournaments, and collect registrations — all in one platform built for beach volleyball.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/register" style={{
                fontFamily: DM, fontWeight: 700, fontSize: 16,
                backgroundColor: C.terra, color: C.white,
                textDecoration: "none", padding: "14px 28px",
                borderRadius: 10, display: "inline-block",
                boxShadow: `0 4px 24px rgba(200,75,49,0.4)`,
                transition: "transform 0.15s, box-shadow 0.15s",
              }}>
                Create your organization
              </Link>
              <Link href="/login" style={{
                fontFamily: DM, fontWeight: 600, fontSize: 16,
                backgroundColor: "rgba(232,201,138,0.08)",
                border: `1px solid rgba(232,201,138,0.2)`,
                color: C.sand, textDecoration: "none",
                padding: "14px 28px", borderRadius: 10,
                display: "inline-block",
              }}>
                Sign in
              </Link>
            </div>
          </div>

          {/* Right: live scoreboard widget */}
          <div style={{ position: "relative" }}>
            <div style={{
              backgroundColor: C.espressoLt,
              border: `1px solid rgba(232,201,138,0.12)`,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,75,49,0.08)`,
            }}>
              {/* Widget header */}
              <div style={{
                padding: "14px 20px",
                borderBottom: `1px solid rgba(232,201,138,0.08)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                backgroundColor: "rgba(0,0,0,0.2)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#FF5F57","#FFBD2E","#28CA41"].map(c => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c, opacity: 0.7 }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: BARLOW, fontSize: 13, letterSpacing: "0.08em", color: C.brown, marginLeft: 6 }}>
                    SUMMER LEAGUE 2026 — WEEK 4
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block",
                    animation: "ping 1.5s ease-in-out infinite" }} />
                  <span style={{ fontFamily: DM, fontSize: 11, color: "#22c55e", fontWeight: 600 }}>LIVE</span>
                </div>
              </div>

              {/* Games */}
              <div style={{ padding: "8px 0" }}>
                {[
                  { home: "Sand Warriors", away: "Net Ninjas",   score: "21–18  21–15", label: "Final",       status: "final" },
                  { home: "Beach Bombers", away: "Spike Squad",  score: "18–14",        label: "Set 2 · Live", status: "live" },
                  { home: "Dig Deep",      away: "Block Party",  score: null,           label: "6:00 PM · Court 2", status: "upcoming" },
                ].map((g, i) => (
                  <div key={i} style={{
                    padding: "14px 20px",
                    borderBottom: i < 2 ? `1px solid rgba(232,201,138,0.06)` : undefined,
                    backgroundColor: g.status === "live" ? "rgba(200,75,49,0.08)" : undefined,
                    borderLeft: g.status === "live" ? `3px solid ${C.terra}` : "3px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: DM, fontSize: 14, fontWeight: 600, color: C.cream, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {g.home}
                        <span style={{ color: C.brown, fontWeight: 400, margin: "0 6px" }}>vs</span>
                        {g.away}
                      </p>
                      <p style={{ fontFamily: DM, fontSize: 12, color: C.brown }}>{g.label}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {g.score ? (
                        <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, color: g.status === "final" ? C.sand : C.terra, fontWeight: 600 }}>
                          {g.score}
                        </span>
                      ) : (
                        <span style={{ fontFamily: DM, fontSize: 12, color: C.brownLt, backgroundColor: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 100 }}>
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Widget footer */}
              <div style={{ padding: "12px 20px", borderTop: `1px solid rgba(232,201,138,0.06)`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,0,0,0.15)" }}>
                <span style={{ fontFamily: DM, fontSize: 12, color: C.brown }}>3 of 6 games today</span>
                <span style={{ fontFamily: DM, fontSize: 12, color: C.terra, fontWeight: 600, cursor: "pointer" }}>View full schedule →</span>
              </div>
            </div>

            {/* Floating stat badges */}
            <div style={{
              position: "absolute", bottom: -20, left: -24,
              backgroundColor: C.espresso, border: `1px solid rgba(232,201,138,0.15)`,
              borderRadius: 12, padding: "12px 18px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              <p style={{ fontFamily: BARLOW, fontSize: 28, fontWeight: 700, color: C.cream, lineHeight: 1 }}>2,400+</p>
              <p style={{ fontFamily: DM, fontSize: 12, color: C.brownLt, marginTop: 2 }}>games tracked</p>
            </div>
            <div style={{
              position: "absolute", top: -20, right: -20,
              backgroundColor: C.espresso, border: `1px solid rgba(200,75,49,0.2)`,
              borderRadius: 12, padding: "12px 18px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              <p style={{ fontFamily: BARLOW, fontSize: 28, fontWeight: 700, color: C.terra, lineHeight: 1 }}>Free</p>
              <p style={{ fontFamily: DM, fontSize: 12, color: C.brownLt, marginTop: 2 }}>to start</p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes ping {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.4); }
          }
          .nav-signin {
            font-size: 14px; color: ${C.brown}; text-decoration: none;
            padding: 8px 16px; border-radius: 8px; transition: color 0.2s;
          }
          .nav-signin:hover { color: ${C.espresso}; }
          .nav-cta {
            font-size: 14px; font-weight: 600;
            background-color: ${C.terra}; color: ${C.white};
            text-decoration: none; padding: 9px 20px; border-radius: 8px;
            transition: background-color 0.2s;
          }
          .nav-cta:hover { background-color: ${C.terraDim}; }
        `}</style>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: C.surface, borderTop: `1px solid rgba(26,14,6,0.08)`, borderBottom: `1px solid rgba(26,14,6,0.08)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { value: "Leagues & Tournaments", label: "Two event formats" },
            { value: "Real-time Standings",   label: "Always up to date" },
            { value: "Free Forever",          label: "No credit card needed" },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "28px 0",
              borderRight: i < 2 ? `1px solid rgba(26,14,6,0.08)` : undefined,
              paddingLeft: i > 0 ? 40 : 0,
              paddingRight: i < 2 ? 40 : 0,
            }}>
              <p style={{ fontFamily: BARLOW, fontSize: 20, fontWeight: 700, color: C.espresso, letterSpacing: "0.02em" }}>{s.value}</p>
              <p style={{ fontFamily: DM, fontSize: 13, color: C.brown, marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: C.cream, padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: BARLOW, fontSize: 13, letterSpacing: "0.15em", color: C.terra, fontWeight: 700, marginBottom: 12, textTransform: "uppercase" }}>
              Platform features
            </p>
            <h2 style={{ fontFamily: BARLOW, fontWeight: 800, fontSize: "clamp(2.4rem, 5vw, 4rem)", color: C.espresso, lineHeight: 0.95, textTransform: "uppercase", maxWidth: 600 }}>
              Everything you need to run your season
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {[
              {
                n: "01", title: "Leagues & Tournaments",
                body: "Run multi-week round-robin leagues or single/double elimination tournaments with pool play — or both.",
              },
              {
                n: "02", title: "Live Standings",
                body: "Standings calculated in real time from game scores. Set ratios, point percentages, and tiebreakers handled automatically.",
              },
              {
                n: "03", title: "Smart Scheduling",
                body: "Auto-generate weekly schedules with court assignments. Collect player availability to minimize conflicts.",
              },
              {
                n: "04", title: "Registration & Payments",
                body: "Accept fees via PayPal. Leagues charge per player; tournaments per team. Zero-fee events skip payment entirely.",
              },
              {
                n: "05", title: "Live Score Entry",
                body: "Scorers enter results in real time. The public schedule updates instantly — no page refresh needed.",
              },
              {
                n: "06", title: "Multi-Organization",
                body: "Run multiple organizations from one account. Invite admins, scorers, and players with simple join codes.",
              },
            ].map((f, i) => (
              <div key={i} style={{
                backgroundColor: C.white,
                padding: "36px 32px",
                position: "relative",
                border: `1px solid rgba(26,14,6,0.07)`,
                margin: -1,
              }}>
                <span style={{ fontFamily: BARLOW, fontSize: 52, fontWeight: 800, color: C.terra, opacity: 0.2, lineHeight: 1, display: "block", marginBottom: 16 }}>
                  {f.n}
                </span>
                <h3 style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 22, color: C.espresso, letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 12 }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: DM, fontSize: 15, color: C.brown, lineHeight: 1.65 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(160deg, ${C.espresso} 0%, ${C.espressoMid} 50%, #0A0602 100%)`,
        padding: "100px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Warm glow */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 60%, rgba(200,75,49,0.15) 0%, transparent 60%)`, pointerEvents: "none" }} />
        {/* Sand texture top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(232,201,138,0.3), transparent)` }} />

        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "rgba(232,201,138,0.1)", border: `1px solid rgba(232,201,138,0.2)`, borderRadius: 100, padding: "6px 16px", marginBottom: 32 }}>
            <span style={{ fontFamily: DM, fontSize: 13, color: C.sand }}>Join organizations already using Beach VB League</span>
          </div>

          <h2 style={{
            fontFamily: BARLOW, fontWeight: 800,
            fontSize: "clamp(2.8rem, 6vw, 5.5rem)",
            color: C.cream, lineHeight: 0.93,
            textTransform: "uppercase", marginBottom: 24,
          }}>
            Your league,<br />
            <span style={{ color: C.terra }}>set up in minutes</span>
          </h2>

          <p style={{ fontFamily: DM, fontSize: 18, color: C.brownLt, lineHeight: 1.65, marginBottom: 48, maxWidth: 520, margin: "0 auto 48px" }}>
            Create your organization, invite players, and start scheduling. Free forever for small leagues.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/register" style={{
              fontFamily: DM, fontWeight: 700, fontSize: 16,
              backgroundColor: C.terra, color: C.white,
              textDecoration: "none", padding: "16px 36px",
              borderRadius: 10, display: "inline-block",
              boxShadow: `0 4px 32px rgba(200,75,49,0.45)`,
            }}>
              Create your organization →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: "#0A0602", borderTop: `1px solid rgba(232,201,138,0.06)`, padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VolleyballIcon size={20} color={C.brown} />
            <span style={{ fontFamily: BARLOW, fontSize: 16, letterSpacing: "0.05em", color: C.brown }}>BEACH VB LEAGUE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontFamily: DM, fontSize: 13, color: C.brown }}>© {new Date().getFullYear()}</span>
            <Link href="/login" style={{ fontFamily: DM, fontSize: 13, color: C.brown, textDecoration: "none" }}>Sign in</Link>
            <Link href="/register" style={{ fontFamily: DM, fontSize: 13, color: C.terra, textDecoration: "none", fontWeight: 600 }}>Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── SVG Components ──────────────────────────────────────────────────────────
function VolleyballIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 6.32 16.07" />
      <path d="M2.68 16.07A10 10 0 0 1 12 2" />
      <path d="M12 22a10 10 0 0 1-6.32-16.07" />
      <path d="M21.32 7.93A10 10 0 0 1 12 22" />
    </svg>
  );
}
