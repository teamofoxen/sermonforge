import { useEffect, useState, useLayoutEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useTour } from "../contexts/TourContext";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import TextButton from "./primitives/TextButton";

// Polls the target element's bounding rect on a short interval so the spotlight
// follows layout changes (tab switches, accordion opens, scroll). Cheap — a few
// reads of getBoundingClientRect per second only while the tour is active.
function useAnchorRect(anchorId, active) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!active || !anchorId) {
      setRect(null);
      return;
    }
    let raf = 0;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour-id="${anchorId}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect((prev) => {
          if (prev && prev.x === r.x && prev.y === r.y && prev.width === r.width && prev.height === r.height) {
            return prev;
          }
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        });
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(measure);
    };
    measure();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [anchorId, active]);

  return rect;
}

export default function TourOverlay() {
  const { active, currentStop, index, stops, next, prev, leave } = useTour();
  const anchorId = currentStop?.anchorId;
  const rect = useAnchorRect(anchorId, active);

  // Bring the current anchor into view when the stop changes, so the spotlight
  // lands on something the user can actually see.
  useEffect(() => {
    if (!active || !anchorId) return;
    const el = document.querySelector(`[data-tour-id="${anchorId}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active, anchorId]);

  // ESC = leave tour
  useEffect(() => {
    if (!active) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        leave();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, leave]);

  if (!active || !currentStop) return null;

  const total      = stops.length;
  const stepNumber = index + 1;
  const isLast     = index >= total - 1;

  // Spotlight geometry: radial gradient centered on the target element. Falls
  // back to viewport center when the anchor isn't found yet.
  const cx = rect ? rect.x + rect.width  / 2 : window.innerWidth  / 2;
  const cy = rect ? rect.y + rect.height / 2 : window.innerHeight / 2;
  const radius = rect ? Math.max(rect.width, rect.height) / 2 + 24 : 0;

  const vignetteStyle = rect
    ? {
        background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${radius}px, rgba(0,0,0,0.55) ${radius + 200}px)`,
      }
    : { background: "rgba(0,0,0,0.55)" };

  // Glow ring tracks the element's bounding rect.
  const glowStyle = rect
    ? {
        position: "fixed",
        left: rect.x - 6,
        top: rect.y - 6,
        width: rect.width + 12,
        height: rect.height + 12,
        borderRadius: "8px",
        boxShadow: "0 0 0 2px var(--gold), 0 0 24px 4px rgba(199,160,80,0.45)",
        pointerEvents: "none",
        transition: "left 180ms ease, top 180ms ease, width 180ms ease, height 180ms ease",
      }
    : null;

  return (
    <>
      {/* Vignette — blocks clicks on underlying UI while the tour is active. */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          ...vignetteStyle,
          transition: "background 180ms ease",
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Glow ring around the target element. */}
      {glowStyle && <div style={glowStyle} />}

      {/* Callout card — fixed bottom-right. Phase 3 will refine positioning. */}
      <div
        style={{
          position: "fixed",
          right: "32px",
          bottom: "32px",
          width: "380px",
          zIndex: 9100,
          background: "var(--ink)",
          color: "var(--parchment)",
          borderTop: "2px solid var(--gold)",
          borderRadius: "var(--radius)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          padding: "20px 22px 18px",
          fontFamily: "var(--font-serif)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: "10px",
          }}
        >
          Step {stepNumber} of {total}
        </div>

        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "18px",
            fontWeight: 700,
            lineHeight: 1.3,
            marginBottom: "10px",
            color: "var(--parchment)",
          }}
        >
          {currentStop.title}
        </div>

        <div
          className="tour-callout-body"
          style={{
            fontSize: "15px",
            lineHeight: 1.55,
            color: "var(--parchment)",
            opacity: 0.9,
            marginBottom: "18px",
          }}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
              strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
              em: ({ children }) => <em style={{ fontStyle: "italic", color: "var(--gold)" }}>{children}</em>,
            }}
          >
            {currentStop.body}
          </ReactMarkdown>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <TextButton
            onClick={leave}
            className="btn-text-dark"
            style={{ fontSize: "13px", padding: "4px 0" }}
          >
            Leave tour
          </TextButton>

          <div style={{ display: "flex", gap: "8px" }}>
            {index > 0 && (
              <SecondaryButton
                size="sm"
                onClick={prev}
                className="btn-ghost-dark"
              >
                Back
              </SecondaryButton>
            )}
            <PrimaryButton
              size="sm"
              onClick={next}
              style={{ fontWeight: 700 }}
            >
              {isLast ? "Finish" : "Next"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </>
  );
}
