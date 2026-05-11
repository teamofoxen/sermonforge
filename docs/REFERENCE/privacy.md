# SermonForge — Privacy

> What SermonForge sends, what it doesn't, and the toggle that controls it.

## At a glance

SermonForge is single-user software that runs on your machine. Your sermons live in a SQLite database on your computer. The Crossway ESV API is the one external service the app talks to as a normal part of its work — and only when you load a passage. No other third party receives any data from this app as part of its normal operation.

There is **one** developer-controlled telemetry channel — for shaping the tool over time — and it is opt-out. Sermon content is never part of it.

This document covers everything else.

---

## What stays on your machine, always

- **Sermons.** Every word you write — manuscript, outline, study notes, notebook entries. Stored in a local SQLite file under your app data folder.
- **Series notes.** Same.
- **ESV API key.** Encrypted via the OS keystore (Windows DPAPI, macOS Keychain). Sent only to Crossway when you load a passage.
- **Crash log.** A local log file (`app.log` in your app data folder) records errors. This is for local debugging only and never leaves your machine on its own — only the last 50 lines are attached when the telemetry channel reports a crash event (see below).

These are not part of the telemetry channel. They are not toggleable because they don't transmit on their own.

---

## What the app sends to Crossway

Standard ESV API usage. When you load a passage in the workspace, the app sends:

- The passage reference (e.g., `John 3:16`).
- Your ESV API key.

Crossway returns the passage text. SermonForge does not log the body of those requests anywhere except in the local `app.log` on your machine.

---

## What the app sends to its developer (BTI telemetry)

This is the part the toggle in the setup screen controls. Default-on; one click to disable; nothing leaves the device when off.

### What is captured

**Behavioral events.** Small JSON records of what you do in the app:

- `app-open` — when you launch the app, with the version and platform.
- `panel-time` / `field-time` — how long a panel or field has focus, recorded in summary form (no keystrokes).
- `sermon-create` / `sermon-finish` — sermon-level lifecycle markers, with the sermon's database ID.
- `tour-step` — which tour step you reached (which tour, which step ID).
- `crash` — when the app errors, with the error message and the last 50 lines of `app.log`.

These are **metadata about your interactions, not the content of your work.** None of them carry sermon text, study text, notebook text, or your typing.

**Flag clicks.** When you click the small flag button at a workspace tab and choose to send:

- The surface (Study, Assembly, Manuscript), the active sub-phase, the sermon ID.
- Your one-line note (if you typed one).

**Form submissions.** When you open "Send feedback…" from the sidebar and submit:

- The dimension you picked (e.g., "Structural overreach", "Workflow-fit").
- The free-text you wrote.
- The current sermon ID and step (if you have one open).

### What is NOT captured

- **Sermon content.** Not the manuscript, not the outline, not the study notes, not the notebook, not the title, not anything you typed into a sermon field. The sermon ID travels (so flags can be correlated to a session) but its content does not.
- **Keystrokes, mouse positions, screenshots, or any continuous monitoring.** Just the discrete events listed above.
- **Anything from your machine outside the app.** SermonForge has no read access to other applications, browser history, or the rest of your file system.

### Where it goes

A Cloudflare Worker controlled by the developer. The data lands in a Cloudflare D1 (SQLite) database the developer queries directly. No third-party analytics provider is involved.

### Identifier

A random opaque UUID is generated on first run and stored on your machine. The developer sees this ID, not any personal information. If you uninstall and reinstall, you get a new ID.

### Retention

Until the structured beta cohort program closes. After that, the data set is trimmed to what stays useful for product decisions; the rest is deleted.

### Toggle off semantics

If you turn the toggle off in the setup screen, **nothing leaves your device.** The local `app.log` still exists on your machine for debugging purposes; that is not affected by the toggle.

If you want to turn it back on later, the same toggle will live in a Settings panel in a later version of the app. Until then, contact the developer to flip it via the database.

---

## Where the disclosure surfaces

- The setup screen on first launch (`src/components/SetupScreen.jsx`) shows a short version of this section with the toggle.
- This document is the long-form reference.

If anything in the app contradicts this document, the document is the source of truth — please flag the discrepancy via the in-app flag button.

---

*Last revised: 2026-05-09 (post-ARI rewrite). Pre-ARI version disclosed AI exchanges with Anthropic and an optional AI-exchange include on flag clicks; both removed when AI was removed from the product.*
