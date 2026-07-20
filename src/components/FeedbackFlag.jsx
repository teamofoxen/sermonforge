// FeedbackFlag — Tier 1 in-app flag affordance (BTI Phase 1, Chunk 3).
//
// One per workspace surface. The pastor clicks the flag, optionally types a
// one-line note, and sends. Empty notes are valid — the click itself is signal.
//
// Payload shape per docs/PROPOSALS/bti-build-mvp.md.

import { useEffect, useRef, useState } from "react";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import { describeFeedbackOutcome } from "../utils/feedbackOutcome";
import "./feedbackFlag.css";

export default function FeedbackFlag({ surface, sermonId = null, step = null }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [confirmTone, setConfirmTone] = useState("sent");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Outside-click and Escape dismiss the popover.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-focus the note input when the popover opens.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Confirmation banner auto-clears after a few seconds. A message reporting
  // that the flag was NOT kept has to outlast a glance, so it dwells longer
  // than the cheerful one it replaced.
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(null), confirmTone === "sent" ? 2500 : 8000);
    return () => clearTimeout(t);
  }, [confirm, confirmTone]);

  async function send(blank) {
    const payload = {
      surface,
      sermonId,
      step,
      note: blank ? "" : note.trim(),
      timestamp: new Date().toISOString(),
    };

    let result;
    try {
      result = await window.electronAPI?.btiSubmit?.("flag", payload);
    } catch (_) {
      result = { ok: false, queued: false, reason: "failed" };
    }

    setNote("");
    setOpen(false);
    // Never "Flag sent." for a flag the bus discarded — see
    // src/utils/feedbackOutcome.js.
    const outcome = describeFeedbackOutcome(result);
    setConfirmTone(outcome.tone);
    setConfirm(outcome.tone === "sent" ? "Flag sent. Thank you." : outcome.message);
  }

  return (
    <span className="feedback-flag-wrap" ref={wrapRef}>
      <IconButton
        aria-label="Flag this for feedback"
        title="Flag this moment for the developer"
        className="feedback-flag-btn"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 1.5v13" />
          <path d="M3 2.5h8.5l-2 2.5 2 2.5H3" />
        </svg>
      </IconButton>

      {open && (
        <div className="feedback-flag-popover" role="dialog" aria-label="Flag this moment">
          <div className="feedback-flag-popover-title">Flag this moment</div>
          <input
            ref={inputRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="One line (optional) — what was off?"
            onKeyDown={(e) => {
              if (e.key === "Enter") send(false);
            }}
          />
          <div className="feedback-flag-popover-actions">
            <SecondaryButton size="sm" onClick={() => send(true)}>Send blank</SecondaryButton>
            <PrimaryButton size="sm" onClick={() => send(false)}>Send</PrimaryButton>
          </div>
        </div>
      )}

      {confirm && !open && <div className="feedback-flag-confirm">{confirm}</div>}
    </span>
  );
}
