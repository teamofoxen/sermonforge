import { useEffect, useState } from "react";
import { getStartupWarning, openDataFolder } from "../db/database";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";

const BANNER_DISMISS_KEY = "sf-onedrive-banner-dismissed";

export default function OneDriveWarning() {
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getStartupWarning()
      .then((payload) => {
        if (cancelled || !payload) return;
        const known = payload.kind === "onedrive"
          || payload.kind === "onedrive-first-run"
          || payload.kind === "db_migrated"
          || payload.kind === "db_recovered_backup"
          || payload.kind === "db_corrupt_quarantined";
        if (!known) return;
        if (payload.kind === "onedrive" && localStorage.getItem(BANNER_DISMISS_KEY) === "1") return;
        setWarning(payload);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!warning) return null;

  const dismiss = () => {
    if (warning.kind === "onedrive") localStorage.setItem(BANNER_DISMISS_KEY, "1");
    setWarning(null);
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
            <PrimaryButton onClick={() => openDataFolder()}>Open data folder</PrimaryButton>
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
          <h2 id="onedrive-modal-title" style={modalTitle}>Move SermonForge data out of OneDrive</h2>
          <p style={modalBody}>
            SermonForge stores your sermons in a SQLite database. OneDrive's cloud sync can rewrite
            that database mid-write and corrupt it. Before adding any sermons, please pause OneDrive
            sync for the data folder, or relocate it to a folder OneDrive does not sync.
          </p>
          <p style={modalPath}>{warning.path}</p>
          <div style={modalActions}>
            <PrimaryButton onClick={() => openDataFolder()}>
              Open data folder
            </PrimaryButton>
            <SecondaryButton onClick={dismiss}>
              I understand the risk — continue
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
          Cloud sync can corrupt the SermonForge database. Move the folder off OneDrive sync when convenient.
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
  position: "fixed", inset: 0, background: "rgba(26,20,16,0.55)",
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
