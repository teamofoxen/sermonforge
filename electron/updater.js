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
// change. Shape: { state: "downloaded", version } is the only state the
// renderer acts on today (downloaded = installs on next quit).
let _status = null;

function getUpdaterStatus() {
  return _status;
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
  try {
    const res = await autoUpdater.checkForUpdates();
    const current = app.getVersion();
    const latest = res?.updateInfo?.version;
    if (!latest || latest === current) {
      dialog.showMessageBox(parent, {
        type: "info",
        title: "Check for Updates",
        message: `You're up to date — SermonForge ${current}.`,
        buttons: ["OK"],
      });
    } else {
      dialog.showMessageBox(parent, {
        type: "info",
        title: "Check for Updates",
        message: "A new version is downloading — you don't need to do anything.",
        detail: "It will install itself the next time you close SermonForge.",
        buttons: ["OK"],
      });
    }
  } catch (err) {
    logError("[updater] manual check failed", err);
    dialog.showMessageBox(parent, {
      type: "warning",
      title: "Check for Updates",
      message: "SermonForge couldn't check for updates.",
      detail: "Check your internet connection and try again.",
      buttons: ["OK"],
    });
  }
}

function initUpdater({ getWindow } = {}) {
  if (!isPackaged) return;
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
  });

  autoUpdater.on("update-not-available", () => {
    logInfo("[updater] Up to date");
  });

  autoUpdater.on("error", (err) => {
    logError("[updater] Update check failed", err);
  });

  autoUpdater.on("download-progress", ({ percent }) => {
    logInfo(`[updater] Downloading: ${Math.round(percent)}%`);
  });

  autoUpdater.on("update-downloaded", ({ version }) => {
    logInfo(`[updater] Update downloaded: ${version}`);
    _status = { state: "downloaded", version };
    const win = getWindow?.();
    if (win && !win.isDestroyed()) {
      win.webContents.send("updater-status", _status);
    }
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
