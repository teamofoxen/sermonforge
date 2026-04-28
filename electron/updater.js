// electron/updater.js — auto-update via GitHub Releases.
//
// Only active in packaged builds. In dev or any unpackaged run this is a no-op.
// Downloads silently in the background. When ready, prompts the user to restart
// or defers to the next launch (autoInstallOnAppQuit handles the deferred case).

const { autoUpdater } = require("electron-updater");
const { dialog } = require("electron");
const { logInfo, logError } = require("./logger");
const { isPackaged } = require("./config");

function initUpdater() {
  if (!isPackaged) return;

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
    dialog.showMessageBox({
      type: "info",
      title: "Update Ready",
      message: `SermonForge ${version} is ready to install.`,
      detail: "Restart now to apply the update, or it will install automatically the next time you open the app.",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    }).catch((err) => {
      logError("[updater] Dialog error", err);
    });
  });

  // Delay 3 seconds so the app feels instant on launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      logError("[updater] checkForUpdates failed", err);
    });
  }, 3000);
}

module.exports = { initUpdater };
