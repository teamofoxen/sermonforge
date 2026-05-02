# AI Clarity & Constraint — Task Tracker

**Status:** Tier A complete (Items 1–4 shipped 2026-05-01). Tiers B–G (Items 5–26) not started; Tier B is the planned next block. Five decisions still open (Q3–Q7); Q1 and Q2 were settled by execution during Tier A.
**Date drafted:** 2026-05-01.
**Audience:** future working sessions. Plain language; no engineering vocabulary required.

This is not a charter. It is a task tracker — enough to orient a future session to what the work is, what's been ruled, what's still open, and where to pick up. The deep context lives in the 17-agent audit run on 2026-05-01 (final synthesis report retained in session history).

---

## What this is

A 17-agent audit of every AI surface in SermonForge surfaced a consistent pattern: the AI subsystem's "front door" (the single Anthropic-SDK entry point in `electron/ai/provider.js`, the single IPC channel, the single renderer wrapper, the API-key isolation, the Process #5 contract test) is exemplary. The "back hallway" (tab-side AI calls in StudyTab, SeriesPlanner, DeliveryTab) is not. Roughly half of all AI calls in the app skip the layered system prompt, hand-roll their own data, fail to tag the audit log with which surface or sermon they came from, and in six cases write directly into sermon fields without giving the pastor a chance to see what's about to change.

The 26-item plan below is consolidation, not redesign — every item either pulls scattered tab-side behavior under an existing centralized pattern, adds a small additive guard at a known weak spot, or updates a doc to match current code. No new architectural patterns are introduced. Existing tests are preserved (any required test change is flagged for product-owner ruling, not executed silently).

---

## The 26 items

### Tier A — stop the bleeding (silent corruption / silent failure) — **SHIPPED**

1. **[A1]** ✅ *Shipped `50a24ac`.* Add an AbortController to `sendAIMessage` and abort in-flight calls when the active sermon changes. *(`src/utils/ai.js`, `src/components/SermonWorkspace.jsx`)*
2. **[A2]** ✅ *Shipped `2b0fa66`.* Replace the six direct-write AI paths with the proposal pattern (or persistColumn-confirm variant for Final Tune-Up). Six paths: Synthesize Redemptive, Compile Implications, Populate Scripture, Manuscript Delivery formatter, Preaching Blocks (CMC), Final Tune-Up. *(StudyTab.jsx, DeliveryTab.jsx, AIPanel.jsx; reference `ProposalPanel.jsx`)*
3. **[A3]** ✅ *Shipped `a05defd`.* Add a small JSON-output validator and wire it into every JSON-bound parse boundary. *(new `src/utils/aiSchema.js`; wired at AIPanel.jsx Incorporate parser, StudyTab.jsx Populate Scripture parser, DeliveryTab.jsx CMC parser)* **Q1 resolved by execution: outlineChat.js text-shape parsing and Final Tune-Up prose were deferred — JSON boundaries only.**
4. **[A4]** ✅ *Shipped `c57bcd2`.* Differentiate the eight AI failure modes (auth, rate limit, network, server, timeout, format, empty, unknown) at the provider/IPC/wrapper layers and surface kind-specific user-facing messages. Replaces the unified "Something went wrong." *(provider.js, electron/ai.js, src/utils/ai.js, AIPanel.jsx, StudyTab.jsx, OutlineTab.jsx, DeliveryTab.jsx, SeriesPlanner.jsx)* **Q2 resolved by execution: shipped as a single PR across all five UI files.**

### Tier B — make constraints visible

5. **[B1]** Active-role label in the AI Panel header that updates with posture, step, and theology mode. *(AIPanel.jsx)*
6. **[B2]** Collapsible "What I can see" panel under the AI Panel input listing active tiers, loaded fields, and history turn count. *(AIPanel.jsx)*
7. **[B3]** UI indicators for conversation truncation and `persistColumn` write events. *(AIPanel.jsx)*

### Tier C — pull the bypasses back

8. **[C1]** Centralize all inline `You are…` system prompts in StudyTab and SeriesPlanner under `src/prompts/` and route them through `buildSystemPrompt`. *(StudyTab.jsx, SeriesPlanner.jsx, src/prompts/)*
9. **[C2]** Route StudyTab and SeriesPlanner AI calls through `buildContext` for the context block. *Requires #8.* *(StudyTab.jsx, SeriesPlanner.jsx; references contextBuilder.js)*
10. **[C3]** Pass `step` and `sermonId` on every `sendAIMessage` call site. The wrapper already accepts both — caller-only change. *(StudyTab.jsx, OutlineTab.jsx, DeliveryTab.jsx, SeriesPlanner.jsx, ManuscriptTab.jsx)*
11. **[C4]** Centralize the four "review my outline" prompts to one source, and the two "challenge my MPT" prompts to one source. *(reviewPrompts.js, OutlineTab.jsx, StudyTab.jsx)*

### Tier D — add the safety nets

12. **[D1]** CI workflow that runs `npm test` on push to main and on every pull request. *(new `.github/workflows/test.yml` or job added to `build.yml`)*
13. **[D2]** AI-integrity gate that fails when the Anthropic SDK is imported outside `electron/ai/provider.js` or `sendAIMessage` is called outside `src/utils/ai.js`. *Implementation choice flagged at Q3.*
14. **[D3]** Per-call payload size cap at the IPC boundary + per-session AI call counter. *Requires #4.* *UI surface flagged at Q4.* *(electron/ai.js, src/utils/ai.js)*
15. **[D4]** Capture token-usage fields (`usage.input_tokens`, `usage.output_tokens`, `usage.cache_creation_input_tokens`, `usage.cache_read_input_tokens`) into the audit log. *(provider.js, electron/ai.js)*

### Tier E — privacy and housekeeping

16. **[E1]** Decide what `ai-log.jsonl` should keep and implement. *Cannot start without Q5 ruling.* *(electron/ai.js, docs/SYSTEMS/ai-panel.md)*
17. **[E2]** Fix the audit-log rotation edge case so a single oversized entry cannot leave the file above the size cap. Trim when EITHER `lines.length > KEEP_ENTRIES` OR `size > MAX_AUDIT_BYTES`. *(electron/ai.js)*

### Tier F — catch the docs up

18. **[F1]** Update `docs/REFERENCE/ipc-channels.md` to match current IPC surface (remove obsolete `db-getRecentSermons` / `db-loadTourSermon` / `db-removeTourSermon`; add `spine` channel and ops; add calendar-note channels; correct `ai-message` payload to include `step` and `sermonId`).
19. **[F2]** Document the AI surface gaps in `docs/SYSTEMS/ai-panel.md` (theology research mode, Incorporate flow, externalMessage / persistColumn pattern, prompt-caching contract, audit-log path and retention).
20. **[F3]** AI migration playbook documenting how to bump the model id. *Location flagged at Q6.*

### Tier G — polish

21. **[G]** Surface `stop_reason: "max_tokens"` truncation as a distinct user-visible signal. *(provider.js, electron/ai.js, AIPanel.jsx)*
22. **[G]** Add idempotency to retry path or document why retries are safe today. *(provider.js)*
23. **[G]** Fix the 24h client-TTL edge case where `loadKey()` returning undefined silently constructs a broken Anthropic client. *(provider.js)*
24. **[G]** Reconcile the OutlineTab "Apply to Outline" flow with StudyTab's two-step destructive-replace confirm. *(OutlineTab.jsx, StudyTab.jsx)*
25. **[G]** Dedupe the Study Guide Note Writer prompt that's defined twice in SeriesPlanner.jsx (~lines 1057 and 1373).
26. **[G]** Resolve the orphan `handleSlotAI` function in SeriesPlanner.jsx (~lines 1049–1066). *Cannot start without Q7 ruling.*

---

## Risk profile

| Risk band | Items | Why this band |
|---|---|---|
| Low (additive, hard to break, easy to revert) | 5, 6, 7, 10, 12, 13, 15, 17, 18, 19, 20, 21, 22, 25 | Each is a new label, doc, automated check, log field, or tiny bug fix. Worst case is a reverted commit. |
| Medium (changes user-visible behavior in one place; subtle AI-output drift possible) | 1, 4, 8, 9, 11, 14, 23, 24 | Changes error messaging, prompt wording, or a familiar UI flow. Reversible. |
| Higher (touches sermon state, may require test changes, or needs a ruling) | 2, 3, 16, 26 | Item 2 changes six save flows from auto-save to confirm-save. Item 3 may reject AI responses that previously got through. Items 16 and 26 are blocked on rulings. |

Three cross-cutting risks:

1. **Test divergence on Items 2 and 9.** Per the safety rules, any required test change is flagged not executed.
2. **Subtle AI-output drift on Items 8, 9, 11.** No existing test measures AI answer quality. Mitigation: ship in small batches and use the AI for at least one full sermon prep before moving on.
3. **Dependencies inside Tier A.** Item 2 requires Item 1; Item 14 requires Item 4. Out-of-order shipping is worse than not shipping.

---

## Decisions needed before specific items can ship

- ~~**Q1 (Item 3 Tune-Up coverage)**~~ — **Resolved by A3 execution.** Skipped Tune-Up entirely; JSON boundaries only.
- ~~**Q2 (Item 4 scope)**~~ — **Resolved by A4 execution.** Shipped as one PR across all five UI files.
- **Q3 (Item 13 implementation)** — script + pre-commit (like `spine-integrity.js`) or ESLint rule (like `no-direct-database`)?
- **Q4 (Item 14 counter UI surface)** — settings page, footer, or compute-but-don't-render-yet?
- **Q5 (Item 16 audit-log policy)** — (a) hash content, keep metadata only; (b) full content, opt-in via setting; (c) keep as-is, document in SetupScreen. **Item 16 is blocked until ruling.**
- **Q6 (Item 20 location)** — `docs/PROPOSALS/` or `docs/SYSTEMS/`?
- **Q7 (Item 26 deletion)** — explicit permission to remove the orphan, or leave alone?

---

## Dependencies on other in-flight work

- **SPRD Q5** (Synthesize and Compile direct-writes) — **answered by execution.** Item 2 shipped 2026-05-01 (`2b0fa66`) and converted those two paths plus four more to the proposal pattern. SPRD Q5 is moot.
- **SFDI** — no overlap. ACCI Items 8 and 9 will edit StudyTab.jsx mechanically (move text, route through pipeline) but do not touch field structure or sub-phase flow.
- **Distribution proposal** — its claim that an audit log entry is written for each AI message gets properly documented by Item 19 and policy-settled by Item 16.

---

## How to resume

When ready, open a working session and name a starting point:

- "Begin Tier B" or "Begin Item 5" — picks up at the next planned block (active-role label / "What I can see" panel / write indicators).
- "Resume at Item N" — for subsequent sessions.
- "Settle Q5" — for decision sessions when an item is blocked on a ruling. Q5 still gates Item 16; Q3, Q4, Q6, Q7 still gate Items 13, 14, 20, 26.
- "Run Item 12 in parallel" — Items 12, 18, 19, 25 are the safest to run out of order. Items 13, 14, 16, 20, 26 require their gating Q resolved first.

Each session targets one item. The session ends when the item is shipped, reviewed, and merged — or when the work flags a divergence and stops for a ruling.

---

*End of task tracker.*
