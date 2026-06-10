# BTI Phase 1 Build — Historical Record

> **Status:** Phase 1 build infrastructure shipped 2026-05-08; ARI rewrite of mount points + tester-facing docs landed 2026-05-09. This document was originally a forward implementation proposal; it is now retained as a historical record of what was decided and what actually shipped. For active BTI work, the charter ([`docs/PROPOSALS/beta-testing-initiative.md`](beta-testing-initiative.md)) is the source of truth — this document does not drive new work.

---

## Why this record exists

Phase 1 of BTI built the in-app feedback infrastructure: flag button, pop-out form, telemetry event capture, transport endpoint, dev-side inbox, and the first-run privacy disclosure. The original build proposal sequenced this as seven implementation chunks. All seven shipped. ARI then deleted half of the mount points the original proposal named.

The active facts about the live infrastructure live in the charter (Phase 1 description and Q1–Q9 settled rulings). This document holds the historical thread — what was decided, why, and what shipped, in the order it happened — so future readers can reconstruct the build's reasoning without having to grep commit history.

---

## Rulings that gated Phase 1

Three open questions from the charter gated Phase 1 build. Each was settled in early May 2026.

### Q1 — Flag UI mount points and form trigger

**Original ruling:** Flag button per AI surface, not per AI call. One button per surface area, each knowing its own context (`surface`, `sermonId`, `step`, the most recent AI call's input + output sourced from the telemetry bus). Mount points: AI Panel header, each tab's primary AI affordance (Study, Outline, Delivery, Series Planner), and proposal card headers. Pop-out form via sidebar "Send feedback…" entry, modal in-process.

**Post-ARI state:** The AI mount points no longer exist. Surviving mounts: Study tab (`StudyTab.jsx`) and Blueprint tab (`OutlineTab.jsx` — file kept legacy name). The flag popover dropped its "Include the AI exchange in this flag" checkbox; there is no AI exchange to attach. The pop-out form trigger and modal pattern are unchanged.

### Q2 — Transport

**Settled:** Cloudflare Worker + D1. One POST `/ingest` endpoint for all three payload kinds (flag, form, telemetry), discriminated on `kind`. Token-gated GET `/inbox` serves the dev inbox HTML. Worker URL: `https://sermonforge-bti.ross-appleton.workers.dev`. D1 database name: `sermonforge-bti`.

### Q9 — First-run privacy disclosure

**Settled:** Extended the existing `SetupScreen` with a Telemetry and Feedback section. Toggle "Send anonymous usage and feedback to the developer" (default on). Long-form privacy reference at `docs/REFERENCE/privacy.md`. Toggle off semantics: nothing leaves the device.

---

## What shipped, in order

### Chunk 1 — Transport endpoint + storage *(shipped 2026-05-08, commit `0183a5e`)*

Cloudflare Worker (`transport/worker.js`) accepting `POST /ingest` for all three payload kinds. D1 schema with three tables: `events` (telemetry), `flags` (flag clicks), `forms` (form submissions). Bearer-token gate on `/ingest`; admin-token gate on `/inbox`.

Tester ID: opaque UUID generated at first-run, stored in user prefs. Survives reinstall only if prefs survive.

### Chunk 2 — Telemetry event bus + local NDJSON buffer *(shipped 2026-05-08, commit `436a0a0`)*

In-process bus (`electron/telemetry/bus.js`) with `emit(eventType, payload)`. Local buffer at `userData/telemetry/<session-id>.ndjson`, flushed every 30s and on `before-quit`. Transport (`electron/telemetry/transport.js`) reads NDJSON, batches to the Worker, retries on offline / 5xx with exponential backoff. Renderer events flow through `window.electronAPI.telemetryEmit(eventType, payload)` → `telemetry-emit` IPC → `bus.emit`.

Event constants registered in `electron/telemetry/events.js`: `app-open`, `ai-press`, `ai-proposal`, `panel-time`, `field-time`, `sermon-create`, `sermon-finish`, `crash`. Mirrors the existing audit-log infrastructure (ACC E1). (Amended 2026-06-10: `tour-step` removed from this list — the tour engine and its `TOUR_STEP` emitter were deleted in the 2026-05-17 tour cleanup, so the constant no longer exists.)

### Chunk 3 — Flag button at AI surfaces *(shipped 2026-05-08, commit `5512a51`)*

`src/components/FeedbackFlag.jsx` — icon button + popover with one-line note input + "Include the AI exchange in this flag" checkbox + Send / Send blank. Mounted at six surfaces per the original Q1 ruling: AI Panel, Study, Outline, Delivery, Series Planner, ProposalPanel.

**Post-ARI delta:** AI Panel, ProposalPanel, SeriesPlanner, DeliveryTab all deleted. AI exchange checkbox removed. Surviving mounts: Study and Blueprint (file-named `OutlineTab.jsx`). The component itself ships and works.

### Chunk 4 — Pop-out feedback form *(shipped 2026-05-08, commit `5512a51`)*

`src/components/FeedbackForm.jsx` — modal with single-dimension picker + free-text area + Send. Triggered from Sidebar "Send feedback…" entry. Ten dimensions per the BTI charter.

**Post-ARI delta:** The hardcoded dimensions list still includes "AI response quality" and "Voice and frame" (the latter originally framed as AI theological frame drift). Charter rewrite 2026-05-09 recast these as "Question quality" and "Voice and frame" (now about question-flow drift). Updating `FeedbackForm.jsx` to match is a Phase 1.5 cleanup item.

### Chunk 5 — Inbox *(shipped 2026-05-08)*

`transport/inbox.html` — single static page, three tabs (Flags, Forms, Telemetry), most-recent first. Worker `GET /inbox?token=<admin>` returns recent rows as JSON. Read-only; no filtering, sorting, or search.

### Chunk 6 — First-run privacy disclosure *(shipped 2026-05-08, commit `5512a51`)*

Extended `SetupScreen.jsx` with a "Telemetry and feedback" section + toggle. Persists `bti_telemetry_enabled` setting via `setSetting`. Bus + transport short-circuit when toggle is off. New `docs/REFERENCE/privacy.md` long-form reference (rewritten 2026-05-09 for post-ARI state).

### Chunk 7 — Setup note + cohort roster *(shipped 2026-05-09)*

In-repo: `docs/PROPOSALS/bti-setup-note.md` (rewritten 2026-05-09 for post-ARI state). Off-repo: cohort roster — handled outside this repository.

---

## Post-ARI delta summary

ARI shipped 2026-05-09 in a single 12-phase day (`docs/PROPOSALS/ai-removal-initiative.md`). The deltas relevant to BTI Phase 1 infrastructure:

| Phase 1 item | Pre-ARI | Post-ARI |
|---|---|---|
| FeedbackFlag mount: AI Panel | Mounted | Surface deleted |
| FeedbackFlag mount: ProposalPanel | Mounted | Surface deleted |
| FeedbackFlag mount: SeriesPlanner | Mounted | Surface deleted (gated by Phase 0 placeholder) |
| FeedbackFlag mount: DeliveryTab | Mounted | Surface deleted |
| FeedbackFlag mount: StudyTab | Mounted | **Mounted** |
| FeedbackFlag mount: OutlineTab (Blueprint) | Mounted | **Mounted** |
| FeedbackFlag mount: ManuscriptTab | Not mounted | **Mounted** (added 2026-05-09 closing Q1) |
| FeedbackFlag popover: AI-include checkbox | Present | Removed |
| Telemetry: `ai-press` event | Emitted on AI button press | Defined but unused; cleanup pending |
| Telemetry: `ai-proposal` event | Emitted on proposal accept/edit/reject | Defined but unused; cleanup pending |
| FeedbackForm dimensions: "AI response quality" | Listed | Charter recast as "Question quality"; code update pending |
| FeedbackForm dimensions: "Voice and frame" (AI sense) | Listed | Charter recast as question-flow drift sense; code label unchanged |
| Privacy disclosure: AI exchange capture | Documented | Removed |
| Privacy disclosure: "What the app sends to Anthropic" section | Present | Removed |

The Phase 1.5 cleanup list in the charter captures the small follow-ups these deltas imply.

---

## What remained out of scope through Phase 1

Per the original charter and unchanged by ARI:

- Tier 3 prompt bank.
- Frame-check writing-sample passage pool and assignment scheme.
- Visible-loop digest template.
- Re-engage outreach template.
- Tier 3 cadence/scheduler/receipt mechanisms.
- Cross-reading process for the three writing-sample rounds.
- Formal routing-review process — the inbox is the log; manual SQL passes are sufficient until volume demands more.
- Visible-loop digest publication channel.
- Automated silent-tester detection.
- Per-tester writing-sample file sets.
- Digest archive.

Each lights up when its triggering condition appears in Phase 2/3.

---

*End of historical record.*
