import { useState } from "react";
import { saveApiKeys, setSetting, openExternal } from "../db/database";
import mapError from "../utils/mapError";
import InlineError from "./InlineError";
import PrimaryButton from "./primitives/PrimaryButton";
import TextButton from "./primitives/TextButton";
import KeyInput from "./primitives/KeyInput";

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

export default function SetupScreen({ onComplete }) {
  const [esv, setEsv] = useState("");
  const [telemetryOn, setTelemetryOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Set when the key saved but couldn't be checked (no internet / ESV site
  // didn't answer) — the screen pauses on an honest note + Continue instead
  // of silently proceeding.
  const [unverifiedNote, setUnverifiedNote] = useState(false);

  async function finishSetup() {
    try {
      await setSetting("bti_telemetry_enabled", telemetryOn ? "true" : "false");
      await window.electronAPI?.telemetrySetEnabled?.(telemetryOn);
    } catch (_) {}
    onComplete();
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveApiKeys({ esv: esv.trim() });
      if (result?.success) {
        if (result.unverified && esv.trim()) {
          setSaving(false);
          setUnverifiedNote(true);
          return;
        }
        await finishSetup();
      } else {
        setError(result?.error || "Failed to save.");
        setSaving(false);
      }
    } catch (e) {
      // result?.error above carries main-authored plain English and renders
      // as-is; only transport-layer throws land here — translate those.
      setError(mapError(e, "key"));
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
            <li>
              Go to{" "}
              <TextButton
                size="sm"
                onClick={() => openExternal("https://api.esv.org/")}
                style={{ fontSize: "14px", padding: 0, verticalAlign: "baseline" }}
              >
                api.esv.org
              </TextButton>{" "}
              and sign in or create an account
            </li>
            <li>On their site choose <strong style={{ color: "var(--ink)" }}>Create an API Application</strong> — your key appears on the next page</li>
            <li>Copy the key and paste it below</li>
          </ol>
          <label style={LABEL}>Your ESV API key <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(leave blank to skip)</span></label>
          <KeyInput
            value={esv}
            onChange={setEsv}
            placeholder="Paste your key here"
          />
        </div>

        {error && (
          <div style={{ marginTop: "16px" }}>
            <InlineError onDismiss={() => setError(null)}>{error}</InlineError>
          </div>
        )}

        {unverifiedNote ? (
          <>
            <p style={{
              marginTop: "20px", marginBottom: 0,
              padding: "12px 14px",
              background: "var(--parchment-warm)",
              border: "1px solid var(--parchment-deep)",
              borderRadius: "4px",
              color: "var(--ink-mid)", fontSize: "13px", lineHeight: 1.55,
            }}>
              Saved — but we couldn't check the key just now (no internet, or
              the ESV site didn't answer). If Bible passages don't load later,
              use the ESV key link at the bottom of the left sidebar.
            </p>
            <PrimaryButton
              onClick={finishSetup}
              style={{ width: "100%", marginTop: "16px" }}
            >
              Continue
            </PrimaryButton>
          </>
        ) : (
          <PrimaryButton
            onClick={handleSave}
            disabled={saving}
            style={{ width: "100%", marginTop: "24px" }}
          >
            {saving ? "Saving…" : esv.trim() ? "Save and Open SermonForge" : "Skip and Open SermonForge"}
          </PrimaryButton>
        )}

        <p style={FINE_PRINT}>
          The ESV key is stored securely on this machine and only sent to Crossway when you load passages.
        </p>

        <div style={{ ...SECTION, paddingTop: "20px", marginTop: "20px" }}>
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "14px", color: "var(--ink)", margin: "0 0 8px",
          }}>
            Usage reports and feedback
          </h2>
          <p style={{ color: "var(--ink-mid)", fontSize: "13px", lineHeight: "1.55", margin: "0 0 10px" }}>
            SermonForge sends small usage reports to its developer — which buttons get
            pressed, when something crashes, and any feedback you choose to send.
            <strong> Sermon content is never included.</strong>
          </p>
          <p style={{ color: "var(--ink-mid)", fontSize: "13px", lineHeight: "1.55", margin: "0 0 10px" }}>
            Reports go only to the developer, never to advertisers or analytics companies.
            Turn this off below and SermonForge stops sending them — loading Bible passages
            and checking for updates still use the internet.
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
          <strong style={{ color: "var(--ink-soft)" }}>One caution:</strong> install SermonForge on the
          computer itself, not inside a OneDrive or Dropbox folder — synced folders can damage its files.
        </p>
      </div>
    </div>
  );
}
