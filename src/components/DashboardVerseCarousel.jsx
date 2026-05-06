import { useState, useEffect } from "react";
import { PREACHING_VERSES } from "../datasets/preachingVerses";

// Module-level cursor: persists across mounts so re-entering the dashboard
// during a session shows the next verse, not the same one.
let lastShownIdx = -1;
function nextStartIdx() {
  if (lastShownIdx < 0) {
    lastShownIdx = Math.floor(Math.random() * PREACHING_VERSES.length);
  } else {
    lastShownIdx = (lastShownIdx + 1) % PREACHING_VERSES.length;
  }
  return lastShownIdx;
}

const ROTATE_MS = 15000;

export default function DashboardVerseCarousel() {
  const [idx, setIdx] = useState(nextStartIdx);
  const verse = PREACHING_VERSES[idx];

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => {
        const n = (i + 1) % PREACHING_VERSES.length;
        lastShownIdx = n;
        return n;
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dash-header">
      <div className="dash-header-inner">
        <div className="hdr-verse">
          <div className="quote-eyebrow">
            <span className="rule" />
            <span>From&nbsp;the&nbsp;Word</span>
          </div>
          <div className="verse-text">{verse.text}</div>
          <div className="quote-attr">
            <span className="ref">{verse.ref}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
