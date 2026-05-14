import { useState } from "react";

const C = {
  void: "#000000",
  line: "#ffffff",
  lineMid: "rgba(255,255,255,0.55)",
  lineDim: "rgba(255,255,255,0.22)",
  lineGhost: "rgba(255,255,255,0.08)",
  // Phosphor green — CRT terminal, "signal active"
  phosphor: "#3abd6f",
  phosphorDim: "rgba(58,189,111,0.15)",
  phosphorGlow: "rgba(58,189,111,0.06)",
  // Amber — 60s readout warmth, secondary text
  amber: "#c9a24a",
  amberMid: "rgba(201,162,74,0.7)",
  amberDim: "rgba(201,162,74,0.4)",
  // Red — warnings, alerts only
  red: "#b84040",
  redDim: "rgba(184,64,64,0.15)",
};

const T = ({ children, size = 12, color = C.line, style = {}, block = false }) => (
  <span style={{
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: size, color, letterSpacing: "0.04em",
    display: block ? "block" : "inline", ...style,
  }}>{children}</span>
);

const Label = ({ children, style = {} }) => (
  <T size={9} color={C.amberDim} style={{ textTransform: "uppercase", letterSpacing: "0.14em", ...style }}>{children}</T>
);

const Crosshair = ({ size = 8 }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
    <line x1="4" y1="0" x2="4" y2="8" stroke={C.amberDim} strokeWidth="0.5" />
    <line x1="0" y1="4" x2="8" y2="4" stroke={C.amberDim} strokeWidth="0.5" />
    <circle cx="4" cy="4" r="2" fill="none" stroke={C.amberDim} strokeWidth="0.5" />
  </svg>
);

const StatusDot = ({ active = true, color }) => (
  <div style={{
    width: 5, height: 5, borderRadius: "50%",
    background: active ? (color || C.phosphor) : "transparent",
    border: active ? "none" : `1px solid ${C.lineDim}`,
    boxShadow: active ? `0 0 6px ${(color || C.phosphor)}44` : "none",
  }} />
);

const MoodBar = ({ value, max = 5 }) => (
  <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
    {Array.from({ length: max }, (_, i) => (
      <div key={i} style={{
        width: 12, height: 3,
        background: i < value ? C.phosphor : C.lineGhost,
        opacity: i < value ? 0.7 : 1,
      }} />
    ))}
  </div>
);

const CornerMarks = ({ size = 6 }) => (
  <>
    <div style={{ position: "absolute", top: -1, left: -1, width: size, height: size, borderTop: `1px solid ${C.lineMid}`, borderLeft: `1px solid ${C.lineMid}` }} />
    <div style={{ position: "absolute", top: -1, right: -1, width: size, height: size, borderTop: `1px solid ${C.lineMid}`, borderRight: `1px solid ${C.lineMid}` }} />
    <div style={{ position: "absolute", bottom: -1, left: -1, width: size, height: size, borderBottom: `1px solid ${C.lineMid}`, borderLeft: `1px solid ${C.lineMid}` }} />
    <div style={{ position: "absolute", bottom: -1, right: -1, width: size, height: size, borderBottom: `1px solid ${C.lineMid}`, borderRight: `1px solid ${C.lineMid}` }} />
  </>
);

const Ruler = ({ count = 40 }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} style={{
        width: 2,
        height: i % 10 === 0 ? 8 : i % 5 === 0 ? 5 : 3,
        background: i % 10 === 0 ? C.amberDim : C.lineDim,
      }} />
    ))}
  </div>
);

const EntryCard = ({ title, date, excerpt, mood, tags, index }) => (
  <div style={{
    border: `1px solid ${C.lineDim}`,
    padding: "14px 16px",
    cursor: "pointer",
    transition: "border-color 0.2s",
    position: "relative",
  }}
  onMouseEnter={e => e.currentTarget.style.borderColor = C.lineMid}
  onMouseLeave={e => e.currentTarget.style.borderColor = C.lineDim}
  >
    <CornerMarks />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
      <div>
        <T size={9} color={C.amberDim} style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
          ENTRY {index}
        </T>
        <T size={13} color={C.line} style={{ display: "block", marginTop: 4, lineHeight: 1.3 }}>{title}</T>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <T size={9} color={C.amberDim} style={{ letterSpacing: "0.08em" }}>{date}</T>
        <MoodBar value={mood} />
      </div>
    </div>
    <T size={10.5} color={C.lineMid} style={{ display: "block", lineHeight: 1.7, marginBottom: 10 }}>
      {excerpt}
    </T>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {tags.map(t => (
        <span key={t} style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
          color: C.amber, border: `1px solid ${C.amberDim}`,
          padding: "2px 6px", letterSpacing: "0.04em",
          opacity: 0.7,
        }}>[[{t}]]</span>
      ))}
    </div>
  </div>
);

const PromptRow = ({ text, answered, id }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "8px 0",
    borderBottom: `1px solid ${C.lineGhost}`,
  }}>
    <div style={{
      width: 14, height: 14, flexShrink: 0, marginTop: 1,
      border: `1px solid ${answered ? C.phosphor : C.lineDim}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: answered ? C.phosphor : "transparent",
      boxShadow: answered ? `0 0 8px ${C.phosphor}33` : "none",
    }}>
      {answered && <span style={{ fontSize: 9, color: C.void, fontWeight: 800, lineHeight: 1 }}>✓</span>}
    </div>
    <div style={{ flex: 1 }}>
      <T size={10.5} color={answered ? C.lineMid : C.line} style={{
        lineHeight: 1.5,
        opacity: answered ? 0.5 : 1,
      }}>{text}</T>
    </div>
    <T size={9} color={C.amberDim} style={{ flexShrink: 0, letterSpacing: "0.08em" }}>P-{id}</T>
  </div>
);

export default function Laika() {
  const [view, setView] = useState("desktop");
  const isMobile = view === "mobile";
  const maxW = isMobile ? 420 : 940;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.void,
      color: C.line,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Top Status Bar */}
      <div style={{
        borderBottom: `1px solid ${C.lineDim}`,
        padding: "8px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <T size={9} color={C.amberDim} style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ASSET ID: USR-JONES-01
          </T>
          <div style={{ width: 1, height: 10, background: C.lineGhost }} />
          <T size={9} color={C.amberDim} style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
            STATUS: ONLINE
          </T>
          <StatusDot />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {["desktop", "mobile"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "3px 8px", border: `1px solid ${view === v ? C.amberDim : "transparent"}`,
              cursor: "pointer", background: "transparent",
              color: view === v ? C.amber : C.amberDim,
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${C.lineGhost}`,
        padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <T size={22} color={C.line} style={{ fontWeight: 300, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            ЛАЙКА
          </T>
          <T size={10} color={C.amberDim} style={{ letterSpacing: "0.16em" }}>LAIKA</T>
          <T size={9} color={C.amberDim} style={{ letterSpacing: "0.06em", opacity: 0.5 }}>v0.1</T>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {[
            { name: "JOURNAL", active: true },
            { name: "REFLECTIONS", active: false },
            { name: "PROMPTS", active: false },
            { name: "EXPORT", active: false },
          ].map(item => (
            <T key={item.name} size={9} color={item.active ? C.line : C.amberDim}
               style={{
                 letterSpacing: "0.14em", cursor: "pointer",
                 borderBottom: item.active ? `1px solid ${C.phosphor}` : "1px solid transparent",
                 paddingBottom: 3,
                 transition: "color 0.15s",
               }}>
              {item.name}
            </T>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: maxW, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "36px 24px 60px" }}>

        {/* Header Block */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Crosshair />
            <Label>
              SYSTEM DATE: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".")} — {new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
            </Label>
          </div>
          <T size={isMobile ? 20 : 24} color={C.line} style={{
            fontWeight: 300, letterSpacing: "0.06em",
            display: "block", lineHeight: 1.4,
          }}>
            WHAT ARE YOU CARRYING TODAY?
          </T>
          <div style={{ marginTop: 12 }}><Ruler /></div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: "flex", gap: 16, marginBottom: 40,
          flexDirection: isMobile ? "column" : "row",
        }}>
          {[
            { label: "NEW ENTRY", sub: "FREEFORM TRANSMISSION", status: "READY", statusColor: C.phosphor },
            { label: "WEEKLY REFLECTION", sub: "WEEK 20 — CYCLE IN PROGRESS", status: "3/6", statusColor: C.amber },
          ].map(btn => (
            <button key={btn.label} style={{
              flex: 1, background: "transparent",
              border: `1px solid ${C.lineDim}`,
              padding: "20px",
              cursor: "pointer", textAlign: "left",
              transition: "border-color 0.2s",
              position: "relative",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.lineMid}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.lineDim}
            >
              <CornerMarks size={8} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <T size={13} style={{ fontWeight: 600, letterSpacing: "0.1em" }}>{btn.label}</T>
                <T size={9} color={btn.statusColor} style={{ letterSpacing: "0.08em" }}>{btn.status}</T>
              </div>
              <T size={9} color={C.amberDim} style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>{btn.sub}</T>
            </button>
          ))}
        </div>

        {/* Two Column Layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 36 : 24,
        }}>

          {/* Left — Transmission Log */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Crosshair />
              <Label>TRANSMISSION LOG — RECENT</Label>
              <div style={{ flex: 1, height: 1, background: C.lineGhost }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <EntryCard
                index="0047"
                title="On the factory floor of the self"
                date="05.12.2026"
                excerpt="There's a rusted valve somewhere in me that controls how much I let myself feel about the work. Not the compliance work — the real work..."
                mood={4}
                tags={["writing", "recovery", "minsky"]}
              />
              <EntryCard
                index="0046"
                title="Tuesday, unfiltered"
                date="05.11.2026"
                excerpt="Didn't write. Didn't try to write. Sat on the porch and watched the neighbor's kid throw a baseball against the garage door for forty minutes..."
                mood={3}
                tags={["stillness"]}
              />
              <EntryCard
                index="0045"
                title="The atomic thought about mercy"
                date="05.09.2026"
                excerpt="Minsky says the mind is a society of agents. If that's true, then mercy is the agent that tells the others to stand down..."
                mood={5}
                tags={["minsky", "poetry", "atomic-thoughts"]}
              />
            </div>
          </div>

          {/* Right — Diagnostics */}
          <div>
            {/* Reflection Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Crosshair />
              <Label>REFLECTION CYCLE — WEEK 20</Label>
              <div style={{ flex: 1, height: 1, background: C.lineGhost }} />
            </div>
            <div style={{
              border: `1px solid ${C.lineDim}`,
              padding: "16px",
              marginBottom: 24,
              position: "relative",
            }}>
              <CornerMarks />

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <Label>MAY 11 – 17, 2026</Label>
                <T size={11} color={C.phosphor} style={{ fontWeight: 600 }}>3 / 6</T>
              </div>

              <PromptRow text="Did you write this week?" answered id="001" />
              <PromptRow text="Atomic thoughts converted to poetry?" answered id="002" />
              <PromptRow text="How did you treat your body?" answered id="003" />
              <PromptRow text="What builds are you working on?" answered={false} id="004" />
              <PromptRow text="How's your reading orbit?" answered={false} id="005" />
              <PromptRow text="What did you learn about yourself?" answered={false} id="006" />

              {/* Progress */}
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 2, background: C.lineGhost }}>
                  <div style={{
                    height: "100%", width: "50%",
                    background: C.phosphor,
                    boxShadow: `0 0 6px ${C.phosphor}33`,
                  }} />
                </div>
                <T size={9} color={C.amberDim}>50%</T>
              </div>
            </div>

            {/* System Diagnostics */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Crosshair />
              <Label>SYSTEM DIAGNOSTICS</Label>
              <div style={{ flex: 1, height: 1, background: C.lineGhost }} />
            </div>
            <div style={{ border: `1px solid ${C.lineDim}`, padding: "16px", marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Label>MOOD — 14 DAY ARRAY</Label>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40, marginTop: 8 }}>
                    {[3,4,4,2,3,5,4,3,4,5,3,4,3,4].map((v, i) => (
                      <div key={i} style={{
                        flex: 1, height: `${(v/5)*100}%`,
                        background: v >= 4 ? C.phosphor : C.line,
                        opacity: v >= 4 ? 0.6 : 0.15 + (v/5) * 0.3,
                      }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <T size={8} color={C.amberDim}>-14D</T>
                    <T size={8} color={C.amberDim}>NOW</T>
                  </div>
                </div>
                <div>
                  <Label>POWER OUTPUT</Label>
                  <div style={{ marginTop: 8 }}>
                    {[
                      { label: "AVG MOOD", value: "3.6 / 5.0", color: C.line },
                      { label: "ENTRIES", value: "47", color: C.line },
                      { label: "STREAK", value: "14 DAYS", color: C.phosphor },
                      { label: "EXPORTS", value: "12", color: C.line },
                    ].map(row => (
                      <div key={row.label} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "4px 0",
                        borderBottom: `1px solid ${C.lineGhost}`,
                      }}>
                        <T size={9} color={C.amberDim}>{row.label}</T>
                        <T size={9} color={row.color}>{row.value}</T>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Satellites */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Crosshair />
              <Label>ACTIVE SATELLITES — ORBIT STATUS</Label>
              <div style={{ flex: 1, height: 1, background: C.lineGhost }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { name: "WRITING", weeks: 12, status: "STABLE" },
                { name: "RECOVERY", weeks: 9, status: "STABLE" },
                { name: "BODY", weeks: 8, status: "STABLE" },
                { name: "BUILDS", weeks: 6, status: "NOMINAL" },
                { name: "READING", weeks: 5, status: "NOMINAL" },
                { name: "POETRY", weeks: 4, status: "NOMINAL" },
                { name: "MINSKY", weeks: 3, status: "NEW" },
              ].map(s => (
                <div key={s.name} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0",
                  borderBottom: `1px solid ${C.lineGhost}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusDot active color={s.status === "NEW" ? C.amber : C.phosphor} />
                    <T size={10} color={C.line} style={{ letterSpacing: "0.08em" }}>{s.name}</T>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <T size={9} color={C.amberDim}>{s.weeks}W</T>
                    <T size={8} color={s.status === "NEW" ? C.amber : C.amberDim} style={{
                      border: `1px solid ${s.status === "NEW" ? C.amberDim : C.lineGhost}`,
                      padding: "1px 5px",
                      letterSpacing: "0.08em",
                    }}>{s.status}</T>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48 }}>
          <Ruler count={60} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <T size={9} color={C.amberDim} style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>
              LAIKA v0.1 — TRANSMITTING FROM ORBIT
            </T>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StatusDot active />
              <T size={9} color={C.amberDim} style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>
                ALL SYSTEMS NOMINAL
              </T>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
