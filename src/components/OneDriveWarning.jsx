import { useCallback, useEffect, useState } from "react";
import { getStartupWarning, openDataFolder, emailSupport } from "../db/database";
import { SUPPORT_EMAIL } from "../constants/support";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";

const BANNER_DISMISS_KEY = "sf-onedrive-banner-dismissed";

const KNOWN_KINDS = new Set([
  "onedrive",
  "onedrive-first-run",
  "db_migrated",
  "db_recovered_backup",
  "db_corrupt_quarantined",
]);

export default function OneDriveWarning() {
  const [warning, setWarning] = useState(null);

  // Main queues warnings and hands out one per call in severity order;
  // dismissing re-fetches so they present one at a time instead of the
  // lower-priority one silently overwriting the higher.
  const fetchNext = useCallback(() => {
    getStartupWarning()
      .then((payload) => {
        if (!payload || !KNOWN_KINDS.has(payload.kind)) {
          setWarning(null);
          return;
        }
        if (payload.kind === "onedrive" && localStorage.getItem(BANNER_DISMISS_KEY) === "1") {
          // Already dismissed for good — skip to whatever is queued next.
          fetchNext();
          return;
        }
        setWarning(payload);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchNext(); }, [fetchNext]);

  if (!warning) return null;

  const dismiss = () => {
    if (warning.kind === "onedrive") localStorage.setItem(BANNER_DISMISS_KEY, "1");
    setWarning(null);
    fetchNext();
  };

  if (warning.kind === "db_migrated") {
    return (
      <div className="write-error-banner" role="status" style={{ background: "rgba(74,103,65,0.10)", borderColor: "rgba(74,103,65,0.25)" }}>
        <div className="write-error-banner-text">
          <strong>Library restored.</strong>
          <span className="write-error-banner-detail">{warning.message}</span>
        </div>
        <div className="write-error-banner-actions">
          <SecondaryButton size="sm" onClick={dismiss}>Got it</SecondaryButton>
        </div>
      </div>
    );
  }

  // Loaded from the .bak after the primary was damaged or missing. Informational
  // banner (gold tint) — the user can keep working; the damaged file is kept aside.
  if (warning.kind === "db_recovered_backup") {
    return (
      <div className="write-error-banner" role="status" style={{ background: "rgba(184,134,11,0.10)", borderColor: "rgba(184,134,11,0.30)" }}>
        <div className="write-error-banner-text">
          <strong>Library recovered from backup.</strong>
          <span className="write-error-banner-detail">{warning.message}</span>
        </div>
        <div className="write-error-banner-actions">
          <PrimaryButton size="sm" onClick={() => openDataFolder()}>Open folder</PrimaryButton>
          <SecondaryButton size="sm" onClick={dismiss}>Got it</SecondaryButton>
        </div>
      </div>
    );
  }

  // Neither the primary nor the backup could be read — a fresh library was
  // started and the original was kept aside. Serious + rare: surface as a
  // blocking modal so the user sees it before doing more work.
  if (warning.kind === "db_corrupt_quarantined") {
    return (
      <div style={backdrop} role="dialog" aria-modal="true" aria-labelledby="db-corrupt-title">
        <div style={modal}>
          <h2 id="db-corrupt-title" style={modalTitle}>We couldn't open your library</h2>
          <p style={modalBody}>{warning.message}</p>
          {warning.path ? <p style={modalPath}>{warning.path}</p> : null}
          <div style={modalActions}>
            <PrimaryButton
              onClick={() =>
                emailSupport({
                  subject: "SermonForge library recovery",
                  body: warning.path ? `Quarantined file: ${warning.path}` : "",
                })
              }
            >
              Email support
            </PrimaryButton>
            <SecondaryButton onClick={() => openDataFolder()}>Open data folder</SecondaryButton>
            <SecondaryButton onClick={dismiss}>Continue with a fresh library</SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  if (warning.kind === "onedrive-first-run") {
    return (
      <div style={backdrop} role="dialog" aria-modal="true" aria-labelledby="onedrive-modal-title">
        <div style={modal}>
          <h2 id="onedrive-modal-title" style={modalTitle}>Your sermons are being kept in a OneDrive folder</h2>
          <p style={modalBody}>
            OneDrive sometimes changes files while SermonForge is saving, which
            can damage the file where your sermons are kept. SermonForge
            protects you with an automatic backup, but the safest thing is to
            move your sermons out of OneDrive. Email {SUPPORT_EMAIL} and we'll
            walk you through it — it takes a few minutes.
          </p>
          <p style={modalPath}>{warning.path}</p>
          <div style={modalActions}>
            <PrimaryButton
              onClick={() =>
                emailSupport({ subject: "Help moving SermonForge out of OneDrive" })
              }
            >
              Email support
            </PrimaryButton>
            <SecondaryButton onClick={() => openDataFolder()}>
              Open data folder
            </SecondaryButton>
            <SecondaryButton onClick={dismiss}>
              Continue anyway
            </SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="write-error-banner" role="alert">
      <div className="write-error-banner-text">
        <strong>Your data folder is inside OneDrive.</strong>
        <span className="write-error-banner-detail">
          Synced folders can damage the file where your sermons are kept.
          SermonForge keeps an automatic backup; email {SUPPORT_EMAIL} when
          you'd like help moving it.
        </span>
      </div>
      <div className="write-error-banner-actions">
        <PrimaryButton size="sm" onClick={() => openDataFolder()}>Open folder</PrimaryButton>
        <SecondaryButton size="sm" onClick={dismiss} title="Don't show again">Dismiss</SecondaryButton>
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed", inset: 0, background: "var(--scrim)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
};

const modal = {
  background: "var(--white)", border: "1px solid var(--parchment-deep)",
  borderRadius: "8px", padding: "32px 36px", maxWidth: "520px", width: "calc(100% - 48px)",
  boxShadow: "0 8px 32px rgba(26,20,16,0.18)", fontFamily: "var(--font-serif)",
};

const modalTitle = {
  fontFamily: "var(--font-serif)",
  fontSize: "20px", color: "var(--ink)", margin: "0 0 12px",
};

const modalBody = {
  color: "var(--ink-mid)", fontSize: "14px", lineHeight: "1.6", margin: "0 0 12px",
};

const modalPath = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
  color: "var(--ink-soft)", background: "var(--parchment)",
  border: "1px solid var(--parchment-deep)", borderRadius: "4px",
  padding: "8px 10px", margin: "0 0 20px", wordBreak: "break-all",
};

const modalActions = {
  display: "flex", gap: "8px", justifyContent: "flex-end",
};
