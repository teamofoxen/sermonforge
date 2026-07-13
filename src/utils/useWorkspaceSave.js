import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "./hooks";
import { registerFlush } from "./closeFlush";
import { pickSermonColumns } from "../core/contracts";
import { updateSermon, persistMutation, INITIAL_SAVE_STATE } from "../core/spine";

// useWorkspaceSave — the sermon workspace's persistence spine, extracted from
// SermonWorkspace.jsx verbatim (Track D slice 1, behaviour-preserving). It owns
// save state and every write primitive; the shell composes it and consumes the
// returned API under the same names, so no downstream call site changes.
//
//   saveState     — { saving, saveError, saveErrorMessage, lastSavedAt }
//   handleUpdate  — merge fields into sermonRef + setSermon, then queue a save
//   persistUpdate — persist sermonRef.current now (topbar Retry; flush-before-move)
//   debouncedSave — the useDebounce object: debouncedSave() queues the 800ms
//                   window, debouncedSave.flush() flushes it (used by the load
//                   effect's hinted-position write and by Export)
//
// The shell keeps ownership of `sermon` state and `sermonRef` — both are read by
// render derivations and by the mutation handlers that stay in the shell — and
// passes them in. This hook reads `sermonRef.current`, NEVER the `sermon` value,
// so its callbacks re-identify on exactly the same deps as before (the writing
// surface has identity-keyed effects). Do not let `sermon` into any dep array.
//
// Exit flush: the unmount effect and the close-flush registry both run
// persistUpdate — NOT debouncedSave.flush. persistUpdate reads sermonRef.current
// and persists everything pending regardless of the debounce timer state, so one
// call saves on window close / app quit / reload / unmount even when no timer is
// queued (audit D7/K3). Pinned by tests/contracts/exit-flush-persist.test.tsx.
export function useWorkspaceSave({ sermonId, sermonRef, setSermon, isFixture }) {
  const [saveState, setSaveState] = useState(INITIAL_SAVE_STATE);

  const persistUpdate = useCallback(
    async () => {
      const data = sermonRef.current;
      if (!data) return true;          // nothing to persist = success
      if (isFixture) return true;      // fixture mode — no writes
      const payload = pickSermonColumns(data);
      if (!payload || Object.keys(payload).length === 0) return true;
      // persistMutation swallows the write error into saveState (so the save
      // chip can show it) and returns undefined on failure, the sentinel on
      // success. Return an explicit boolean so the close-flush registry can tell
      // a failed exit-flush from a successful one and block the close (Mutation
      // #3), instead of the failure vanishing behind Promise.allSettled.
      const result = await persistMutation(setSaveState, async () => {
        await updateSermon(sermonId, payload);
        return true;
      });
      return result === true;
    },
    [sermonId, isFixture, sermonRef]
  );

  const debouncedSave = useDebounce(persistUpdate, 800);

  // Flush pending debounced save on unmount — BACKSTOP only. Deliberate exits
  // (Back, series prev/next) flush before navigating via the shell's
  // requestLeave and handle the result explicitly; this unawaited cleanup
  // cannot block the view change on failure, so it is never the primary
  // guarantee for deliberate navigation (persistence-transition contract,
  // src/utils/saveTransition.js).
  useEffect(() => {
    return () => { persistUpdate(); };
  }, [persistUpdate]);

  // Register with the close-flush registry while mounted, so window close /
  // app quit / reload flush the 800ms debounce window instead of dropping it
  // (src/utils/closeFlush.js; asked by main via "app-flush-edits").
  // persistUpdate reads sermonRef.current, so one call persists everything
  // pending regardless of debounce timer state. registerFlush returns the
  // unregister function — used directly as the effect cleanup.
  useEffect(() => registerFlush(persistUpdate), [persistUpdate]);

  // handleUpdate — applies field changes to sermonRef + setSermon, then
  // queues a debounced save. Used by every UI write path (writing-surface
  // answer change, canvas change, per-unit column change, threshold
  // dismissal, position write).
  const handleUpdate = useCallback((fields) => {
    const merged = { ...sermonRef.current, ...fields };
    sermonRef.current = merged;
    setSermon(merged);
    debouncedSave();
  }, [debouncedSave, sermonRef, setSermon]);

  return { saveState, handleUpdate, persistUpdate, debouncedSave };
}
