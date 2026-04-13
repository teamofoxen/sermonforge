// DemoSplash.jsx — First-time modal when "See Demo" is clicked.
// Orients the viewer before they start exploring.

import { useDemo } from "../contexts/DemoContext";

export default function DemoSplash() {
  const { showSplash, markSplashSeen, disableDemoMode } = useDemo();

  if (!showSplash) return null;

  const steps = [
    { n: 1, label: "Series Planner", desc: "Open the series to see the full arc — big idea, theological context, why this congregation needs it now. These fields feed the AI's awareness of the series." },
    { n: 2, label: "Sermon Workspace", desc: "Open any sermon. The Study tab holds the full exegesis worksheet — four phases from observation to implications, each feeding the AI's context." },
    { n: 3, label: "AI Panel", desc: "Open \"Chat with AI\" in any sermon. Then click \"Preview Context\" to see exactly what was assembled and sent — tier by tier." },
    { n: 4, label: "Study Guide", desc: "Back in the Series Planner, click \"Study Guide\" in the top bar to export a formatted congregation guide for the whole series." },
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(26,20,16,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
      onClick={markSplashSeen}
    >
      <div
        style={{
          background: "var(--parchment)", borderRadius: "12px",
          padding: "36px 40px", maxWidth: "560px", width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            fontSize: "11px", fontFamily: "'Crimson Pro', serif", fontWeight: "700",
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--gold)", background: "var(--gold-pale)",
            border: "1px solid var(--gold)", borderRadius: "8px",
            padding: "2px 10px",
          }}>
            Demo Mode
          </span>
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontSize: "22px",
          fontWeight: "700", color: "var(--ink)", margin: "0 0 8px",
        }}>
          The Sermon on the Mount — fully prepared
        </h2>
        <p style={{
          fontFamily: "'Crimson Pro', serif", fontSize: "15px",
          color: "var(--ink-mid)", lineHeight: "1.6", margin: "0 0 24px",
        }}>
          This is a complete, realistic series with 6 sermons at different stages of preparation.
          Tier annotations are now visible on every field — hover them to learn what each tier does
          and how it shapes the AI's response.
        </p>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
          {steps.map(s => (
            <div key={s.n} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{
                width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                background: "var(--ink)", color: "var(--gold)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Playfair Display', serif", fontSize: "13px", fontWeight: "700",
              }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: "600", color: "var(--ink)", marginBottom: "2px" }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: "13px", color: "var(--ink-soft)", lineHeight: "1.5" }}>
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="btn-primary"
            onClick={markSplashSeen}
            style={{ flex: 1, padding: "10px" }}
          >
            Start Exploring
          </button>
          <button
            className="btn-ghost"
            onClick={() => { disableDemoMode(); markSplashSeen(); }}
            style={{ fontSize: "13px", color: "var(--ink-ghost)" }}
          >
            Exit Demo
          </button>
        </div>
      </div>
    </div>
  );
}
