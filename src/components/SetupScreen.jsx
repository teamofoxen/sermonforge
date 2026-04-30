import { useState } from "react";
import { saveApiKeys } from "../db/database";
import InlineError from "./InlineError";

const SECTION = {
  borderTop: "1px solid var(--parchment-deep)",
  paddingTop: "24px",
  marginTop: "24px",
};

const LABEL = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--ink-soft)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "8px",
};

const STEPS = {
  color: "var(--ink-mid)",
  fontSize: "14px",
  lineHeight: "1.8",
  paddingLeft: "18px",
  margin: "0 0 12px",
};

function KeyInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 48px 10px 12px",
          fontSize: "13px",
          fontFamily: "'JetBrains Mono', monospace",
          border: "1px solid var(--parchment-deep)",
          borderRadius: "4px",
          background: "var(--parchment)",
          color: "var(--ink)",
          outline: "none",
        }}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: "absolute", right: "10px", top: "50%",
          transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--ink-ghost)", fontSize: "12px", padding: "2px 4px",
        }}
      >
        {show ? "hide" : "show"}
      </button>
    </div>
  );
}

export default function SetupScreen({ onComplete }) {
  const [anthropic, setAnthropic] = useState("");
  const [esv, setEsv] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const claudeValid = anthropic.startsWith("sk-ant-") && anthropic.length >= 20;
  const canSubmit = claudeValid && !saving;

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveApiKeys({ anthropic, esv: esv.trim() });
      if (result?.success) {
        onComplete();
      } else {
        setError(result?.error || "Failed to save keys.");
        setSaving(false);
      }
    } catch (e) {
      setError(e?.message || "An unexpected error occurred.");
      setSaving(false);
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      height: "100vh", background: "var(--parchment)",
      fontFamily: "'Crimson Pro', serif",
      padding: "40px 16px",
      overflowY: "auto",
      boxSizing: "border-box",
    }}>
      <div style={{
        background: "var(--white)",
        border: "1px solid var(--parchment-deep)",
        borderRadius: "8px",
        padding: "40px 48px",
        maxWidth: "520px",
        width: "100%",
        boxShadow: "0 4px 24px rgba(26,20,16,0.08)",
      }}>

        {/* Header */}
        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "26px", color: "var(--ink)", fontWeight: 700, margin: "0 0 6px",
          }}>
            SermonForge
          </h1>
          <p style={{ color: "var(--ink-ghost)", fontSize: "14px", margin: 0 }}>
            One-time setup — takes about 5 minutes
          </p>
        </div>

        {/* ── Section 1: Claude API ───────────────────────────────────────── */}
        <div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "16px", color: "var(--ink)", margin: "0 0 4px",
          }}>
            1. Claude API key <span style={{ color: "var(--crimson-soft)", fontSize: "13px" }}>required</span>
          </h2>
          <p style={{ color: "var(--ink-mid)", fontSize: "14px", margin: "0 0 10px", lineHeight: "1.5" }}>
            SermonForge uses Claude AI as a study companion — exegetical insight, structural feedback, and
            editing help. You write the sermon. The API is pay-as-you-go — typically a fraction of a cent
            per click. $10 of credit will last weeks.
          </p>
          <ol style={STEPS}>
            <li>Go to <strong style={{ color: "var(--ink)" }}>console.anthropic.com</strong> and sign up</li>
            <li>Add a small credit amount under <strong style={{ color: "var(--ink)" }}>Billing</strong> ($5–$10)</li>
            <li>In the sidebar click <strong style={{ color: "var(--ink)" }}>API Keys → Create Key</strong></li>
            <li>Name it "SermonForge", click <strong style={{ color: "var(--ink)" }}>Create</strong></li>
            <li>Copy the key immediately — you won't see it again</li>
          </ol>
          <label style={LABEL}>Your Claude API key</label>
          <KeyInput
            value={anthropic}
            onChange={v => { setAnthropic(v); setError(""); }}
            placeholder="sk-ant-..."
          />
          {anthropic && !claudeValid && (
            <p style={{ color: "var(--ink-ghost)", fontSize: "12px", margin: "6px 0 0" }}>
              Should start with sk-ant-
            </p>
          )}
        </div>

        {/* ── Section 2: ESV API ─────────────────────────────────────────── */}
        <div style={SECTION}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "16px", color: "var(--ink)", margin: "0 0 4px",
          }}>
            2. ESV API key <span style={{ color: "var(--ink-ghost)", fontSize: "13px" }}>optional</span>
          </h2>
          <p style={{ color: "var(--ink-mid)", fontSize: "14px", margin: "0 0 10px", lineHeight: "1.5" }}>
            Adds the ESV translation to the Bible passage popup. The ESV API is free for personal use.
          </p>
          <ol style={STEPS}>
            <li>Go to <strong style={{ color: "var(--ink)" }}>api.esv.org</strong>, create an account, verify your email</li>
            <li>Click <strong style={{ color: "var(--ink)" }}>API Token</strong> and create a token</li>
            <li>Copy the token and paste it below</li>
          </ol>
          <label style={LABEL}>Your ESV API key <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(leave blank to skip)</span></label>
          <KeyInput
            value={esv}
            onChange={setEsv}
            placeholder="Token ..."
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: "16px" }}>
            <InlineError onDismiss={() => setError(null)}>{error}</InlineError>
          </div>
        )}

        {/* Submit */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!canSubmit}
          style={{ width: "100%", marginTop: "24px" }}
        >
          {saving ? "Saving…" : esv.trim() ? "Save and Open SermonForge" : "Skip ESV and Open SermonForge"}
        </button>

        {/* Fine print */}
        <p style={{
          color: "var(--ink-ghost)", fontSize: "12px",
          textAlign: "center", marginTop: "14px", lineHeight: "1.5",
        }}>
          Keys are stored securely on this machine and only sent directly to Anthropic
          and Crossway when you use those features.
        </p>

        {/* OneDrive caution — surfaced here so new users see it before adding data. */}
        <p style={{
          color: "var(--ink-ghost)", fontSize: "12px",
          textAlign: "center", marginTop: "10px", lineHeight: "1.5",
        }}>
          <strong style={{ color: "var(--ink-soft)" }}>Note:</strong> avoid running SermonForge from a
          OneDrive-synced folder. Cloud sync can corrupt the local database.
        </p>
      </div>
    </div>
  );
}
