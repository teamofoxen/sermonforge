import { useEffect, useState } from "react";
import { getStartupWarning, openDataFolder } from "../db/database";

const BANNER_DISMISS_KEY = "sf-onedrive-banner-dismissed";

export default function OneDriveWarning() {
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getStartupWarning()
      .then((payload) => {
        if (cancelled || !payload) return;
        if (payload.kind !== "onedrive" && payload.kind !== "onedrive-first-run") return;
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
            <button className="btn-primary" onClick={() => openDataFolder()}>
              Open data folder
            </button>
            <button className="btn-ghost" onClick={dismiss}>
              I understand the risk — continue
            </button>
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
        <button className="btn-primary btn-sm" onClick={() => openDataFolder()}>Open folder</button>
        <button className="btn-ghost btn-sm" onClick={dismiss} title="Don't show again">Dismiss</button>
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
  boxShadow: "0 8px 32px rgba(26,20,16,0.18)", fontFamily: "'Crimson Pro', serif",
};

const modalTitle = {
  fontFamily: "'Playfair Display', serif",
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
