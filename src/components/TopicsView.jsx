import { useState, useEffect, useMemo } from "react";
import { getAllSermons } from "../core/spine";
import { parseTags } from "../utils/tags";
import { parseLocalDate } from "../utils";
import { buttonKeydown } from "../utils/buttonKeydown";
import EmptyState from "./primitives/EmptyState";

// TopicsView — the "By topic" lens of the What I've Preached home (Coverage
// Initiative, Phase 4). Gathers every sermon's topic tags (sermon-level, set at
// prep in the workspace Topics field) and shows, per topic, the sermons under
// it. This is a BROWSE surface — "show what I've covered" — NEVER a scorecard or
// gap-finder: a missing tag is ambiguous (forgotten vs. never-preached), so the
// lens shows only what's been tagged and says nothing about what isn't. AI-free.

function formatWhen(date) {
  if (!date) return null;
  try {
    return parseLocalDate(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

export default function TopicsView({ onOpenSermon, _fixture }) {
  const [sermons, setSermons] = useState(_fixture?.sermons ?? []);
  const [loading, setLoading] = useState(!_fixture);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => { if (!_fixture) load(); }, []);

  async function load() {
    try {
      const all = await getAllSermons();
      setSermons(Array.isArray(all) ? all : []);
    } catch (e) {
      console.error("TopicsView load error:", e);
    } finally {
      setLoading(false);
    }
  }

  // tag (case-insensitive) → { tag, sermons[] }, ordered by how much it's been
  // preached (count desc, then alphabetical). Counting is descriptive — "what
  // I've covered" — never a target: there is no "missing topics" list anywhere.
  const topics = useMemo(() => {
    const map = new Map();
    for (const s of sermons) {
      for (const t of parseTags(s.tags)) {
        const key = t.toLowerCase();
        const entry = map.get(key);
        if (entry) entry.sermons.push(s);
        else map.set(key, { key, tag: t, sermons: [s] });
      }
    }
    return [...map.values()].sort((a, b) => b.sermons.length - a.sermons.length || a.tag.localeCompare(b.tag));
  }, [sermons]);

  // The selected topic, defaulting to the first when nothing's selected or the
  // selection no longer exists (one scan, not a some() + find()).
  const active = (selectedKey && topics.find((t) => t.key === selectedKey)) || topics[0] || null;
  const activeKey = active?.key ?? null;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="page-body">
        <EmptyState
          icon="🏷️"
          title="No topics tagged yet"
          description="Open a sermon and add topics in the Topics field, under the passage. Tag the ones that stand out — money, prayer, suffering — and they gather here so you can see what you've preached on."
        />
      </div>
    );
  }

  return (
    <div className="page-body">
      <p style={{ fontSize: "13px", color: "var(--ink-ghost)", margin: "0 0 16px", maxWidth: "640px", lineHeight: 1.5 }}>
        The topics you've tagged on your sermons, and the sermons under each. A look back at what you've
        preached on — not a checklist of what's left.
      </p>
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Topic rail */}
        <div className="card" style={{ flex: "0 0 220px", maxWidth: "100%" }}>
          <div className="card-header" style={{ marginBottom: "10px" }}>
            <h2 className="card-title">Topics</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {topics.map((t) => {
              const on = t.key === activeKey;
              return (
                <div
                  key={t.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedKey(t.key)}
                  onKeyDown={buttonKeydown(() => setSelectedKey(t.key))}
                  aria-current={on ? "true" : undefined}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px",
                    padding: "6px 10px", borderRadius: "var(--radius)", cursor: "pointer",
                    background: on ? "var(--parchment-deep)" : "transparent",
                    color: on ? "var(--ink)" : "var(--ink-soft)",
                    fontWeight: on ? 600 : 400, fontSize: "13.5px",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tag}</span>
                  <span style={{ color: "var(--ink-ghost)", fontSize: "12px", flexShrink: 0 }}>{t.sermons.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sermons under the selected topic */}
        <div className="card" style={{ flex: "1 1 420px", minWidth: 0 }}>
          <div className="card-header" style={{ marginBottom: "10px" }}>
            <h2 className="card-title" style={{ textTransform: "none" }}>{active?.tag}</h2>
            <span style={{ fontSize: "12px", color: "var(--ink-ghost)" }}>
              {active?.sermons.length} sermon{active && active.sermons.length === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {active?.sermons.map((s) => {
              const when = formatWhen(s.date);
              const title = s.name || s.title || "Untitled sermon";
              const meta = [s.series_title, s.passage, when].filter(Boolean).join(" · ");
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenSermon && onOpenSermon(s.id)}
                  onKeyDown={buttonKeydown(() => onOpenSermon && onOpenSermon(s.id))}
                  style={{
                    display: "flex", flexDirection: "column", gap: "2px",
                    padding: "10px 4px", borderTop: "1px solid var(--parchment-deep)",
                    cursor: onOpenSermon ? "pointer" : "default",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "var(--ink)" }}>{title}</span>
                  {meta && <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>{meta}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
