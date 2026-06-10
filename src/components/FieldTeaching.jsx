import { useRef, useState } from "react";
import { TextButton } from "./primitives/TextButton";

// FieldTeaching — renders a field's authored `overview` teaching block
// (the 3–4 paragraph explanations written in the SFDI/SADI walks and the
// 2026-06-09 OEM drafts; dead data since FieldOverviewScreen's deletion).
//
// Behavior (ratified): auto-open on the pastor's FIRST visit to the field
// per sermon, collapsed behind a quiet "About this field" link forever
// after, always re-expandable. First-visit tracking rides thresholds_seen
// via fieldOverviewThresholdId. The visit "ends" two ways: the pastor
// collapses the auto-opened block (handled here, onAutoOpenEnd) or moves
// to another field (handled by the parent's position write — see
// writePositionAndThresholds in SermonWorkspace). Deliberately NOT an
// unmount cleanup: that would also fire on StrictMode's simulated remount
// (dev) and on workspace close, and quitting mid-read must not count as
// "seen."
//
// Process #3 note: the auto-open is read as a per-field threshold (first
// arrival at a new KIND of work is a boundary) — an interpretation, flagged
// in the commit, not silently assumed.
export default function FieldTeaching({ overview, autoOpen, onAutoOpenEnd }) {
  const [open, setOpen] = useState(!!autoOpen);
  // At most one end-of-visit signal per mount, even if the parent's
  // re-render (which flips autoOpen off) lags a fast double-click.
  const endSentRef = useRef(false);

  if (!overview || !Array.isArray(overview.paragraphs) || overview.paragraphs.length === 0) {
    return null;
  }

  return (
    <div className="sws-teaching">
      <TextButton
        size="sm"
        className="sws-teaching-toggle"
        aria-expanded={open}
        onClick={() => {
          if (open && autoOpen && !endSentRef.current) {
            endSentRef.current = true;
            onAutoOpenEnd?.();
          }
          setOpen((v) => !v);
        }}
      >
        About this field {open ? "▾" : "▸"}
      </TextButton>
      {open && (
        <div className="sws-teaching-body">
          {overview.title && overview.title !== "" && (
            <div className="sws-teaching-title">{overview.title}</div>
          )}
          {overview.paragraphs.map((p, i) => (
            <p key={i} className="sws-teaching-para">{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}
