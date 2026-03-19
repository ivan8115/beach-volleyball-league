const PALETTES = [
  {
    id: "coastal-night",
    name: "Coastal Night",
    tag: "Current",
    description: "Deep navy ocean meets sunset coral. Dramatic and sporty.",
    colors: {
      base:     { hex: "#09111F", label: "Base" },
      baseMid:  { hex: "#0F1E33", label: "Surface" },
      accent:   { hex: "#FF5C1A", label: "Accent" },
      sand:     { hex: "#E8C98A", label: "Highlight" },
      muted:    { hex: "#6B82A0", label: "Muted" },
      feature:  { hex: "#F5F0E8", label: "Light section" },
    },
    dark: true,
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    tag: "Warm",
    description: "Dark espresso base with amber gold — like the last light of the day.",
    colors: {
      base:     { hex: "#14100A", label: "Base" },
      baseMid:  { hex: "#1E1608", label: "Surface" },
      accent:   { hex: "#F5A623", label: "Accent" },
      sand:     { hex: "#FDE68A", label: "Highlight" },
      muted:    { hex: "#8B7355", label: "Muted" },
      feature:  { hex: "#FFFBF0", label: "Light section" },
    },
    dark: true,
  },
  {
    id: "pacific",
    name: "Pacific",
    tag: "Cool",
    description: "Deep ocean dark with electric cyan — clean, fresh, competitive.",
    colors: {
      base:     { hex: "#021B2E", label: "Base" },
      baseMid:  { hex: "#062840", label: "Surface" },
      accent:   { hex: "#00B4D8", label: "Accent" },
      sand:     { hex: "#90E0EF", label: "Highlight" },
      muted:    { hex: "#4A7A9B", label: "Muted" },
      feature:  { hex: "#F0F9FF", label: "Light section" },
    },
    dark: true,
  },
  {
    id: "desert-dusk",
    name: "Desert Dusk",
    tag: "Light mode",
    description: "Warm cream base with terracotta red — earthy, premium, inviting.",
    colors: {
      base:     { hex: "#FDF6EC", label: "Base" },
      baseMid:  { hex: "#F5EAD8", label: "Surface" },
      accent:   { hex: "#C84B31", label: "Accent" },
      sand:     { hex: "#1A0E06", label: "Text" },
      muted:    { hex: "#8B6A4F", label: "Muted" },
      feature:  { hex: "#FFFFFF", label: "Card" },
    },
    dark: false,
  },
  {
    id: "malibu-midnight",
    name: "Malibu Midnight",
    tag: "Bold",
    description: "Deep purple-black with electric lime — high contrast, unforgettable.",
    colors: {
      base:     { hex: "#0D0A1A", label: "Base" },
      baseMid:  { hex: "#150F2A", label: "Surface" },
      accent:   { hex: "#A8FF3E", label: "Accent" },
      sand:     { hex: "#D4ADFF", label: "Highlight" },
      muted:    { hex: "#6B5A8A", label: "Muted" },
      feature:  { hex: "#F7F5FF", label: "Light section" },
    },
    dark: true,
  },
];

const BARLOW = "var(--font-barlow)";
const DM     = "var(--font-dm)";

export default function PalettesPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0F1A", fontFamily: DM, padding: "60px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontFamily: BARLOW, fontSize: 12, letterSpacing: "0.2em", color: "#6B82A0", textTransform: "uppercase", marginBottom: 12 }}>
            Design system
          </p>
          <h1 style={{ fontFamily: BARLOW, fontWeight: 800, fontSize: "clamp(2.4rem, 5vw, 4rem)", color: "#FAFAF8", lineHeight: 0.95, textTransform: "uppercase", marginBottom: 16 }}>
            Color Palettes
          </h1>
          <p style={{ fontSize: 15, color: "#6B82A0", maxWidth: 500 }}>
            Five palette options for the Beach VB League. Each shows how the colors work together across dark sections, card surfaces, accents, and light feature areas.
          </p>
        </div>

        {/* Palettes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {PALETTES.map((p) => (
            <div key={p.id} style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#111827",
            }}>
              {/* Palette header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <h2 style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 22, color: "#FAFAF8", letterSpacing: "0.02em", textTransform: "uppercase", margin: 0 }}>
                    {p.name}
                  </h2>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "3px 10px", borderRadius: 100, textTransform: "uppercase",
                    backgroundColor: p.id === "coastal-night" ? "rgba(255,92,26,0.15)" : "rgba(255,255,255,0.07)",
                    color: p.id === "coastal-night" ? "#FF5C1A" : "#9BAFC8",
                    border: p.id === "coastal-night" ? "1px solid rgba(255,92,26,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  }}>
                    {p.tag}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6B82A0", margin: 0, maxWidth: 300, textAlign: "right" }}>
                  {p.description}
                </p>
              </div>

              {/* Color swatches */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
                {Object.values(p.colors).map((c) => (
                  <div key={c.hex} style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ height: 80, backgroundColor: c.hex }} />
                    <div style={{ padding: "10px 12px", backgroundColor: "#0D1117" }}>
                      <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#FAFAF8", margin: 0, marginBottom: 2 }}>
                        {c.hex}
                      </p>
                      <p style={{ fontSize: 11, color: "#4A5568", margin: 0 }}>{c.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini preview */}
              <div style={{ padding: 24, backgroundColor: "#0A0F18" }}>
                <p style={{ fontSize: 11, color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 700 }}>
                  Preview
                </p>
                <MiniPreview palette={p} />
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#4A5568", marginTop: 48 }}>
          Tell Claude which palette you want and it'll apply it across the site.
        </p>
      </div>
    </div>
  );
}

function MiniPreview({ palette }: { palette: typeof PALETTES[0] }) {
  const { base, baseMid, accent, sand, muted, feature } = palette.colors;
  const textColor = palette.dark ? "#FAFAF8" : palette.colors.sand.hex;
  const mutedText = palette.dark ? "#9BAFC8" : muted.hex;

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Nav */}
      <div style={{ backgroundColor: base.hex, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid rgba(128,128,128,0.1)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: accent.hex }} />
          <span style={{ fontFamily: BARLOW, fontSize: 11, fontWeight: 700, color: textColor, letterSpacing: "0.05em" }}>BEACH VB LEAGUE</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, color: mutedText }}>Sign in</span>
          <span style={{ fontSize: 10, backgroundColor: accent.hex, color: palette.dark ? "#fff" : "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>Get started</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ backgroundColor: base.hex, padding: "20px 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ width: 60, height: 4, backgroundColor: accent.hex, borderRadius: 2, marginBottom: 8, opacity: 0.6 }} />
          <p style={{ fontFamily: BARLOW, fontWeight: 800, fontSize: 18, color: textColor, lineHeight: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Run Your <span style={{ color: accent.hex }}>League</span>
          </p>
          <p style={{ fontSize: 10, color: mutedText, marginBottom: 10, lineHeight: 1.5 }}>
            Schedule games, track standings, run tournaments.
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, backgroundColor: accent.hex, color: "#fff", padding: "4px 10px", borderRadius: 5, fontWeight: 600 }}>Get started</span>
            <span style={{ fontSize: 10, border: `1px solid rgba(128,128,128,0.3)`, color: mutedText, padding: "4px 10px", borderRadius: 5 }}>Sign in</span>
          </div>
        </div>
        {/* Mini scoreboard */}
        <div style={{ backgroundColor: baseMid.hex, borderRadius: 8, overflow: "hidden", border: `1px solid rgba(128,128,128,0.1)` }}>
          {[
            { teams: "Sand Warriors vs Net Ninjas", score: "Final", live: false },
            { teams: "Beach Bombers vs Spike Squad", score: "● Live", live: true },
            { teams: "Dig Deep vs Block Party",      score: "6 PM",  live: false },
          ].map((g, i) => (
            <div key={i} style={{
              padding: "6px 10px",
              borderBottom: i < 2 ? `1px solid rgba(128,128,128,0.08)` : undefined,
              borderLeft: g.live ? `2px solid ${accent.hex}` : "2px solid transparent",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 9, color: textColor, opacity: 0.9 }}>{g.teams}</span>
              <span style={{ fontSize: 9, color: g.live ? accent.hex : mutedText, fontWeight: g.live ? 700 : 400 }}>{g.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature strip */}
      <div style={{ backgroundColor: feature.hex, padding: "12px 16px", display: "flex", gap: 8 }}>
        {["01 Leagues", "02 Standings", "03 Scheduling"].map((f) => (
          <div key={f} style={{ flex: 1, padding: "8px 10px", backgroundColor: palette.dark ? "#fff" : "#f9f9f9", borderRadius: 6, border: "1px solid rgba(0,0,0,0.06)" }}>
            <span style={{ fontFamily: BARLOW, fontSize: 13, fontWeight: 700, color: accent.hex, opacity: 0.35 }}>{f.slice(0, 2)}</span>
            <p style={{ fontFamily: BARLOW, fontSize: 10, fontWeight: 700, color: "#1A202C", textTransform: "uppercase", marginTop: 2 }}>{f.slice(3)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
