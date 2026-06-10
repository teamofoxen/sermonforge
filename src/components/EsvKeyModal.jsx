import { useState, useEffect } from "react";
import { saveApiKeys, openExternal } from "../db/database";
import mapError from "../utils/mapError";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import TextButton from "./primitives/TextButton";
import KeyInput from "./primitives/KeyInput";

export default function EsvKeyModal({ onClose }) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // false | "ok" | "unverified" — ok auto-closes; unverified waits for an
  // explicit Close so the pastor actually reads the note.
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (saved !== "ok") return;
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
        setSaved(result.unverified ? "unverified" : "ok");
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
    <div
      style={{
        position: "fixed", inset: 0,
        background: "var(--scrim)",
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
        {saved === "ok" ? (
          <p style={{ textAlign: "center", color: "var(--ink)", fontSize: "15px", margin: 0 }}>
            ESV key saved.
          </p>
        ) : saved === "unverified" ? (
          <>
            <p style={{ color: "var(--ink-mid)", fontSize: "14px", margin: "0 0 16px", lineHeight: 1.55 }}>
              Saved — but we couldn't check the key just now (no internet, or
              the ESV site didn't answer). If Bible passages don't load later,
              open this window again and re-enter it.
            </p>
            <SecondaryButton onClick={onClose} style={{ width: "100%" }}>
              Close
            </SecondaryButton>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>
              Update ESV API key
            </h2>
            <p style={{ fontSize: "13px", color: "var(--ink-mid)", margin: "0 0 16px", lineHeight: 1.55 }}>
              Get a free key at{" "}
              <TextButton
                size="sm"
                onClick={() => openExternal("https://api.esv.org/")}
                style={{ fontSize: "13px", padding: 0, verticalAlign: "baseline" }}
              >
                api.esv.org
              </TextButton>
              . Paste it below and save — the old key will be replaced.
            </p>
            <KeyInput value={key} onChange={setKey} disabled={saving} />
            {error && (
              <p style={{ fontSize: "13px", color: "var(--crimson-soft)", margin: "10px 0 0", lineHeight: 1.5 }}>
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
