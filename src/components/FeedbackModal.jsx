import { useState, useEffect } from "react";
import { getSchemaVersion, getAppVersion, submitFeedback } from "../db/database.js";
import InlineError from "./InlineError";

const CATEGORIES = [
  { value: "",        label: "Select a category…",                  disabled: true },
  { value: "bug",     label: "Bug — something is broken" },
  { value: "ux",      label: "UI/UX — something feels wrong or confusing" },
  { value: "ai",      label: "AI Quality — a response was unhelpful or off" },
  { value: "feature", label: "Missing Feature — something the app should do" },
  { value: "copy",    label: "Content/Copy — a label or instruction is unclear" },
];

const UX_PARTS = [
  "Dashboard", "Series Planning", "Book Study", "Series Overview", "Series Structure",
  "Sermon Slots", "Series Calendar", "Sermon Workspace", "Study Tab",
  "Blueprint Tab", "Manuscript Tab", "Delivery Tab", "AI Panel",
  "Calendar", "Illustrations", "Archive", "Sermon Library", "Other",
];

const AI_STEPS = [
  "Observe", "Interpret", "Redemptive Thread", "Implications",
  "MPT·MPS Forge", "Outline Builder", "Functional Elements",
  "Manuscript", "Delivery", "Series Planning", "Book Study", "Other",
];

const AI_PROBLEMS = [
  "Too generic", "Theologically off", "Ignored my context",
  "Too long", "Too short", "Other",
];

function isFormValid(category, fields) {
  if (!category) return false;
  if (category === "bug") return fields.whatHappened?.trim() || fields.whatExpected?.trim();
  if (category === "ux") return fields.whichPart?.trim() && fields.whatWrong?.trim();
  if (category === "ai") return fields.whichStep?.trim() && fields.whatWrongAI?.trim();
  if (category === "feature") return fields.describeFeature?.trim();
  if (category === "copy") return fields.whereIsText?.trim() && fields.whatItShouldSay?.trim();
  return false;
}

export default function FeedbackModal({ currentView, onClose }) {
  const [category, setCategory] = useState("");
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [schemaVersion, setSchemaVersion] = useState("unknown");
  const [appVersion, setAppVersion] = useState("unknown");

  useEffect(() => {
    Promise.all([getSchemaVersion(), getAppVersion()])
      .then(([sv, av]) => {
        setSchemaVersion(sv?.version ?? "unknown");
        setAppVersion(av?.version ?? "unknown");
      })
      .catch(() => {
        // fall back to "unknown" — do not block the form
      });
  }, []);

  function setField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!isFormValid(category, fields)) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        category,
        currentView: currentView || "unknown",
        schemaVersion,
        appVersion,
        submittedAt: new Date().toISOString(),
        ...fields,
      };
      const result = await submitFeedback(payload);
      if (result?.success) {
        setSuccessMsg("Feedback saved — thank you.");
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorMsg(result?.error || "Failed to save feedback.");
        setSubmitting(false);
      }
    } catch (e) {
      setErrorMsg(e?.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 className="modal-title">Send Feedback</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Primary category */}
          <div className="field-group">
            <label className="field-label">What kind of feedback is this?</label>
            <select
              className="field-input"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setFields({}); setErrorMsg(""); }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} disabled={c.disabled}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bug fields */}
          {category === "bug" && (
            <>
              <div className="field-group">
                <label className="field-label">What were you doing when it happened?</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 80, resize: "vertical" }}
                  value={fields.whatHappened || ""}
                  onChange={(e) => setField("whatHappened", e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">What did you expect to happen?</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 80, resize: "vertical" }}
                  value={fields.whatExpected || ""}
                  onChange={(e) => setField("whatExpected", e.target.value)}
                />
              </div>
            </>
          )}

          {/* UX fields */}
          {category === "ux" && (
            <>
              <div className="field-group">
                <label className="field-label">Which part of the app?</label>
                <select
                  className="field-input"
                  value={fields.whichPart || ""}
                  onChange={(e) => setField("whichPart", e.target.value)}
                >
                  <option value="">Select…</option>
                  {UX_PARTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">What felt wrong or confusing?</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 100, resize: "vertical" }}
                  value={fields.whatWrong || ""}
                  onChange={(e) => setField("whatWrong", e.target.value)}
                />
              </div>
            </>
          )}

          {/* AI fields */}
          {category === "ai" && (
            <>
              <div className="field-group">
                <label className="field-label">Which step were you in?</label>
                <select
                  className="field-input"
                  value={fields.whichStep || ""}
                  onChange={(e) => setField("whichStep", e.target.value)}
                >
                  <option value="">Select…</option>
                  {AI_STEPS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">What was wrong with the response?</label>
                <select
                  className="field-input"
                  value={fields.whatWrongAI || ""}
                  onChange={(e) => setField("whatWrongAI", e.target.value)}
                >
                  <option value="">Select…</option>
                  {AI_PROBLEMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Additional notes (optional)</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 80, resize: "vertical" }}
                  value={fields.aiNotes || ""}
                  onChange={(e) => setField("aiNotes", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Feature fields */}
          {category === "feature" && (
            <>
              <div className="field-group">
                <label className="field-label">Where in the workflow would this live?</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 60, resize: "vertical" }}
                  value={fields.whereInWorkflow || ""}
                  onChange={(e) => setField("whereInWorkflow", e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Describe what you need</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 100, resize: "vertical" }}
                  value={fields.describeFeature || ""}
                  onChange={(e) => setField("describeFeature", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Copy fields */}
          {category === "copy" && (
            <>
              <div className="field-group">
                <label className="field-label">Where is the text?</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 60, resize: "vertical" }}
                  placeholder="e.g. Series Planner → Overview tab → Big Idea label"
                  value={fields.whereIsText || ""}
                  onChange={(e) => setField("whereIsText", e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label">What should it say instead?</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 80, resize: "vertical" }}
                  value={fields.whatItShouldSay || ""}
                  onChange={(e) => setField("whatItShouldSay", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Feedback messages */}
          {successMsg && (
            <p style={{ color: "var(--sage)", fontFamily: "'Crimson Pro', serif", fontSize: 14, margin: "8px 0 0" }}>
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <div style={{ marginTop: "8px" }}>
              <InlineError onDismiss={() => setErrorMsg(null)}>{errorMsg}</InlineError>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={handleSubmit}
            disabled={submitting || !isFormValid(category, fields)}
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
