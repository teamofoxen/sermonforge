# SermonForge — Privacy

> What SermonForge sends, what it doesn't, and the toggle that controls it.

## At a glance

SermonForge is single-user software that runs on your machine. Your sermons live in a SQLite database on your computer, and **your sermon content never leaves it.**

Three things talk to the network, and only these three:

- **Crossway ESV API** — when you load a passage, to fetch its text. Only the reference is sent (e.g. `John 3:16`), never your writing.
- **GitHub Releases** — a quiet version check on launch so the app can keep itself up to date. No personal data and no sermon data — just "is there a newer version." This runs regardless of the telemetry toggle below.
- **BTI telemetry** — one developer-controlled channel of interaction *metadata* (never sermon content), opt-out, covered in detail below.

This document covers all three.

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

## What the app checks with GitHub (auto-update)

On launch, the app asks GitHub Releases whether a newer version of SermonForge exists, so it can download and offer to install updates. This is a standard version check: it sends no personal data and no sermon data — only the kind of request any auto-updating app makes. It runs on every launch and is **not** governed by the telemetry toggle (an app that can't check for updates can't ship you fixes).

---

## What the app sends to its developer (BTI telemetry)

This is the part the toggle in the setup screen controls. Default-on; one click to disable; nothing leaves the device when off.

### What is captured

**Behavioral events.** Small JSON records of what you do in the app:

- `app-open` — when you launch the app, with the version and platform.
- `panel-time` / `field-time` — how long a panel or field has focus, recorded in summary form (no keystrokes).
- `sermon-create` / `sermon-finish` — sermon-level lifecycle markers, with the sermon's database ID.
- `crash` — when the app hits an unexpected error, with a short error message (no sermon content, no log file attached).

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

If you turn the toggle off in the setup screen, **no BTI telemetry leaves your device.** The two other network calls are not governed by this toggle: the Crossway passage fetch still runs when you load a passage, and the launch-time GitHub version check still runs — neither carries sermon content. The local `app.log` also still exists on your machine for debugging purposes; that is not affected by the toggle.

If you want to turn it back on later, the same toggle will live in a Settings panel in a later version of the app. Until then, contact the developer to flip it via the database.

---

## Where the disclosure surfaces

- The setup screen on first launch (`src/components/SetupScreen.jsx`) shows a short version of this section with the toggle.
- This document is the long-form reference.

If anything in the app contradicts this document, the document is the source of truth — please flag the discrepancy via the in-app flag button.

---

*Last revised: 2026-05-09 (post-ARI rewrite). Pre-ARI version disclosed AI exchanges with Anthropic and an optional AI-exchange include on flag clicks; both removed when AI was removed from the product.*
