import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/typography.css";
import "./styles/global.css";

// Forward a renderer-side error to the main process so it lands in app.log (and
// a `crash` telemetry event, if telemetry is on). The React ErrorBoundary only
// catches render-phase throws inside the tree — not module-eval errors,
// event-handler throws, or async rejections. These global hooks cover the rest
// so field crashes are diagnosable instead of vanishing into a closed DevTools.
function reportRendererError(label, detail) {
  try { window.electronAPI?.reportRendererError?.(label, String(detail ?? "")); } catch (_) { /* never throw from a reporter */ }
}
window.addEventListener("error", (e) => {
  reportRendererError("window.onerror", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ""}`);
});
window.addEventListener("unhandledrejection", (e) => {
  reportRendererError("unhandledrejection", e.reason?.stack || String(e.reason));
});

const root = ReactDOM.createRoot(document.getElementById("root"));

// If we're inside Electron but the preload bridge never loaded, the app CANNOT
// persist anything. Show a hard error instead of letting the browser-preview
// stub fake a working workspace (it answers getApiKeyStatus → {configured:true}
// and resolves writes to nothing) — that path silently drops every edit on
// restart. In a plain browser (Vite dev / preview) there is no bridge by design,
// and the stub in src/db/database.js is the correct behavior.
const inElectron = typeof navigator !== "undefined" && /\bElectron\//i.test(navigator.userAgent);
if (inElectron && !window.electronAPI) {
  reportRendererError("bridge-missing", "window.electronAPI is undefined in an Electron renderer — preload failed to load");
  root.render(<BridgeError />);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

function BridgeError() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100vh", gap: "16px", background: "var(--parchment)", padding: "32px",
      fontFamily: "var(--font-serif)", textAlign: "center",
    }}>
      <h1 style={{ color: "var(--ink)", fontSize: "24px", margin: 0 }}>
        SermonForge couldn't start correctly
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: "15px", lineHeight: 1.6, maxWidth: "460px" }}>
        The app's internal bridge didn't load, so your work can't be saved. This usually
        means the installation is damaged or was blocked by antivirus. Please reinstall
        SermonForge — your existing sermons are safe in your data folder and won't be touched.
      </p>
    </div>
  );
}
