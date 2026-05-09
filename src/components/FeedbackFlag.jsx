// FeedbackFlag — Tier 1 in-app flag affordance (BTI Phase 1, Chunk 3).
//
// One per AI surface. The pastor clicks the flag, optionally types a one-line
// note, optionally toggles whether the most recent AI exchange on this surface
// rides along, and sends. Empty notes are valid — the click itself is signal.
//
// Payload shape per docs/PROPOSALS/bti-build-mvp.md (lines 138-149).
// lastAiCall is sourced from the per-surface registry written by
// src/utils/ai.js sendAIMessage on every successful response.

import { useEffect, useRef, useState } from "react";
import { getLastAiCall } from "../utils/lastAiCallRegistry";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import "./feedbackFlag.css";

export default function FeedbackFlag({ surface, sermonId = null, step = null }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [includeAi, setIncludeAi] = useState(true);
  const [confirm, setConfirm] = useState(null);
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

  // Confirmation banner auto-clears after a few seconds.
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(null), 2500);
    return () => clearTimeout(t);
  }, [confirm]);

  async function send(blank) {
    const payload = {
      surface,
      sermonId,
      step,
      note: blank ? "" : note.trim(),
      timestamp: new Date().toISOString(),
    };
    if (includeAi) {
      const lastAiCall = getLastAiCall(surface);
      if (lastAiCall) payload.lastAiCall = lastAiCall;
    }

    try {
      await window.electronAPI?.btiSubmit?.("flag", payload);
    } catch (_) {
      // Bus persists failures locally; nothing to do here.
    }

    setNote("");
    setOpen(false);
    setConfirm("Flag sent. Thank you.");
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
          <label className="feedback-flag-popover-check">
            <input
              type="checkbox"
              checked={includeAi}
              onChange={(e) => setIncludeAi(e.target.checked)}
            />
            Include the AI exchange in this flag
          </label>
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
