import { useState } from "react";
import SecondaryButton from "./primitives/SecondaryButton";
import EsvKeyModal from "./EsvKeyModal";

// The shared ESV-passage-fetch recovery machinery — one voice, three
// surfaces (the reference pane, the passage-lookup popup, and the Study→
// Anchor handoff). Extracted 2026-07-02 (UX-audit remediation, simplify
// pass): the state derivation, the recovery-copy dispatch, and the nested
// key-modal wiring had been copy-pasted a third time when the handoff
// finding (M1) fixed its own blank-on-failure bug — this is the one place
// that logic lives now.

// Per-state plain English + one action. The structured esvState codes from
// passage-fetch render here — raw "ESV API HTTP 401" / "fetch failed"
// strings never reach the pastor.
export const RECOVERY = {
  "no-key": {
    copy: "Seeing the Bible text here takes a free ESV key from Crossway — add it once and every passage will load.",
    action: "Add ESV key",
    kind: "key",
  },
  "key-unreadable": {
    copy: "Your saved ESV key couldn't be read back from Windows. Re-entering it once will fix this.",
    action: "Update ESV key",
    kind: "key",
  },
  "bad-key": {
    copy: "The ESV key saved on this computer wasn't accepted — it may have been mistyped or expired. Re-enter it and the passage will load.",
    action: "Update ESV key",
    kind: "key",
  },
  "offline": {
    copy: "Couldn't reach the ESV servers. Check your internet connection.",
    action: "Try again",
    kind: "retry",
  },
  "rate-limited": {
    copy: "The ESV servers are busy right now. Try again in a minute.",
    action: "Try again",
    kind: "retry",
  },
  "error": {
    copy: "The ESV servers are busy right now. Try again in a minute.",
    action: "Try again",
    kind: "retry",
  },
};

export function PassageRecovery({ copy, actionLabel, onAction }) {
  return (
    <div className="passage-popup-recovery">
      <p className="passage-popup-recovery-copy">{copy}</p>
      <SecondaryButton size="sm" onClick={onAction}>
        {actionLabel}
      </SecondaryButton>
    </div>
  );
}

// Resolves the ESV fetch-state code from a useEsvPassage `data` value.
// Structured state from passage-fetch; legacy-field fallback keeps callers
// sane against a stale/stubbed main process.
export function resolveEsvState(data) {
  const rawState = data?.esvState
    ?? (data?.esvPending ? "no-key" : data?.esvError ? "error" : "ok");
  return rawState === "ok" || RECOVERY[rawState] ? rawState : "error";
}

// The recovery/key-modal machinery shared by every passage-fetch surface.
// Returns:
//   esvState      — the resolved state code ("ok" or a RECOVERY key)
//   fetchErrorNode — pre-built recovery node for a transport failure
//                    (`data?.fetchError`); render when !loading && fetchError
//   recoveryNode  — pre-built recovery node for a non-"ok" esvState; render
//                    when !loading && !fetchError && esvState !== "ok"
//   keyModalNode  — the nested EsvKeyModal, or null when not open
//   keyModalOpen  — so callers can guard their own Escape-dismiss listener
//                    against a single Escape closing both layers
// The "ok" (success) and "empty ESV return" branches stay with each caller
// — their wrapper markup genuinely differs by surface (a flat paragraph in
// the reference pane and handoff, a labeled column in the popup).
export function usePassageRecovery(data, refresh) {
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const esvState = resolveEsvState(data);

  const fetchErrorNode = (
    <PassageRecovery
      copy="Something went wrong loading the passage. Try again — if it keeps happening, close and reopen SermonForge."
      actionLabel="Try again"
      onAction={refresh}
    />
  );

  const recoveryNode = esvState === "ok" ? null : (
    <PassageRecovery
      copy={RECOVERY[esvState].copy}
      actionLabel={RECOVERY[esvState].action}
      onAction={
        RECOVERY[esvState].kind === "key"
          ? () => setKeyModalOpen(true)
          : refresh
      }
    />
  );

  const keyModalNode = keyModalOpen ? (
    <EsvKeyModal
      onClose={() => {
        setKeyModalOpen(false);
        refresh();
      }}
    />
  ) : null;

  return { esvState, fetchErrorNode, recoveryNode, keyModalNode, keyModalOpen };
}
