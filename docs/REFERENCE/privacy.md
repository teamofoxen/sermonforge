# SermonForge — Privacy

> What SermonForge sends, what it doesn't, and the toggle that controls it.

## At a glance

SermonForge is single-user software that runs on your machine. Your sermons live in a SQLite database on your computer. The Anthropic Claude API is the one upstream service the app talks to as a normal part of its work — and only when you press an AI button. No other third party receives any data from this app.

There is **one** developer-controlled telemetry channel — for shaping the tool over time — and it is opt-out. Sermon content is never part of it.

This document covers everything else.

---

## What stays on your machine, always

- **Sermons.** Every word you write. Stored in a local SQLite file under your app data folder.
- **Series notes.** Same.
- **API keys.** Encrypted via the OS keystore (Windows DPAPI, macOS Keychain). Never sent anywhere except directly to Anthropic and Crossway when you use those features.
- **AI activity log.** A local audit log (`ai-log.jsonl` in your app data folder) records each AI request — system prompt, your messages, the response. This is for local debugging only and never leaves your machine.

These are not part of the telemetry channel. They are not toggleable because they don't transmit.

---

## What the app sends to Anthropic

Standard Claude API usage. When you press an AI button, the app sends:

- Your conversation messages for that exchange.
- The system prompt SermonForge layers on top.
- The contextual fields the AI needs (passage, study notes for the active step, MPT/MPS — the context tier composition is documented in `docs/SYSTEMS/context-pipeline.md`).

Anthropic's API terms govern what they do with that. SermonForge does not log the body of those requests anywhere except in the local audit log on your machine.

---

## What the app sends to its developer (BTI telemetry)

This is the part the toggle in the setup screen controls. Default-on; one click to disable; nothing leaves the device when off.

### What is captured

**Behavioral events.** Small JSON records of what you do in the app:

- `app-open` — when you launch the app, with the version and platform.
- `ai-press` — when you press an AI button, with the surface (Study, Outline, etc.) and the step.
- `ai-proposal` — when you accept, edit, or reject an AI proposal in the Mutation Contract pattern.
- `panel-time` / `field-time` — how long a panel or field has focus, recorded in summary form (no keystrokes).
- `sermon-create` / `sermon-finish` — sermon-level lifecycle markers, with the sermon's database ID.
- `tour-step` — which tour step you reached (which tour, which step ID).
- `crash` — when the app errors, with the error message.

These are **metadata about your interactions, not the content of your work.** None of them carry sermon text, study text, AI responses, or your typing.

**Flag clicks.** When you click the small flag button next to an AI surface and choose to send:

- The surface (Study, Outline, AI Panel, etc.), the active step, the sermon ID.
- Your one-line note (if you typed one).
- *Optionally:* the most recent AI exchange on that surface — only if you leave the "Include the AI exchange in this flag" checkbox on. You decide per flag.

**Form submissions.** When you open "Send feedback…" from the sidebar and submit:

- The dimension you picked (e.g., "Invasiveness", "Workflow-fit").
- The free-text you wrote.
- The current sermon ID and step (if you have one open).

### What is NOT captured

- **Sermon content.** Not the manuscript, not the outline, not the study notes, not the title, not anything you typed into a sermon field. The sermon ID travels (so flags can be correlated to a session) but its content does not.
- **Your AI conversations,** unless you flag a moment AND leave the "include the AI exchange" checkbox on. In that case only the most recent single exchange travels with the flag — not the full chat history.
- **Keystrokes, mouse positions, screenshots, or any continuous monitoring.** Just the discrete events listed above.

### Where it goes

A Cloudflare Worker controlled by the developer. The data lands in a Cloudflare D1 (SQLite) database the developer queries directly. No third-party analytics provider is involved.

### Identifier

A random opaque UUID is generated on first run and stored on your machine. The developer sees this ID, not any personal information. If you uninstall and reinstall, you get a new ID.

### Retention

Until the structured beta cohort program closes. After that, the data set is trimmed to what stays useful for product decisions; the rest is deleted.

### Toggle off semantics

If you turn the toggle off in the setup screen, **nothing leaves your device.** The local audit log (`ai-log.jsonl`) still exists on your machine for debugging purposes; that is not affected by the toggle.

If you want to turn it back on later, the same toggle will live in a Settings panel in a later version of the app. Until then, contact the developer to flip it via the database.

---

## Where the disclosure surfaces

- The setup screen on first launch (`src/components/SetupScreen.jsx`) shows a short version of this section with the toggle.
- This document is the long-form reference.

If anything in the app contradicts this document, the document is the source of truth — please flag the discrepancy via the in-app flag button.

---

*Last revised: 2026-05-08 (BTI Phase 1, Chunk 6).*
