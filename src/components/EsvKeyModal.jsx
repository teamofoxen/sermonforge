import { useState, useEffect } from "react";
import { saveApiKeys } from "../db/database";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

function KeyInput({ value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Token ..."
        disabled={disabled}
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
        aria-label={show ? "Hide key" : "Show key"}
        onClick={() => setShow(v => !v)}
        disabled={disabled}
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

export default function EsvKeyModal({ onClose }) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => onClose?.(), 1200);
    return () => clearTimeout(t);
  }, [saved, onClose]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveApiKeys({ esv: key.trim() });
      if (result?.success) {
        setSaved(true);
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
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(26,20,16,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000, padding: "20px",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        background: "var(--white)",
        border: "1px solid var(--parchment-deep)",
        borderRadius: "8px",
        padding: "32px 36px",
        maxWidth: "440px",
        width: "100%",
        boxShadow: "0 4px 24px rgba(26,20,16,0.12)",
        fontFamily: "var(--font-serif)",
      }}>
        {saved ? (
          <p style={{ textAlign: "center", color: "var(--ink)", fontSize: "15px", margin: 0 }}>
            ESV key saved.
          </p>
        ) : (
          <>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>
              Update ESV API key
            </h2>
            <p style={{ fontSize: "13px", color: "var(--ink-mid)", margin: "0 0 16px", lineHeight: 1.55 }}>
              Get a free key at <strong style={{ color: "var(--ink)" }}>api.esv.org</strong>.
              Paste it below and save — the old key will be replaced.
            </p>
            <KeyInput value={key} onChange={setKey} disabled={saving} />
            {error && (
              <p style={{ fontSize: "13px", color: "#c0392b", margin: "10px 0 0", lineHeight: 1.5 }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <PrimaryButton
                onClick={handleSave}
                disabled={saving || !key.trim()}
                style={{ flex: 1 }}
              >
                {saving ? "Saving…" : "Save key"}
              </PrimaryButton>
              <SecondaryButton onClick={onClose} disabled={saving}>
                Cancel
              </SecondaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
