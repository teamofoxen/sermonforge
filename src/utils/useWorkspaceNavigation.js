import { useState, useCallback } from "react";
import {
  serializePosition,
  deriveCurrentPositionFromSermon,
  hasSeenThreshold,
  nextThresholdsSeen,
  fieldOverviewThresholdId,
  THRESHOLD_ID,
} from "./sermonState";
import { findField } from "./walkOrder";

// useWorkspaceNavigation — the sermon workspace's movement + movement-write
// cluster, extracted from SermonWorkspace.jsx verbatim (Track D slice 5,
// behaviour-preserving). It means one thing: MOVE the pastor, PERSIST the move,
// and RECORD movement-related orientation/teaching-seen state.
//
// Option A (deliberate): this is NOT a threshold-read container. The pure
// visibility derivations — `position`, `showSermonStart`, `showHandoff`,
// `teachingId`, `teachingAutoOpen` — stay as render-body consts in the shell;
// they derive from sermon+position with no state and no coordination. This hook
// owns only the writes and the movement/reread state that drive them.
//
// Inputs:
//   sermon        — render value; ONLY handleHandoffJump references it (its guard),
//                   so only that handler keeps it in deps (it re-identifies per
//                   keystroke, exactly as before). `sermon` must never leak into
//                   another handler's deps or the child prop identity would churn.
//   sermonRef     — freshest state; writePositionAndThresholds + dismissThreshold
//                   read sermonRef.current so no closure can go stale (Track C).
//   handleUpdate  — the shared merge + debounced-save primitive (useWorkspaceSave).
//   persistUpdate — the immediate flush; beforePositionChange = await persistUpdate().
//   setMapOpen    — close the map on a map jump (mapOpen stays in the shell).
//   setFinishOpen — close the finish screen on a finish jump (finishOpen stays in
//                   the shell — it gates useWorkspaceCompletion).
//
// Intra-hook order matters: beforePositionChange and writePositionAndThresholds
// are declared before the six jump handlers that list them in deps.
export function useWorkspaceNavigation({
  sermon,
  sermonRef,
  handleUpdate,
  persistUpdate,
  setMapOpen,
  setFinishOpen,
}) {
  // Origin position a "door" jump came from (e.g. clicking "Lay out the
  // passage's structure" from a synthesis table). Set on a door jump, surfaced
  // as the writing surface's return banner, and cleared the moment the pastor
  // navigates any other way — so a stale return link never lingers. Session-
  // local, never persisted: wayfinding for the current detour, not sermon state.
  const [returnTo, setReturnTo] = useState(null);
  // Question the last map jump targeted — the writing surface scrolls to it
  // and flashes it once, then clears this via onHighlightDone.
  const [jumpHighlight, setJumpHighlight] = useState(null);
  // Threshold screen re-summoned from the map's "Read again" row. Plain local
  // state, never thresholds_seen — re-reading is view-only (Process #3:
  // dismissal ends the interruption, not the access).
  const [rereadThreshold, setRereadThreshold] = useState(null);

  // beforePositionChange — async; flushes any pending debounced save BEFORE the
  // position settles. The chain is: position-change trigger (chevron / map jump
  // / unmet-state door / handoff jump / required-outcome go-write-it) → await
  // beforePositionChange → write the new position → handleUpdate writes
  // last_touched_position. The flush guarantees draft persistence on jump.
  const beforePositionChange = useCallback(async () => {
    await persistUpdate();
  }, [persistUpdate]);

  const writePositionAndThresholds = useCallback((next, extraFields = {}, { suppressTeachingSeen = false } = {}) => {
    const fields = {
      last_touched_position: serializePosition(next),
      ...extraFields,
    };
    // Leaving a field whose teaching block is still auto-open ends the
    // first visit — mark it seen in the same write. Parent-side on purpose:
    // a child unmount-cleanup would also fire on StrictMode's simulated
    // remount (dev) and on workspace close, and the ratified semantics say
    // quitting mid-read does NOT count as seen — only collapse (the child's
    // trigger) or moving to another field (this one). Same-field jumps
    // (map click on the current field) are not "leaving," and callers whose
    // jump leaves a field the pastor never actually saw (the handoff overlay
    // covers the surface from arrival) suppress the mark. Everything reads
    // from sermonRef at call time so no closure can go stale.
    const cur = sermonRef.current;
    if (cur && !suppressTeachingSeen) {
      const pos = deriveCurrentPositionFromSermon(cur);
      const overview = findField(pos.stage, pos.subPhase, pos.fieldKey)?.overview;
      const hasTeaching = !!(overview && Array.isArray(overview.paragraphs) && overview.paragraphs.length > 0);
      const curId = fieldOverviewThresholdId(pos.stage, pos.subPhase, pos.fieldKey);
      const nextId = fieldOverviewThresholdId(next.stage, next.subPhase, next.fieldKey);
      if (hasTeaching && nextId !== curId && !hasSeenThreshold(cur, curId)) {
        // Fold the mark into any caller-supplied thresholds_seen instead of
        // replacing it — a latent lost-update otherwise (no caller passes
        // one today, but the extraFields signature invites it).
        const base = "thresholds_seen" in fields ? { thresholds_seen: fields.thresholds_seen } : cur;
        fields.thresholds_seen = nextThresholdsSeen(base, curId);
      }
    }
    handleUpdate(fields);
  }, [handleUpdate, sermonRef]);

  const handlePositionChange = useCallback(async (next) => {
    await beforePositionChange();
    setReturnTo(null); // ordinary navigation — any pending door-return is stale
    writePositionAndThresholds(next);
  }, [beforePositionChange, writePositionAndThresholds]);

  // A door jump records where the pastor came from so the writing surface can
  // offer a return. The doors used to be one-way (the gap the pastor reported:
  // their copy says "come back" but nothing brought you back).
  const handleDoorJump = useCallback(async (next, origin) => {
    await beforePositionChange();
    setReturnTo(origin);
    writePositionAndThresholds(next);
  }, [beforePositionChange, writePositionAndThresholds]);

  // Return banner click — jump back to the stashed origin and consume it.
  const handleReturn = useCallback(async () => {
    const dest = returnTo;
    if (!dest) return;
    await beforePositionChange();
    setReturnTo(null);
    writePositionAndThresholds(dest);
  }, [returnTo, beforePositionChange, writePositionAndThresholds]);

  const dismissThreshold = useCallback((id) => {
    const cur = sermonRef.current; // freshest state — see writePositionAndThresholds note
    if (!cur) return;
    handleUpdate({ thresholds_seen: nextThresholdsSeen(cur, id) });
  }, [handleUpdate, sermonRef]);

  // Map jump and handoff jump both share the pattern: flush, write
  // position, optionally mark a threshold seen, close any overlay.
  // The map passes the full question entry; position serialization only
  // reads stage/subPhase/fieldKey, and questionKey drives the landing flash.
  const handleMapJump = useCallback(async (next) => {
    await beforePositionChange();
    setReturnTo(null); // navigated via the map — any pending door-return is stale
    writePositionAndThresholds(next);
    setJumpHighlight(next.questionKey ?? null);
    setMapOpen(false);
  }, [beforePositionChange, writePositionAndThresholds, setMapOpen]);

  // Stable identity — the writing surface's flash effect depends on this;
  // an inline closure would restart the flash on every workspace render.
  const clearJumpHighlight = useCallback(() => setJumpHighlight(null), []);

  // Handoff "go write it" jumps deliberately do NOT consume the threshold:
  // the pastor left to fix a Study outcome, not to dismiss the screen, so
  // the handoff returns on their next Anchor entry. Only the explicit Close
  // marks it seen. (T9, 2026-06-10 — previously a jump consumed it and the
  // screen could never be read through.)
  //
  // The REAL handoff (not re-read) covers the writing surface from the
  // moment the position lands, so a field teaching that auto-opened under
  // it was never visible — jumping away must not consume the first-visit
  // auto-open (same spirit as quit-mid-read). Re-read mode had a visible
  // surface underneath; normal marking applies.
  const handleHandoffJump = useCallback(async (next) => {
    if (!sermon) return;
    await beforePositionChange();
    setReturnTo(null); // left via the handoff — any pending door-return is stale
    writePositionAndThresholds(next, {}, {
      suppressTeachingSeen: rereadThreshold !== THRESHOLD_ID.StudyToAnchorHandoff,
    });
    setRereadThreshold(null);
  }, [sermon, beforePositionChange, writePositionAndThresholds, rereadThreshold]);

  // Finish-screen jump — same flush-then-move shape as the map jump; closes
  // the finish screen so the pastor lands on the field they chose.
  const handleFinishJump = useCallback(async (next) => {
    await beforePositionChange();
    setReturnTo(null); // jumped from the finish screen — pending door-return is stale
    writePositionAndThresholds(next);
    setFinishOpen(false);
  }, [beforePositionChange, writePositionAndThresholds, setFinishOpen]);

  // Re-read mode — summoned from the map header, closes back to the work
  // without touching thresholds_seen.
  const rereadingStart = rereadThreshold === THRESHOLD_ID.SermonStart;
  const rereadingHandoff = rereadThreshold === THRESHOLD_ID.StudyToAnchorHandoff;

  return {
    beforePositionChange,
    handlePositionChange,
    handleDoorJump,
    handleReturn,
    handleMapJump,
    handleHandoffJump,
    handleFinishJump,
    dismissThreshold,
    returnTo,
    jumpHighlight,
    clearJumpHighlight,
    rereadingStart,
    rereadingHandoff,
    setRereadThreshold,
  };
}
