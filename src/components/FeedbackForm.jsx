// FeedbackForm — Tier 2 in-app feedback modal (BTI Phase 1, Chunk 4).
//
// Single-dimension picker + free-text. Used for "felt-but-not-immediate"
// observations — things that don't fit a flag. Per the BTI charter
// (docs/PROPOSALS/beta-testing-initiative.md, Tier 2 description).

import { useEffect, useState } from "react";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import { describeFeedbackOutcome } from "../utils/feedbackOutcome";
import "./feedbackForm.css";

// Stored values stay the charter's dimension ids (telemetry keys on them;
// docs/PROPOSALS/beta-testing-initiative.md, post-ARI rewrite 2026-05-09).
// The LABELS speak pastor, not charter — "Structural overreach" was the
// analysis team's vocabulary leaking into the cohort's primary feedback
// channel. Default selection is the open-ended catch-all.
const DIMENSIONS = [
  { value: "structural-overreach", label: "The structure got in my way" },
  { value: "workflow-fit", label: "Doesn't fit how I actually prepare" },
  { value: "question-quality", label: "A question that didn't land" },
  { value: "trust", label: "Something I didn't trust" },
  { value: "friction-and-surprise", label: "Something slowed me down" },
  { value: "onboarding-and-first-run", label: "Getting started" },
  { value: "reliability-and-weirdness", label: "Something broke or acted strange" },
  { value: "performance-and-feel", label: "Slow or clunky" },
  { value: "voice-and-frame", label: "The wording or tone" },
  { value: "what-surprised-you", label: "Something else I noticed" },
];

const DEFAULT_DIMENSION = "what-surprised-you";

export default function FeedbackForm({ onClose, sermonId = null, step = null }) {
  const [dimension, setDimension] = useState(DEFAULT_DIMENSION);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmShown, setConfirmShown] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // Escape closes the modal.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // After the confirmation banner shows briefly, close — but ONLY when the
  // note actually survived. If it was discarded (feedback off) or failed,
  // the message saying so must not disappear before it can be read; the
  // pastor dismisses that one himself.
  useEffect(() => {
    if (!confirmShown) return;
    if (outcome && outcome.tone !== "sent" && outcome.tone !== "queued") return;
    const t = setTimeout(() => onClose?.(), 1400);
    return () => clearTimeout(t);
  }, [confirmShown, outcome, onClose]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    const payload = {
      dimension,
      text: text.trim(),
      sermonId,
      step,
      timestamp: new Date().toISOString(),
    };
    let result;
    try {
      result = await window.electronAPI?.btiSubmit?.("form", payload);
    } catch (_) {
      result = { ok: false, queued: false, reason: "failed" };
    }
    setSending(false);
    setOutcome(describeFeedbackOutcome(result));
    setConfirmShown(true);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div className="feedback-form-overlay" onMouseDown={handleOverlayClick}>
      <div className="feedback-form-modal" role="dialog" aria-label="Send feedback">
        <div className="feedback-form-header">
          <div className="feedback-form-title">Send feedback</div>
          <IconButton
            aria-label="Close"
            className="feedback-form-close"
            onClick={onClose}
          >
            ×
          </IconButton>
        </div>

        {confirmShown ? (
          <div className="feedback-form-confirm">
            <div>{outcome?.message ?? "Sent. Thank you — every note shapes the tool."}</div>
            {outcome?.detail ? (
              <div className="feedback-form-confirm-detail">{outcome.detail}</div>
            ) : null}
            {outcome && outcome.tone !== "sent" && outcome.tone !== "queued" ? (
              <SecondaryButton onClick={() => onClose?.()}>Close</SecondaryButton>
            ) : null}
          </div>
        ) : (
          <>
            <div className="feedback-form-body">
              <div className="feedback-form-intro">
                Tell me what's in the way, what's missing, what surprised you.
                The honest version, not the polite version.
              </div>

              <div>
                <div className="feedback-form-label" style={{ marginBottom: 4 }}>What's it about</div>
                <select
                  className="feedback-form-select"
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                >
                  {DIMENSIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="feedback-form-label" style={{ marginBottom: 4 }}>What you noticed</div>
                <textarea
                  className="feedback-form-textarea"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="A sentence or a paragraph — whatever you have time for."
                  autoFocus
                />
              </div>
            </div>

            <div className="feedback-form-footer">
              <span className="feedback-form-footer-note">
                Sermon content is not sent. Only what you type here.
              </span>
              <div className="feedback-form-actions">
                <SecondaryButton size="sm" onClick={onClose}>Cancel</SecondaryButton>
                <PrimaryButton
                  size="sm"
                  loading={sending ? "Saving…" : undefined}
                  disabled={!text.trim()}
                  onClick={handleSend}
                >
                  Send
                </PrimaryButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
