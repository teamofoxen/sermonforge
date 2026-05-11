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
import {
  TrailTopBar,
  useTrailKeyboard,
  StageOverview,
  useStageOverviewSeen,
} from "./studyTrailShared";
import { getQuestionAnswer, getQuestionString, parseStructuredField } from "../utils/studyFields";
import { getOutline } from "../utils";
import "./studyTrail.css";

export default function ManuscriptTrail({ sermon, onUpdate }) {
  const [passageOpen, setPassageOpen] = useState(false);
  // Trail-suppress: Esc / × exit pulls the pastor out of the writing-room
  // shell into the bare ManuscriptTab. Retires when the escape hatch goes
  // away in Item 8; until then it matches the Study / Assembly behavior so
  // the contract is the same across stages.
  const [trailSuppressed, setTrailSuppressed] = useState(false);
  const [stageOverviewSeen, markStageOverviewSeen] = useStageOverviewSeen("manuscript");

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

  // Stage overview (DW12) — fires on first arrival at the writing room
  // in a session. The carried-forward list reads back the four Assembly
  // outcomes (MPP + Outline + Body + Frame) so the pastor sees the whole
  // sermon-in-progress before they settle in to write.
  if (!stageOverviewSeen) {
    const mpt = sermon?.mpt || "";
    const mps = sermon?.mps || "";
    const outline = (() => { try { return getOutline(sermon) || []; } catch { return []; } })();
    const frameData = (() => { try { return parseStructuredField(sermon?.sermon_frame); } catch { return null; } })();
    const introHook = frameData ? getQuestionString(frameData, "intro", "hook") : "";
    const conclusionLand = frameData ? getQuestionString(frameData, "conclusion", "land_call") : "";
    const carriedForward = [
      {
        label: "MAIN POINT PAIR",
        text: mpt || mps
          ? `${mpt || "(MPT not written)"} · ${mps || "(MPS not written)"}`
          : "(not yet written)",
      },
      {
        label: "SERMON OUTLINE",
        text: outline.length
          ? outline.map((p, i) => `${i + 1}. ${p.text || "(untitled)"}`).join(" · ")
          : "(no points yet)",
      },
      {
        label: "SERMON FRAME",
        text: introHook || conclusionLand
          ? `Intro: ${introHook || "(not written)"} · Conclusion: ${conclusionLand || "(not written)"}`
          : "(not yet written)",
      },
    ];
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
          <StageOverview
            eyebrow="ENTERING THE WRITING ROOM"
            title="You've walked far. Now expand the trail into prose."
            body="Every named outcome you've produced — from Observation Set to Sermon Frame — is here. The writing room is one continuous surface; section cards keep the structure visible while you write. The trail recedes; the writing leads from here."
            outcomes={[
              { label: "INTRODUCTION",  text: "Opener, MPT, scripture reading, MPS, expectation, title." },
              { label: "BODY",          text: "Each outline point with transition, point, Scripture, explanation, application, illustration." },
              { label: "CONCLUSION",    text: "Response that lands what the trail has shaped." },
              { label: "REVIEW + EXPORT",text: "Flow check, ear check, final tune-up, then export to Word." },
            ]}
            carriedForward={carriedForward}
            continueLabel="Walk into the writing room"
            onContinue={markStageOverviewSeen}
          />
        </main>
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
