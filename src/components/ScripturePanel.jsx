// ScripturePanel — pinned right-column passage display for the Study tab.
//
// SPRD C2 (2026-05-04). The pastor lives with the text open while answering
// exegetical questions; this column removes the "open passage popup" context
// switch by making the passage always visible alongside the writing surface.
//
// Renders sermon.passage by calling the existing fetchPassage IPC.
//
// fetchPassage shape:
//   { esv: <string|null>, esvPending: <bool>, esvError: <string|undefined> }
// where esvPending=true means no ESV API key is configured.
//
// TODO (deferred per user 2026-05-04): scripture search / jump function so
// pastors can quickly look up a different passage without leaving the column.
// TODO (deferred): linked-verse highlight per active field — needs verseRange
// per field def in studyFields.js.

import React, { useEffect, useState } from "react";
import { fetchPassage } from "../db/database";
import "./scripturePanel.css";

// Parse ESV API text into [{ verse: <num|null>, text: <string> }] segments.
// ESV API format: optional header line, then verses in `[N]` markers, e.g.
//   "  [1] Finally, my brothers, rejoice in the Lord. To write the same..."
// Verse-less prose (intros, headings) becomes a segment with verse=null.
function parseEsvText(esvText) {
  if (!esvText || typeof esvText !== "string") return [];
  // Split on the [N] verse markers, capturing the number.
  const parts = esvText.split(/\[(\d+)\]\s*/);
  // First chunk before any [N] is intro/header text. Following pairs are
  // [number, text, number, text, ...].
  const segments = [];
  if (parts[0] && parts[0].trim()) {
    segments.push({ verse: null, text: parts[0].trim() });
  }
  for (let i = 1; i < parts.length; i += 2) {
    const verse = parseInt(parts[i], 10);
    const text = (parts[i + 1] || "").trim();
    if (text) segments.push({ verse, text });
  }
  return segments;
}

export default function ScripturePanel({ passage, translation = "ESV" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!passage || !passage.trim()) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPassage(passage)
      .then((result) => {
        if (cancelled) return;
        setData(result || {});
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load passage.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [passage]);

  const segments = data?.esv ? parseEsvText(data.esv) : [];
  const pending = !!data?.esvPending;
  const apiError = data?.esvError;

  return (
    <aside className="scripture-panel" aria-label="Scripture passage">
      <div className="scripture-header">
        <span className="scripture-ref">{passage || "(no passage set)"}</span>
        <span className="scripture-translation">{translation}</span>
      </div>

      <div className="scripture-body">
        {loading && (
          <div className="scripture-status">Fetching ESV…</div>
        )}
        {!loading && error && (
          <div className="scripture-status scripture-error">{error}</div>
        )}
        {!loading && !error && pending && (
          <div className="scripture-status scripture-pending">
            ESV scripture lookup is unavailable — an ESV API key has not been configured for this install.
          </div>
        )}
        {!loading && !error && apiError && (
          <div className="scripture-status scripture-error">
            ESV API: {apiError}
          </div>
        )}
        {!loading && !error && !pending && !apiError && segments.length > 0 && (
          <div className="scripture-prose">
            {segments.map((s, i) => (
              <span key={i} className="scripture-segment">
                {s.verse !== null && (
                  <sup className="scripture-verse-num">{s.verse}</sup>
                )}
                {s.text}
                {i < segments.length - 1 ? " " : ""}
              </span>
            ))}
          </div>
        )}
        {!loading && !error && !pending && !apiError && segments.length === 0 && passage && data && (
          <div className="scripture-status">Passage text not yet available.</div>
        )}
      </div>
    </aside>
  );
}
