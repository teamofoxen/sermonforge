# AI Clarity & Constraint — Archived Record

**Status:** INITIATIVE COMPLETE. All 26 items across Tiers A–G shipped 2026-05-01 / 2026-05-02. All seven Q-rulings settled. Archived 2026-05-02.

**Why this is in `docs/ARCHIVE/`:** The work is done. Behavior, gates, and decisions made under ACCI now live where the system actually runs:

- AI Panel surfaces, audit log policy, retention, prompt-caching contract → `docs/SYSTEMS/ai-panel.md`
- AI model migration playbook → `docs/SYSTEMS/ai-model-migration.md`
- Updated IPC channel reference (incl. `ai-message`) → `docs/REFERENCE/ipc-channels.md`
- AI Integrity Gate (ESLint) → `eslint-plugin-sermonforge/lib/rules/no-direct-ai.js`
- Per-item commit history → `CHANGELOG.md` (entries dated 2026-05-01 and 2026-05-02)

This document is retained as a one-page record of what was scoped and shipped. It is **not** a current source of truth.

---

## What this was

A 17-agent audit of every AI surface in SermonForge on 2026-05-01 surfaced a consistent pattern: the AI subsystem's "front door" (`electron/ai/provider.js`, the single `ai-message` IPC channel, the single `sendAIMessage` renderer wrapper, API-key isolation, the Process #5 contract test) was exemplary. The "back hallway" (tab-side AI calls in StudyTab, SeriesPlanner, DeliveryTab) was not. Roughly half of all AI calls bypassed the layered system prompt, hand-rolled their own context blob, failed to tag the audit log with surface or sermon, and in six cases wrote directly into sermon fields without a confirm gate.

The 26-item plan was consolidation, not redesign — every item pulled scattered tab-side behavior under an existing centralized pattern, added a small additive guard, or updated a doc to match shipped code.

---

## The 26 items (shipped)

### Tier A — stop the bleeding

1. **[A1]** Shipped `50a24ac`. AbortController on `sendAIMessage`; aborts in-flight calls when active sermon changes. *(`src/utils/ai.js`, `src/components/SermonWorkspace.jsx`)*
2. **[A2]** Shipped `2b0fa66`. Six direct-write AI paths replaced with the proposal pattern: Synthesize Redemptive, Compile Implications, Populate Scripture, Manuscript Delivery formatter, Preaching Blocks (CMC), Final Tune-Up.
3. **[A3]** Shipped `a05defd`. JSON-output validator (`src/utils/aiSchema.js`) wired at every JSON parse boundary. **Q1: JSON boundaries only — outlineChat text-shape parsing and Tune-Up prose deferred.**
4. **[A4]** Shipped `c57bcd2`. Eight AI failure modes (auth, rate limit, network, server, timeout, format, empty, unknown) differentiated and surfaced with kind-specific messages. **Q2: shipped as one PR across five UI files.**

### Tier B — make constraints visible

5. **[B1]** Shipped `e19cb1f`. Active-role label in AI Panel header (posture + step + theology mode).
6. **[B2]** Shipped `e19cb1f`. "What I can see" panel listing active tiers, loaded fields, history turn count. New `describeContext` in `src/utils/contextBuilder.js`.
7. **[B3]** Shipped `e19cb1f`. History-trim banner + `persistColumn` write-event flash.

### Tier C — pull the bypasses back

8. **[C1]** Shipped `889ed14`. Inline `You are…` system prompts in StudyTab and SeriesPlanner centralized under `src/prompts/` and routed through `buildSystemPrompt`.
9. **[C2]** Shipped `a777c3d`. StudyTab AI calls routed through `buildContext`. SeriesPlanner N/A — no `sermon` record at series level.
10. **[C3]** Shipped `08829d4`. Every `sendAIMessage` call site passes `step` and `sermonId`.
11. **[C4]** Shipped `85f4736`. `OUTLINE_REVIEW_TASK` and `CHALLENGE_MPT_TASK` centralized in `src/prompts/study.js`.

### Tier D — safety nets

12. **[D1]** Shipped 2026-05-02. CI workflow runs `npm test` on push to main + every PR. *(`.github/workflows/test.yml`)*
13. **[D2]** Shipped 2026-05-02. AI Integrity Gate as ESLint rule `no-direct-ai`. **Q3: ESLint, mirrors `no-direct-database`.**
14. **[D3]** Shipped 2026-05-02. 1 MB IPC payload cap + per-session `callIndex` in audit log. **Q4: compute now, surface UI later.**
15. **[D4]** Shipped 2026-05-02. Token-usage fields captured into audit log (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`).

### Tier E — privacy and housekeeping

16. **[E1]** Shipped 2026-05-02. Audit-log disclosure paragraph in `SetupScreen.jsx`; full audit log section in `docs/SYSTEMS/ai-panel.md`. **Q5: keep full content + document on first run.**
17. **[E2]** Shipped 2026-05-02. `rotateAuditLog()` early-return guard removed so a few large entries can't leave the file above the size cap.

### Tier F — catch the docs up

18. **[F1]** Shipped 2026-05-02. `docs/REFERENCE/ipc-channels.md` updated: removed obsolete channels, added `spine` channel + calendar channels, corrected `ai-message` shape.
19. **[F2]** Shipped 2026-05-02. Five undocumented AI surfaces added to `docs/SYSTEMS/ai-panel.md`.
20. **[F3]** Shipped 2026-05-02. AI model migration playbook at `docs/SYSTEMS/ai-model-migration.md`. **Q6: `docs/SYSTEMS/`.**

### Tier G — polish

21. **[G1]** Shipped 2026-05-02. `stop_reason: "max_tokens"` truncation surfaced as an amber italic note below the truncated assistant message.
22. **[G2]** Shipped 2026-05-02. Comment in `provider.js` retry loop documenting why retries are safe (stateless read).
23. **[G3]** Shipped 2026-05-02. `getClient()` returns null on falsy `apiKey`; `callOnce()` synthesizes a 401 so the failure classifies as `auth` rather than a silent broken client.
24. **[G4]** Shipped 2026-05-02. OutlineTab "Apply to Outline" now uses the same two-step destructive-replace confirm as StudyTab.
25. **[G5]** Already complete. `STUDY_GUIDE_NOTE_TASK` was centralized in `src/prompts/seriesPlanner.js` before this session.
26. **[G6]** Shipped 2026-05-02. Orphan `handleSlotAI` deleted from `SlotsTab`; `onSlotAI` prop chain removed. **Q7: delete.**

---

*End of archived record.*
