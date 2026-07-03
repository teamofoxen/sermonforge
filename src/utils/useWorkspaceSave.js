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
      if (!data) return;
      if (isFixture) return; // fixture mode — no writes
      const payload = pickSermonColumns(data);
      if (!payload || Object.keys(payload).length === 0) return;
      await persistMutation(setSaveState, async () => {
        await updateSermon(sermonId, payload);
      });
    },
    [sermonId, isFixture, sermonRef]
  );

  const debouncedSave = useDebounce(persistUpdate, 800);

  // Flush pending debounced save on unmount.
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
