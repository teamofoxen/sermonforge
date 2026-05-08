import { useState, useEffect } from "react";
import { PREACHER_QUOTES } from "../datasets/preacherQuotes";

const portraitModules = import.meta.glob("../assets/portraits/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const PORTRAITS = Object.fromEntries(
  Object.entries(portraitModules).map(([path, url]) => {
    const id = path.split("/").pop().replace(/\.png$/, "");
    return [id, url];
  })
);

function StencilPortrait({ preacher }) {
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => { setImgOk(true); }, [preacher.id]);

  const url = PORTRAITS[preacher.id];

  return (
    <div className="preacher-stencil" style={{ width: 108, height: 135 }}>
      {imgOk && url ? (
        <img
          key={preacher.id}
          src={url}
          alt=""
          onError={() => setImgOk(false)}
        />
      ) : (
        <svg viewBox="0 0 60 80" fill="currentColor" preserveAspectRatio="xMidYMid meet">
          <ellipse cx="30" cy="22" rx="11" ry="13" />
          <path d="M 30 33 Q 22 36 18 44 L 14 78 L 46 78 L 42 44 Q 38 36 30 33 Z" />
          <rect x="26" y="35" width="8" height="3" fill="var(--parchment-warm)" />
        </svg>
      )}
      <span className="preacher-stencil-label">
        {preacher.name.split(/\s+/).slice(-1)[0]}
      </span>
    </div>
  );
}

// Build a shuffled order once per session that avoids placing two quotes
// from the same preacher consecutively. Greedy interleave: at each step
// pick from whichever preacher has the most remaining quotes (excluding
// whoever was just shown). This is the standard rearrangement algorithm —
// it succeeds whenever no preacher holds more than ceil(N/2) quotes.
function buildShuffledOrder() {
  const byId = new Map();
  PREACHER_QUOTES.forEach((q, i) => {
    if (!byId.has(q.id)) byId.set(q.id, []);
    byId.get(q.id).push(i);
  });
  for (const arr of byId.values()) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  const out = [];
  let lastId = null;
  while (true) {
    const remaining = [...byId.entries()].filter(([, arr]) => arr.length > 0);
    if (remaining.length === 0) break;
    const eligible = remaining.filter(([id]) => id !== lastId);
    const pool = eligible.length > 0 ? eligible : remaining;
    const maxLen = Math.max(...pool.map(([, arr]) => arr.length));
    const top = pool.filter(([, arr]) => arr.length === maxLen);
    const [id, arr] = top[Math.floor(Math.random() * top.length)];
    out.push(arr.shift());
    lastId = id;
  }
  return out;
}

const ORDER = buildShuffledOrder();

// Module-level cursor: persists across mounts so re-entering the dashboard
// during a session shows the next quote, not the same one.
let lastShownIdx = -1;
function nextStartIdx() {
  if (lastShownIdx < 0) {
    lastShownIdx = Math.floor(Math.random() * ORDER.length);
  } else {
    lastShownIdx = (lastShownIdx + 1) % ORDER.length;
  }
  return lastShownIdx;
}

const ROTATE_MS = 15000;

export default function DashboardPreacherQuote() {
  const [idx, setIdx] = useState(nextStartIdx);
  const q = PREACHER_QUOTES[ORDER[idx]];

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => {
        const n = (i + 1) % ORDER.length;
        lastShownIdx = n;
        return n;
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dash-footer-quote">
      <div className="hdr-illuminated">
        <StencilPortrait preacher={q} />

        <div className="quote-center">
          <div className="quote-eyebrow">
            <span className="rule" />
            <span>From&nbsp;the&nbsp;pulpit</span>
          </div>
          <div className="quote-text">{q.quote}</div>
          <div className="quote-attr">
            <span className="name">{q.name}</span>
            <span className="sep" />
            <span className="dates">{q.dates}</span>
            <span className="sep" />
            <span className="citation">{q.citation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
