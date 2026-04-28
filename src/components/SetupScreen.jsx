import { useState } from "react";
import { saveApiKey } from "../db/database";

export default function SetupScreen({ onComplete }) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isValidFormat = key.startsWith("sk-ant-") && key.length >= 20;

  async function handleSave() {
    if (!isValidFormat || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveApiKey(key);
      if (result?.success) {
        onComplete();
      } else {
        setError(result?.error || "Failed to save key.");
        setSaving(false);
      }
    } catch (e) {
      setError(e?.message || "An unexpected error occurred.");
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSave();
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "var(--parchment)",
      fontFamily: "'Crimson Pro', serif",
    }}>
      <div style={{
        background: "var(--white)",
        border: "1px solid var(--parchment-deep)",
        borderRadius: "8px",
        padding: "48px",
        maxWidth: "480px",
        width: "100%",
        boxShadow: "0 4px 24px rgba(26,20,16,0.08)",
      }}>

        {/* Logo / Title */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "28px",
            color: "var(--ink)",
            fontWeight: 700,
            margin: "0 0 8px",
          }}>
            SermonForge
          </h1>
          <p style={{ color: "var(--ink-ghost)", fontSize: "14px", margin: 0 }}>
            One-time setup
          </p>
        </div>

        {/* Explanation */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ color: "var(--ink-mid)", fontSize: "15px", lineHeight: "1.6", margin: "0 0 12px" }}>
            SermonForge uses Claude AI for sermon preparation. You'll need your own
            Claude API key — it takes about 2 minutes to get one.
          </p>
          <ol style={{ color: "var(--ink-mid)", fontSize: "14px", lineHeight: "1.8", paddingLeft: "20px", margin: 0 }}>
            <li>Go to <strong style={{ color: "var(--ink)" }}>console.anthropic.com</strong></li>
            <li>Create a free account</li>
            <li>Click <strong style={{ color: "var(--ink)" }}>API Keys</strong> → <strong style={{ color: "var(--ink)" }}>Create Key</strong></li>
            <li>Paste it below</li>
          </ol>
        </div>

        {/* Key input */}
        <div style={{ marginBottom: "8px" }}>
          <label style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--ink-soft)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "8px",
          }}>
            Your Claude API Key
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showKey ? "text" : "password"}
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="sk-ant-..."
              autoFocus
              spellCheck={false}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 44px 10px 12px",
                fontSize: "14px",
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
              onClick={() => setShowKey(v => !v)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-ghost)",
                fontSize: "12px",
                padding: "2px 4px",
              }}
            >
              {showKey ? "hide" : "show"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{
            color: "var(--crimson-soft)",
            fontSize: "13px",
            margin: "8px 0 0",
            fontFamily: "'Crimson Pro', serif",
          }}>
            {error}
          </p>
        )}

        {/* Save button */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!isValidFormat || saving}
          style={{ width: "100%", marginTop: "20px" }}
        >
          {saving ? "Saving…" : "Save and Continue"}
        </button>

        {/* Fine print */}
        <p style={{
          color: "var(--ink-ghost)",
          fontSize: "12px",
          textAlign: "center",
          marginTop: "16px",
          lineHeight: "1.5",
        }}>
          Your key is stored securely on this machine and never transmitted anywhere
          except directly to Anthropic when you use the AI features.
        </p>
      </div>
    </div>
  );
}
