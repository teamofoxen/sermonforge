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
//
// WTC sequel Item 8: the user-facing trail-suppress escape hatch is gone.
// × Exit / Esc return the pastor to the Dashboard (`onClose`). There is
// no legacy fallback for Manuscript — the writing room is the only
// rendering. The `sermonforge_trail_disabled` localStorage flag used by
// Study/Assembly contract tests doesn't apply here; Manuscript has no
// contract test that asserts on legacy markup.

import { useState } from "react";
import ManuscriptTab from "./ManuscriptTab";
import PassagePopup from "./PassagePopup";
import ScripturePanel from "./ScripturePanel";
import {
  TrailTopBar,
  useTrailKeyboard,
  StageOverview,
  useStageOverviewSeen,
  NotebookDrawer,
  useNotebookToggle,
  useTrailMapToggle,
} from "./studyTrailShared";
import WorkspaceTrailMap from "./WorkspaceTrailMap";
import { getQuestionString, parseStructuredField } from "../utils/studyFields";
import { getOutline } from "../utils";
import "./studyTrail.css";

export default function ManuscriptTrail({
  sermon, onUpdate, onClose,
  seriesTitle, seriesPosition, seriesTotal, onOpenPrev, onOpenNext,
}) {
  const [passageOpen, setPassageOpen] = useState(false);
  const [stageOverviewSeen, markStageOverviewSeen] = useStageOverviewSeen("manuscript");
  const notebook = useNotebookToggle();
  const map = useTrailMapToggle();

  // Cmd/Ctrl+. opens the passage popup from the writing room (the
  // manuscript stage has no N/A toggle — every other trail uses the chord
  // for N/A on allowlisted Qs). modalOpen gates the trail's Esc handler
  // so a stray Esc can't exit the trail while a drawer or modal is open.
  useTrailKeyboard({
    advance: () => {},
    lookBack: () => {},
    advanceDisabled: true,
    onExit: onClose,
    onTogglePass: () => setPassageOpen((v) => !v),
    modalOpen: passageOpen || notebook.open || map.open,
  });

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
    // Overview branch: render StageOverview as a direct child of
    // `.tw-shell` (NOT inside `.tw-writing-room-body`) so the clearing's
    // absolute-positioning math centers inside the full shell viewport
    // minus the scripture column. Nesting it inside the body — which is
    // itself absolutely positioned — would compound the offset and
    // squash the layout.
    return (
      <div className="tw-shell">
        <TrailTopBar
          sermon={sermon}
          onExit={onClose}
          onPassageClick={() => setPassageOpen(true)}
          seriesTitle={seriesTitle}
          seriesPosition={seriesPosition}
          seriesTotal={seriesTotal}
          onOpenPrev={onOpenPrev}
          onOpenNext={onOpenNext}
        />
        <PassagePopup
          passage={sermon?.passage}
          isOpen={passageOpen}
          onClose={() => setPassageOpen(false)}
        />
        <aside className="tw-scripture">
          <ScripturePanel passage={sermon?.passage} />
        </aside>
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
      </div>
    );
  }

  return (
    <div className="tw-shell tw-shell-writing-room">
      <TrailTopBar
        sermon={sermon}
        onExit={onClose}
        onPassageClick={() => setPassageOpen(true)}
        onToggleNotebook={notebook.toggle}
        notebookOpen={notebook.open}
        onOpenMap={map.openMap}
        seriesTitle={seriesTitle}
        seriesPosition={seriesPosition}
        seriesTotal={seriesTotal}
        onOpenPrev={onOpenPrev}
        onOpenNext={onOpenNext}
      />
      <PassagePopup
        passage={sermon?.passage}
        isOpen={passageOpen}
        onClose={() => setPassageOpen(false)}
      />
      <aside className="tw-scripture">
        <ScripturePanel passage={sermon?.passage} />
      </aside>
      <main className="tw-writing-room-body" data-tour-id="manuscript-body">
        <div className="tw-writing-room-eyebrow tw-mono">
          THE WRITING ROOM · WRITE THE SERMON
        </div>
        <ManuscriptTab sermon={sermon} onUpdate={onUpdate} />
      </main>
      <NotebookDrawer
        open={notebook.open}
        onClose={notebook.close}
        label="Manuscript Notebook"
        value={sermon?.notebook_manuscript || ""}
        onChange={(value) => onUpdate({ notebook_manuscript: value })}
        placeholder="Free-form notes for delivery — pacing marks, lines to land hard, sections to slow down on."
      />
      {map.open && <WorkspaceTrailMap sermon={sermon} onClose={map.close} />}
    </div>
  );
}
