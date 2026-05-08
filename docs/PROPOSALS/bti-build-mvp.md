# BTI Build MVP — Implementation Proposal

> **Status:** Drafted 2026-05-07. Implementation has not started. This proposal lives one level below the BTI charter (`docs/PROPOSALS/beta-testing-initiative.md`); the charter is the *what* and *why* of Phase 1, this is the *how*. Nothing here extends BTI's scope beyond the charter's "Phase 1 build sub-program" sub-section.

> **Audience:** The lone developer of SermonForge. Plain language, but technical specifics where they matter.

---

## Why this proposal exists

The BTI charter authorizes a Phase 1 build sub-program: in-app feedback surfaces + plumbing, shipped inside the production app (no separate beta build per the 2026-05-07 ruling). This proposal turns that authorization into something the developer can walk in order — chunk by chunk, with files named, acceptance criteria stated, and stop points where the developer can commit and pause.

It is deliberately small. The charter's defer list is binding; nothing on it appears below.

---

## Rulings still needed before build

Three open questions from the charter gate Phase 1. Each gets a recommendation; the build cannot start until they're settled.

### Q1 — Flag UI mount points and form trigger

Two sub-decisions:

**Flag button — per AI surface, not per AI call.** One button per surface area, each knowing its own context (`surface`, `sermonId`, `step`, the most recent AI call's input + output sourced from the telemetry bus). One button per AI button would drown the UI; one global button would force the pastor to describe context manually.

Mount points:
- AI Panel — top-right of panel header
- Each tab's primary AI affordance — Study, Outline, Delivery, Series Planner (one button each)
- Proposal cards (the proposal pattern from ACC) — one button on the proposal header

**Pop-out form — modal, not separate window.** Footer menu item ("Send feedback…") opens a modal in the same renderer process. Separate Electron `BrowserWindow` is overhead for no benefit at this scale.

### Q2 — Transport

**Recommendation: Cloudflare Worker + D1.**
- Free tier covers 20-30 testers indefinitely (5M reads/day, 100K writes/day; expected volume is ~100-300 events/tester/week).
- One POST endpoint accepts all three payload kinds (discriminated union on `kind`).
- D1 is SQLite — directly queryable, simple schema, no ops.
- Token-gated GET serves the inbox HTML.
- Workers scale to zero — no idle cost.
- Stands up in roughly a day.

Alternatives considered:
- Vercel + Neon Postgres — similar shape, slightly heavier client config. Pass.
- Self-hosted VPS — more ops overhead, not "implement soon." Pass.
- Discord webhook — fine for flags + form, but doesn't fit telemetry batches and isn't queryable. Pass.

### Q9 — First-run privacy disclosure

**Recommendation: extend the existing `SetupScreen` audit-log disclosure (ACC E1) with a "Telemetry and Feedback" section.**

Disclosure covers:
- **What's captured:** flag clicks, form submissions, the telemetry event list (named explicitly).
- **What's NOT captured:** sermon content. Only event metadata + the most-recent AI call's input/output for *flagged moments*, and the pastor controls per-flag whether to include that.
- **Where it goes:** developer-controlled endpoint, no third-party analytics.
- **Retention:** until the structured cohort program closes; trimmed per Q8 thereafter.
- **Consent shape:** opt-out, default-on. With production = beta, opt-in would suppress 90%+ of the signal; opt-out gives anyone uncomfortable a single toggle to disable.
- **Toggle off semantics:** nothing leaves the device. Local audit log still exists; transport stays silent.

The full privacy doc lives at `docs/REFERENCE/privacy.md`; SetupScreen links to it.

---

## Implementation chunks

Sequenced for the developer to walk in order. Transport first so each subsequent chunk lands with an end-to-end smoke test.

### Chunk 1 — Transport endpoint + storage

**New (separate `transport/` repo or subdirectory; off the main app):**
- `transport/worker.js` — Cloudflare Worker. POST `/ingest` accepts all three payload kinds. GET `/inbox` token-gated.
- `transport/schema.sql` — D1 schema:
  - `events` (telemetry events): `id`, `tester_id`, `event_type`, `payload_json`, `timestamp`.
  - `flags` (flag submissions): `id`, `tester_id`, `surface`, `sermon_id`, `step`, `last_ai_call_json`, `note`, `timestamp`.
  - `forms` (form submissions): `id`, `tester_id`, `dimension`, `text`, `sermon_id`, `step`, `timestamp`.
- `transport/wrangler.toml` — Cloudflare config.

**Auth:** shared bearer token in request header. Token baked into the build — threat model is "casual interception," not "determined attacker"; this is opt-out telemetry, not a security boundary.

**Tester ID:** opaque random UUID assigned at first-run, stored in user prefs. Survives reinstall only if prefs survive — that's fine; orphaned events don't hurt.

**Acceptance:**
- POST `/ingest` with valid token + payload → row in D1.
- Invalid token → 401, no row.
- Malformed payload → 400, no row.

**Stop point:** transport is live but no app code calls it yet. Smoke-test with `curl`.

---

### Chunk 2 — Telemetry event bus + local NDJSON buffer

**New:**
- `electron/telemetry/bus.js` — in-process event bus. `emit(eventType, payload)` queues events; flush writes NDJSON to `userData/telemetry/<session-id>.ndjson` every 30 s and on `before-quit`.
- `electron/telemetry/events.js` — typed event constants and payload shapes.
- `electron/telemetry/transport.js` — POST queue. Reads NDJSON; batches; ships to the Worker via `fetch`; on success deletes from queue. Retries on offline / 5xx with exponential backoff.

**Modified:**
- `electron/main.js` — wire bus init at app boot; flush on `before-quit`.
- `electron/preload.js` — expose `window.telemetry.emit(...)` via `contextBridge`.

**Pattern:** mirror the existing audit-log infrastructure (ACC E1). Audit log is per-session NDJSON in userData; telemetry is a parallel file, same shape, different transport.

**Event wires (each is a one-line `emit` call):**
- `app-open` — emitted on `app.whenReady()`.
- `ai-press` — emitted from the `sendAIMessage` wrapper (single AI entry point per ACC C1/C3).
- `ai-proposal {accepted | edited | rejected}` — emitted from `ProposalPanel` state transitions.
- `panel-time` / `field-time` — accumulator events emitted on focus changes (one event per focus session, payload includes duration).
- `sermon-create` / `sermon-finish` — emitted from sermon state transitions.
- `tour-step` — emitted from the tour engine.
- `crash` — emitted from the existing crash handler.

**Acceptance:**
- Bus emits all event types; NDJSON file accumulates.
- Flush-on-quit confirmed in dev.
- Transport ships batches to the Worker; offline → queue grows; back online → drains.
- Toggle-off (Chunk 6) → bus still emits locally, transport stays silent.

**Stop point:** telemetry flowing end-to-end, but no UI surfaces emit user-driven events yet (those come in Chunks 3-4).

---

### Chunk 3 — Flag button at AI surfaces

**New:**
- `src/components/FeedbackFlag.jsx` — tiny icon-only flag button. Click opens a small inline popover with: a one-line note input, a "Include the AI exchange in this flag" checkbox (default on), a Send button, a Send blank button.
- `src/styles/feedbackFlag.css` — quiet styling, persistent but not loud.

**Modified (one mount per surface):**
- `src/components/AIPanel.jsx` — header.
- `src/components/StudyTab.jsx` — near primary AI affordance.
- `src/components/OutlineTab.jsx` — same.
- `src/components/DeliveryTab.jsx` — same.
- `src/components/SeriesPlanner.jsx` — same.
- `src/components/ProposalPanel.jsx` — proposal header.

**Captured payload (flag):**
```json
{
  "kind": "flag",
  "surface": "ai-panel | study-tab | outline-tab | delivery-tab | series-planner | proposal",
  "sermonId": "<id-or-null>",
  "step": "<study-phase-step-or-null>",
  "lastAiCall": { "input": "...", "output": "..." } | null,
  "note": "<optional 1-line text>",
  "timestamp": "<ISO-8601>"
}
```

`lastAiCall` is sourced from the most recent `ai-press` event in this surface (held in renderer state as a per-surface ref). If the user unchecks "Include the AI exchange," the field is dropped.

**Acceptance:**
- Flag button visible at every named surface.
- Click → popover with text input + Send / Send blank.
- Send POSTs through `transport.send()` (or queues for retry if offline).
- Empty notes are valid — the click itself is signal.

---

### Chunk 4 — Pop-out feedback form

**New:**
- `src/components/FeedbackForm.jsx` — modal with a single-dimension picker + free-text area + Send.
- `src/styles/feedbackForm.css`.

**Modified:**
- The footer / app menu (location TBD — see Q1 nuance below). Add "Send feedback…" item.

**Dimensions** (single-pick from the charter's 10): Invasiveness, Workflow-fit, AI response quality, Trust, Friction and surprise, Onboarding and first-run, Reliability and weirdness, Performance and feel, Voice and frame, What surprised you. Default: "What surprised you" (open-ended catch-all).

**Captured payload (form):**
```json
{
  "kind": "form",
  "dimension": "<one of the 10>",
  "text": "<free text>",
  "sermonId": "<current-sermon-or-null>",
  "step": "<current-step-or-null>",
  "timestamp": "<ISO-8601>"
}
```

**Acceptance:** menu item present; modal opens; Send queues + closes; cancel discards.

**Q1 sub-question to confirm during this chunk:** SermonForge currently doesn't have a persistent footer menu — the app menu (Electron native menu bar) is the natural mount. Confirm during build.

---

### Chunk 5 — Inbox

**New:**
- `transport/inbox.html` — single static page, three tabs (Flags, Forms, Telemetry), most-recent first.
- `transport/inbox.js` — fetches `GET /inbox?token=<admin>` from the Worker.

**Worker handler addition:**
- `GET /inbox?token=...` — admin-token gated; returns recent rows as JSON, paginated by timestamp cursor.

**Acceptance:** load `https://<worker-url>/inbox.html?token=<admin>` → see rows. Refresh → new ones appear.

**Stop point:** read-only. No filtering, sorting, search, or dashboards — those are Phase 2/3 if ever needed. Early triage is fine via direct SQL against D1 too.

---

### Chunk 6 — First-run privacy disclosure (Q9)

**Modified:**
- `src/components/SetupScreen.jsx` — extend the existing audit-log disclosure with a "Telemetry and Feedback" section. Add toggle: "Send anonymous usage and feedback to the developer" (default on).
- `src/utils/userPrefs.js` (or wherever ACC E1's toggle lives) — persist the new toggle.
- `electron/telemetry/transport.js` — short-circuit if toggle is off.
- `electron/telemetry/bus.js` — short-circuit if toggle is off (per Q9 ruling: off = nothing leaves the device, which means nothing emitted either; or keep emission for local debugging — call this during build).

**New:**
- `docs/REFERENCE/privacy.md` — full privacy doc per the disclosure shape above. SetupScreen links to it.

**Acceptance:**
- First-run shows the disclosure with both audit-log + telemetry-feedback sections.
- Toggle off → no events captured anywhere (or local-only — pick during build).
- Toggle persists across launches.

---

### Chunk 7 — Setup note + cohort roster

**New:**
- `docs/PROPOSALS/bti-setup-note.md` — install + first-run instructions a tester gets in the onboarding email. Plain-language, references `docs/REFERENCE/privacy.md` and `docs/PROPOSALS/bti-tester-summary.md`.

**Off-repo:**
- Cohort roster — Notion or a private Google Sheet. Columns: name, email, contact preference, frame-check opt-in (Y/N), state (active/silent/dropped), enrollment date, last contact date, notes. Roster is operational scaffolding; off-repo is right.

**Tester summary final pass:** `docs/PROPOSALS/bti-tester-summary.md` already aligned with production-IS-the-beta in the 2026-05-07 charter sync; one more pre-onboarding read-through is a Phase 2 task, not a Phase 1 build item.

**Acceptance:** docs land in repo; roster sheet created; ready for invitations to begin in Phase 2.

---

## Sequencing summary

1. **Q1 / Q2 / Q9 settle** (this conversation).
2. **Chunk 1** — Transport endpoint + storage (~1 day).
3. **Chunk 2** — Telemetry event bus + local buffer.
4. **Chunk 3** — Flag button at AI surfaces.
5. **Chunk 4** — Pop-out feedback form.
6. **Chunk 5** — Inbox.
7. **Chunk 6** — First-run privacy disclosure.
8. **Chunk 7** — Setup note + roster.

After Chunk 7, the Phase 1 build sub-program is shipped and BTI moves to Phase 2 (cohort onboarding; Q6 + Q7 settle there).

---

## Out of scope (per charter)

Restated for the build's boundary discipline; none of these belong in Phase 1:

- Tier 3 prompt bank, scheduler, receipt mechanisms.
- Frame-check writing-sample passage pool, assignment scheme, cross-reading process.
- Visible-loop digest template, publication channel, archive.
- Re-engage outreach template.
- Automated silent-tester detection.
- Per-tester writing-sample file sets.
- Formal routing-review process (a weekly SQL pass is enough early on).

Each lights up when its triggering condition appears in Phase 2/3.

---

*End of BTI Build MVP proposal.*
