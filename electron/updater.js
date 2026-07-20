// electron/updater.js — auto-update via GitHub Releases.
//
// Only active in packaged builds. In dev or any unpackaged run the
// background check is a no-op and the manual check explains itself.
//
// Quiet by design: downloads happen silently and install on the next quit
// (autoInstallOnAppQuit). When a download finishes, the renderer gets a
// push on "updater-status" and shows a dismissible line — no focus-stealing
// dialog, no default-Enter restart while the pastor is mid-sentence. The
// optional "Restart now" routes through main's before-quit handler, which
// flushes the renderer's debounced edits before anything closes.

const { autoUpdater } = require("electron-updater");
const { app, dialog } = require("electron");
const { logInfo, logError } = require("./logger");
const { isPackaged } = require("./config");
const { DOWNLOAD_PAGE } = require("./support");

// Only CI-published builds may auto-update. CI stamps sfReleaseChannel into
// package.json alongside the tag version (build.yml); a local `npm run build`
// carries no stamp. Without this gate, a local build reports the 1.0.0
// package.json pin, the published GitHub release always outranks it, and the
// updater silently replaces the build under test with the last release
// (the 2026-07-16 downgrade: a dev build became v1.1.0 within seconds of
// launch — twice — while the pastor was looking for a newer feature).
const isReleaseBuild = (() => {
  try {
    return require("../package.json").sfReleaseChannel === "stable";
  } catch {
    return false;
  }
})();

// Last known status — pulled by the renderer on mount (covers the race
// where the download finished before React subscribed) and pushed on
// change.
//
// States, in the order they can occur. Each one is only ever set by the
// updater event that PROVES it, so no surface can claim a step that has
// not happened (the 2026-07-20 audit's C1/L12: the manual dialog used to
// announce "a new version is downloading" off a bare version compare —
// true on neither a failed download nor a rollback window, and never true
// on macOS, where the download threw before a byte moved):
//
//   { state: "available",   version }            update exists; download initiated
//   { state: "downloading", version, percent }   bytes are actually moving
//   { state: "downloaded",  version }            staged; installs on next quit
//   { state: "error" }                           check or download failed
//
// The renderer acts only on "downloaded" (Sidebar's update-ready line);
// the others exist so the manual dialog can speak the truth.
let _status = null;

function getUpdaterStatus() {
  return _status;
}

// One place that both records a state and tells the renderer, so a status
// can never be updated without the surface hearing about it.
function setStatus(next, getWindow) {
  _status = next;
  const win = getWindow?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send("updater-status", _status);
  }
}

// Renderer-initiated restart ("Restart now"). quitAndInstall routes
// through app.quit() → main's before-quit (renderer edit flush + WAL
// checkpoint + db close) → app.exit(0) → 'quit' → the installer hook
// autoInstallOnAppQuit registered. The before-quit preventDefault may
// preempt quitAndInstall's immediate path; the install still happens on
// the resulting exit.
function restartAndInstall() {
  if (!isPackaged || !isReleaseBuild) return;
  autoUpdater.quitAndInstall();
}

// Help > Check for Updates… — never silent. Each outcome speaks, parented
// to the main window so it can't be lost behind it.
async function checkForUpdatesInteractive(win) {
  const parent = win && !win.isDestroyed() ? win : undefined;
  if (!isPackaged) {
    dialog.showMessageBox(parent, {
      type: "info",
      title: "Check for Updates",
      message: "Updates only run in the installed app.",
      buttons: ["OK"],
    });
    return;
  }
  if (!isReleaseBuild) {
    // Ross-facing only: pastors never run an unstamped build.
    dialog.showMessageBox(parent, {
      type: "info",
      title: "Check for Updates",
      message: "Updates are off in this build.",
      detail: "This is a local development build — it never auto-updates. Published releases update themselves.",
      buttons: ["OK"],
    });
    return;
  }
  if (_status?.state === "downloaded") {
    dialog.showMessageBox(parent, {
      type: "info",
      title: "Check for Updates",
      message: `SermonForge ${_status.version} is ready.`,
      detail: "It will install itself the next time you close the app.",
      buttons: ["OK"],
    });
    return;
  }
  if (_status?.state === "downloading") {
    dialog.showMessageBox(parent, {
      type: "info",
      title: "Check for Updates",
      message: `SermonForge ${_status.version} is downloading.`,
      detail: "You don't need to do anything. It will install itself the next time you close the app.",
      buttons: ["OK"],
    });
    return;
  }
  try {
    const res = await autoUpdater.checkForUpdates();
    const current = app.getVersion();
    // isUpdateAvailable — not a version compare. The compare said "newer"
    // during a rollback or a draft window and promised a download that
    // could never start; this flag is the updater's own verdict and
    // already accounts for downgrade rules.
    if (!res?.isUpdateAvailable) {
      dialog.showMessageBox(parent, {
        type: "info",
        title: "Check for Updates",
        message: `You're up to date — SermonForge ${current}.`,
        buttons: ["OK"],
      });
    } else {
      // An update exists and the download has been STARTED (autoDownload).
      // We do not claim it finished, and we say what happens if it can't —
      // the pastor is never left believing an install is guaranteed.
      dialog.showMessageBox(parent, {
        type: "info",
        title: "Check for Updates",
        message: `SermonForge ${res.updateInfo?.version ?? ""}`.trim() + " is available.",
        detail:
          "SermonForge is downloading it now. Once it finishes, it installs the next time you close the app. " +
          `If the download can't finish, you can install the new version yourself from ${DOWNLOAD_PAGE}.`,
        buttons: ["OK"],
      });
    }
  } catch (err) {
    logError("[updater] manual check failed", err);
    setStatus({ state: "error" }, () => (parent && !parent.isDestroyed() ? parent : null));
    dialog.showMessageBox(parent, {
      type: "warning",
      title: "Check for Updates",
      message: "SermonForge couldn't check for updates.",
      detail:
        "Check your internet connection and try again. " +
        `You can also download the latest version yourself from ${DOWNLOAD_PAGE}.`,
      buttons: ["OK"],
    });
  }
}

function initUpdater({ getWindow } = {}) {
  if (!isPackaged) return;
  // The packaged release smoke must not depend on GitHub being reachable.
  // Without this the release gate carries a hidden network dependency and
  // the smoke races a live update download (2026-07-20 audit, L11).
  if (process.env.SF_SMOKE === "1") {
    logInfo("[updater] disabled — SF_SMOKE run (no network)");
    return;
  }
  if (!isReleaseBuild) {
    logInfo("[updater] disabled — local build (no release channel stamp)");
    return;
  }

  autoUpdater.logger = null; // we handle all logging ourselves
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    logInfo("[updater] Checking for updates");
  });

  autoUpdater.on("update-available", ({ version }) => {
    logInfo(`[updater] Update available: ${version}`);
    setStatus({ state: "available", version }, getWindow);
  });

  autoUpdater.on("update-not-available", () => {
    logInfo("[updater] Up to date");
  });

  // Covers BOTH a failed check and a failed download — electron-updater
  // routes both here. Recording it means the manual dialog can report a
  // real failure instead of repeating a download claim that already died
  // (this is the branch every macOS build hit before the ZIP target
  // existed: ERR_UPDATER_ZIP_FILE_NOT_FOUND).
  autoUpdater.on("error", (err) => {
    logError("[updater] Update failed", err);
    setStatus({ state: "error" }, getWindow);
  });

  autoUpdater.on("download-progress", ({ percent }) => {
    const pct = Math.round(percent);
    logInfo(`[updater] Downloading: ${pct}%`);
    setStatus({ state: "downloading", version: _status?.version, percent: pct }, getWindow);
  });

  autoUpdater.on("update-downloaded", ({ version }) => {
    logInfo(`[updater] Update downloaded: ${version}`);
    setStatus({ state: "downloaded", version }, getWindow);
  });

  // Delay 3 seconds so the app feels instant on launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      logError("[updater] checkForUpdates failed", err);
    });
  }, 3000);
}

module.exports = {
  initUpdater,
  getUpdaterStatus,
  restartAndInstall,
  checkForUpdatesInteractive,
};
