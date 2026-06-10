// electron/menu.js — the pastor-shaped application menu.
//
// Replaces Electron's stock menu, which offered pastors Reload (Ctrl+R —
// silently destroying in-flight edits), Force Reload, DevTools, and Help
// links to Electron's own website. Setting our own menu also unregisters
// those stock accelerators — the reload data-loss hole closes here without
// touching the renderer.
//
// Edit keeps full clipboard ROLES — non-negotiable: on macOS, cut/copy/
// paste in text fields stop working app-wide without them. Reload/DevTools
// survive only in unpackaged runs (config.js isPackaged is the single
// gatekeeper).

"use strict";

const { app, Menu, dialog, shell } = require("electron");
const { isPackaged, paths } = require("./config");
const { SUPPORT_EMAIL } = require("./support");
const { checkForUpdatesInteractive } = require("./updater");

const WEBSITE_URL = "https://teamofoxen.com/sermonforge";

// Full Crossway notice — the ESV API conditions require this on a
// "copyright page"; the About dialog is the desktop equivalent. The
// passage popup carries the short per-display attribution.
const ESV_FULL_NOTICE =
  "Scripture quotations are from the ESV® Bible (The Holy Bible, English " +
  "Standard Version®), © 2001 by Crossway, a publishing ministry of Good " +
  "News Publishers. Used by permission. All rights reserved. The ESV text " +
  "may not be quoted in any publication made available to the public by a " +
  "Creative Commons license. The ESV may not be translated into any other " +
  "language. Users may not copy or download more than 500 verses of the " +
  "ESV Bible or more than one half of any book of the ESV Bible.";

function showAbout(win) {
  dialog.showMessageBox(win ?? undefined, {
    type: "info",
    title: "About SermonForge",
    message: `SermonForge ${app.getVersion()}`,
    detail:
      "Sermon preparation for pastors — local-first; your sermons stay on this computer.\n\n" +
      `Support: ${SUPPORT_EMAIL}\n\n` +
      ESV_FULL_NOTICE,
    buttons: ["OK"],
  });
}

function buildApplicationMenu({ getWindow }) {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { label: "About SermonForge", click: () => showAbout(getWindow()) },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        }]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit", label: "Exit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "zoomIn", label: "Make Text Bigger" },
        { role: "zoomOut", label: "Make Text Smaller" },
        { role: "resetZoom", label: "Actual Size" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Full Screen" },
        ...(!isPackaged
          ? [
              { type: "separator" },
              { role: "reload" },
              { role: "forceReload" },
              { role: "toggleDevTools" },
            ]
          : []),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          // eslint-disable-next-line sermonforge/canonical-loading-verb -- OS-conventional menu label (ellipsis = opens a dialog), not a loading verb
          label: "Check for Updates…",
          click: () => checkForUpdatesInteractive(getWindow()),
        },
        {
          label: "Email Support",
          click: () =>
            shell.openExternal(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("SermonForge support")}`
            ),
        },
        {
          label: "SermonForge Website",
          click: () => shell.openExternal(WEBSITE_URL),
        },
        {
          label: "Open Data Folder",
          click: () => shell.openPath(paths.userData),
        },
        ...(!isMac
          ? [
              { type: "separator" },
              { label: "About SermonForge", click: () => showAbout(getWindow()) },
            ]
          : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildApplicationMenu };
