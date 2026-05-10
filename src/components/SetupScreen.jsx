import { useState } from "react";
import { saveApiKeys, setSetting } from "../db/database";
import InlineError from "./InlineError";
import PrimaryButton from "./primitives/PrimaryButton";
import IconButton from "./primitives/IconButton";

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

const FINE_PRINT = {
  color: "var(--ink-ghost)", fontSize: "12px",
  textAlign: "center", marginTop: "10px", lineHeight: "1.5",
};

const SECTION = {
  borderTop: "1px solid var(--parchment-deep)",
  paddingTop: "24px",
  marginTop: "24px",
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
      <IconButton
        aria-label={show ? "Hide API key" : "Show API key"}
        onClick={() => setShow(v => !v)}
        style={{
          position: "absolute", right: "10px", top: "50%",
          transform: "translateY(-50%)",
          background: "none", border: "none",
          color: "var(--ink-ghost)", fontSize: "12px", padding: "2px 4px",
        }}
      >
        {show ? "hide" : "show"}
      </IconButton>
    </div>
  );
}

export default function SetupScreen({ onComplete }) {
  const [esv, setEsv] = useState("");
  const [telemetryOn, setTelemetryOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveApiKeys({ esv: esv.trim() });
      if (result?.success) {
        try {
          await setSetting("bti_telemetry_enabled", telemetryOn ? "true" : "false");
          await window.electronAPI?.telemetrySetEnabled?.(telemetryOn);
        } catch (_) {}
        onComplete();
      } else {
        setError(result?.error || "Failed to save.");
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
      fontFamily: "var(--font-serif)",
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

        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "26px", color: "var(--ink)", fontWeight: 700, margin: "0 0 6px",
          }}>
            SermonForge
          </h1>
          <p style={{ color: "var(--ink-ghost)", fontSize: "14px", margin: 0 }}>
            One-time setup
          </p>
        </div>

        <div>
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "16px", color: "var(--ink)", margin: "0 0 4px",
          }}>
            ESV API key <span style={{ color: "var(--ink-ghost)", fontSize: "13px" }}>recommended</span>
          </h2>
          <p style={{ color: "var(--ink-mid)", fontSize: "14px", margin: "0 0 10px", lineHeight: "1.5" }}>
            Powers the passage view in the sermon workspace. Free for personal use — without it,
            the passage column stays empty.
          </p>
          <ol style={STEPS}>
            <li>Go to <strong style={{ color: "var(--ink)" }}>api.esv.org</strong>, sign in or create an account</li>
            <li>Get your ESV API key</li>
            <li>Copy the key and paste it below</li>
          </ol>
          <label style={LABEL}>Your ESV API key <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(leave blank to skip)</span></label>
          <KeyInput
            value={esv}
            onChange={setEsv}
            placeholder="Token ..."
          />
        </div>

        {error && (
          <div style={{ marginTop: "16px" }}>
            <InlineError onDismiss={() => setError(null)}>{error}</InlineError>
          </div>
        )}

        <PrimaryButton
          onClick={handleSave}
          disabled={saving}
          style={{ width: "100%", marginTop: "24px" }}
        >
          {saving ? "Saving…" : esv.trim() ? "Save and Open SermonForge" : "Skip and Open SermonForge"}
        </PrimaryButton>

        <p style={FINE_PRINT}>
          The ESV key is stored securely on this machine and only sent to Crossway when you load passages.
        </p>

        <div style={{ ...SECTION, paddingTop: "20px", marginTop: "20px" }}>
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "14px", color: "var(--ink)", margin: "0 0 8px",
          }}>
            Telemetry and feedback
          </h2>
          <p style={{ color: "var(--ink-mid)", fontSize: "13px", lineHeight: "1.55", margin: "0 0 10px" }}>
            SermonForge sends a small amount of usage data to its developer — things like which buttons
            you press, when something crashes, and any flags or feedback you choose to send.
            <strong> Sermon content is never captured.</strong>
          </p>
          <p style={{ color: "var(--ink-mid)", fontSize: "13px", lineHeight: "1.55", margin: "0 0 10px" }}>
            Data goes to a developer-controlled endpoint — no third-party analytics. Full details in the
            privacy doc shipped with the app (<code style={{ fontFamily: "monospace" }}>docs/REFERENCE/privacy.md</code>).
            You can turn this off below; if you do, nothing leaves your device.
          </p>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            background: "var(--parchment-warm)",
            border: "1px solid var(--parchment-deep)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            color: "var(--ink-mid)",
          }}>
            <input
              type="checkbox"
              checked={telemetryOn}
              onChange={(e) => setTelemetryOn(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Send anonymous usage and feedback to the developer (recommended)</span>
          </label>
        </div>

        <p style={FINE_PRINT}>
          <strong style={{ color: "var(--ink-soft)" }}>Note:</strong> avoid running SermonForge from a
          OneDrive-synced folder. Cloud sync can corrupt the local database.
        </p>
      </div>
    </div>
  );
}
