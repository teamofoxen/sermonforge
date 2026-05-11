// ManuscriptTrail — WTC Phase F / DW5 (the "writing room").
//
// Manuscript is the trail's terminal stage. Unlike Study and Assembly, the
// work here is sustained long-form prose, not a sequence of question stops.
// The trail's contemplative quality survives by becoming a *place* — the
// writing room — rather than another switchback. The pastor arrives, the
// trail topbar stays for context (passage / title / × exit), the scripture
// column stays on the right, and the manuscript editor occupies the
// central column at full reading width. The trail SVG fades to background
// (paper-grain texture + vignette via `.tw-shell::after`) so the pastor
// sees they've walked far, without a competing path on screen.
//
// Wrap-and-frame, not a rewrite: `ManuscriptTab` retains every section
// (Intro / points / transitions / conclusion / review / notebook) and all
// its save behavior; this component supplies the trail shell around it.

import { useState } from "react";
import ManuscriptTab from "./ManuscriptTab";
import PassagePopup from "./PassagePopup";
import ScripturePanel from "./ScripturePanel";
import { TrailTopBar, useTrailKeyboard } from "./studyTrailShared";
import "./studyTrail.css";

export default function ManuscriptTrail({ sermon, onUpdate }) {
  const [passageOpen, setPassageOpen] = useState(false);
  // Trail-suppress: Esc / × exit pulls the pastor out of the writing-room
  // shell into the bare ManuscriptTab. Retires when the escape hatch goes
  // away in Item 8; until then it matches the Study / Assembly behavior so
  // the contract is the same across stages.
  const [trailSuppressed, setTrailSuppressed] = useState(false);

  useTrailKeyboard({
    advance: () => {},
    lookBack: () => {},
    advanceDisabled: true,
    onExit: () => setTrailSuppressed(true),
    onTogglePass: () => setPassageOpen((v) => !v),
    modalOpen: passageOpen,
  });

  if (trailSuppressed) {
    return (
      <div className="study-tab-shell" style={{ padding: "12px 24px 24px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
          {/* eslint-disable-next-line sermonforge/no-raw-button */}
          <button
            type="button"
            onClick={() => setTrailSuppressed(false)}
            title="Re-enter the writing room"
            style={{
              background: "transparent",
              border: "1px solid rgba(212, 160, 23, 0.4)",
              borderRadius: "2px",
              padding: "6px 12px",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: "10px",
              letterSpacing: "0.18em",
              color: "var(--gold)",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Writing room →
          </button>
        </div>
        <ManuscriptTab sermon={sermon} onUpdate={onUpdate} />
      </div>
    );
  }

  return (
    <div className="tw-shell tw-shell-writing-room">
      <TrailTopBar
        sermon={sermon}
        onExit={() => setTrailSuppressed(true)}
        onPassageClick={() => setPassageOpen(true)}
      />
      <PassagePopup
        passage={sermon?.passage}
        isOpen={passageOpen}
        onClose={() => setPassageOpen(false)}
      />
      <aside className="tw-scripture">
        <ScripturePanel passage={sermon?.passage} />
      </aside>
      <main className="tw-writing-room-body">
        <div className="tw-writing-room-eyebrow tw-mono">
          THE WRITING ROOM · WRITE THE SERMON
        </div>
        <ManuscriptTab sermon={sermon} onUpdate={onUpdate} />
      </main>
    </div>
  );
}
