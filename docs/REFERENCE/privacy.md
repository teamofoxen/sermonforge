# SermonForge — Privacy

> What SermonForge sends, what it doesn't, and the toggle that controls it.

## At a glance

SermonForge is single-user software that runs on your machine. Your sermons live in a SQLite database on your computer, and **your sermon content never leaves it.**

Three things talk to the network, and only these three:

- **Crossway ESV API** — when you load a passage, to fetch its text. Only the reference is sent (e.g. `John 3:16`), never your writing.
- **GitHub Releases** — a quiet version check on launch so the app can keep itself up to date. No personal data and no sermon data — just "is there a newer version." This runs regardless of the telemetry toggle below.
- **BTI telemetry** — one developer-controlled channel of interaction *metadata* (never sermon content), opt-out, covered in detail below.

This document covers all three. (The app's typefaces used to load from Google's
font service on every launch — a fourth network call, disclosed and then removed
the same day, 2026-07-01: the fonts now ship inside the app.)

---

## What stays on your machine, always

- **Sermons.** Every word you write — manuscript, outline, study notes, notebook entries. Stored in a local SQLite file under your app data folder.
- **Series notes.** Same.
- **ESV API key.** Encrypted via the OS keystore (Windows DPAPI, macOS Keychain). Sent only to Crossway when you load a passage.
- **Crash log.** A local log file (`app.log` in your app data folder) records errors. It is for local debugging only and **never leaves your machine** — no part of it is attached to anything. When the telemetry channel reports a crash event (see below), that event carries only a short error message (capped at 500 characters), not log-file contents.

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

**Behavioral events.** Small JSON records of what you do in the app. Exactly
two exist:

- `app-open` — when you launch the app, with the version and platform.
- `crash` — when the app hits an unexpected error, with a short error message (capped at 500 characters; no sermon content, no log file attached).

**This list is enforced by code, not just by this document** (Session 5,
2026-07-13): the exact event names, payload keys, and value types live in a
schema registry (`electron/telemetry/events.js`), and every event is validated
against it twice — in the app before it is even written to the local buffer,
and again in the developer's ingest Worker before it is stored. An event with
an unknown name, an unknown field, a wrong type, or an over-length value is
rejected at both gates, so a payload shaped like sermon text structurally
cannot fit. (Four event types that were named in earlier drafts of this
document — `panel-time`, `field-time`, `sermon-create`, `sermon-finish` — were
never emitted by anything and have been removed from the vocabulary entirely;
if a future feature wants one, it must be re-added to the registry and to this
document in the same change.)

These are **metadata about your interactions, not the content of your work.** None of them carry sermon text, study text, notebook text, or your typing.

**Flag clicks.** When you click the small flag button — it lives on the
workspace writing surface (in all three stages) and on the Series Planner's
top bar — and choose to send:

- The surface (which stage's writing surface, or the Series Planner), your position in the walk (stage / sub-phase / field), and the sermon ID where one applies (the planner flag carries no sermon ID).
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

A random opaque UUID is generated on first run and stored on your machine (a small `tester-id.txt` in the app's data folder). The developer sees this ID, not any personal information. The ID survives uninstalling and reinstalling — the uninstaller deliberately leaves your app data (including your sermons) in place. You get a new ID only if you delete the app-data folder (or that file) yourself.

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

*Last revised: 2026-07-01 (doc drift sweep truth-up: crash events carry a short error string, never log-file lines; only `app-open` and `crash` actually emit today, the other four event types are registered-but-unwired; the tester ID survives reinstall; flag-button surfaces updated. The sweep also surfaced a previously undisclosed fourth network call — the app's typefaces loading from Google Fonts — removed the same day by bundling the fonts with the app). Prior revision 2026-05-09 (post-ARI rewrite) — the pre-ARI version disclosed AI exchanges with Anthropic and an optional AI-exchange include on flag clicks; both removed when AI was removed from the product.*
