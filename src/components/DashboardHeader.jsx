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
          style={{
            position: "absolute",
            inset: 7,
            width: "calc(100% - 14px)",
            height: "calc(100% - 14px)",
            objectFit: "cover",
            objectPosition: "center 20%",
          }}
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

export default function DashboardHeader() {
  // Pick once on mount; stays stable for the session unless user clicks arrows.
  const [idx, setIdx] = useState(() =>
    Math.floor(Math.random() * PREACHER_QUOTES.length)
  );
  const q = PREACHER_QUOTES[idx];

  const next = () => setIdx((i) => (i + 1) % PREACHER_QUOTES.length);
  const prev = () =>
    setIdx((i) => (i - 1 + PREACHER_QUOTES.length) % PREACHER_QUOTES.length);

  return (
    <div className="dash-header">
      <div className="dash-header-inner">
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
              <span style={{ flex: 1 }} />
              <button
                className="quote-nav"
                onClick={prev}
                aria-label="Previous quote"
                type="button"
              >
                ‹
              </button>
              <button
                className="quote-nav"
                onClick={next}
                aria-label="Next quote"
                type="button"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
