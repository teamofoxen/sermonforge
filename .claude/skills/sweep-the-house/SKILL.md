---
name: sweep-the-house
description: Deeper controlled audit of the current git diff against SermonForge architectural rules. Checks the no-AI tripwire, CORE contract impact, database/schema safety, IPC and save/flush integrity, privacy boundaries, search/export/telemetry, and a product-lens pass on visible UI diffs. Returns PASS / WARN / FAIL with severity-tagged findings. Use when the user types /sweep-the-house or asks for a thorough diff audit.
trigger: /sweep-the-house
---

# sweep-the-house

Deeper diff audit for SermonForge. Controlled scope.

## INSTRUCTIONS

1. Run `git diff` (staged + unstaged). If empty, output "Nothing to audit." and stop.
2. Primary scope: the diff. Open related files only when a finding needs one-line verification.
3. Do NOT scan the full repo.

## PROJECT-SPECIFIC AUDIT PRIORITIES

Apply each priority **where the diff touches it** — a diff that never reaches an area
gets no findings from that area.

### 1. NO-AI TRIPWIRE
- No AI reintroduction in any form: no Anthropic/LLM SDK imports, no AI-shaped IPC
  channels or prompt/completion plumbing, no AI-written sermon content (ARI, 2026-05-09)
- The `sermonforge/no-direct-ai` ESLint rule stays intact; `MutationKind` stays
  `user_input` only

### 2. DATABASE / SCHEMA SAFETY
- No raw SQL in renderer
- No new write paths outside electron/main.js
- Writes commit at the IPC handler (better-sqlite3, 2026-06-10 — the old saveDb()/500ms-debounce pipeline is deleted; no main-process save debounce may be reintroduced)
- Schema changes ride `runMigrations()` with a version increment
- New renderer-writable columns reflected in the SERMON_COLUMNS / SERIES_COLUMNS / SECTION_COLUMNS allowlists (ts + cjs + test-spine mirrors together); main-only columns (e.g. deleted_at) stay OUT of the allowlist deliberately

### 3. IPC + SAVE/FLUSH INTEGRITY
- No unguarded or newly exposed IPC channels; no key material reaching the renderer
- The renderer's autosave debounce still flushes on every exit path — window close /
  quit / reload (`closeFlush.js`), position moves (`beforePositionChange`), and before
  export; a diff that adds a new exit or navigation path must join the flush chain

### 4. PRIVACY / OUTBOUND BOUNDARY
- Exactly three outbound calls exist: the ESV passage fetch, the updater's GitHub
  Releases version check, and opt-out BTI interaction *metadata*
  (`docs/REFERENCE/privacy.md`)
- A diff must not add outbound traffic, and sermon content must never enter any
  outbound payload

### 5. SEARCH / EXPORT / TELEMETRY
- `sermon_search` stays in sync with the columns pastors expect findable; soft-deleted
  rows stay excluded from every list and search
- Word exports (manuscript, study guide) keep their single-source models — e.g.
  `src/utils/studyGuideModel.js` and its `electron/studyGuideModel.cjs` mirror move
  together
- Telemetry stays inside the frozen event registry (`electron/telemetry/events.js`),
  metadata only, never-throw

### 6. PRODUCT LENS (visible UI diffs)
- When the diff changes what the pastor sees, run a small product-lens check
  (`docs/PRODUCT-LENS.md`): is the changed surface legible cold, is the next action
  discoverable, is feedback (save / error / empty state) visible, and do re-entry and
  Back still behave predictably?

## RED FLAGS (HIGH SEVERITY)

- Reintroducing any AI surface, SDK import, or AI-shaped IPC channel
- Reintroducing any main-process save debounce or serialize-and-rotate pipeline (amended CORE invariant, 2026-06-10)
- Adding renderer-writable sermon fields without updating the allowlist mirrors
- Breaking createOutlinePoint() as the sole outline point constructor
- New outbound network traffic, or sermon content entering any existing outbound call
- Weakening any clause in The Framework (`docs/CORE.md` → "The Framework")

## CONTRACT TEST (binding — `docs/CORE.md` → "The Framework")

Every diff must pass The Test. Run these five questions against the diff:

1. **Which contracts does it touch?** Name them by clause number (e.g. State #3, Mutation #1, Surface #4).
2. **Does it strengthen or weaken each one?** A change that weakens a contract clause to ship a feature is a HIGH-severity finding and a `FAIL`.
3. **Does it preserve the Principle (Clarity through Constraint)?** Any change that lets the system substitute for the user's clarity work is a Principle violation — HIGH severity, `FAIL`.
4. **If it conflicts with an existing clause, which is wrong?** Surface the conflict in findings; do not silently resolve in code.
5. **Where does the pastor SEE this — and what does it orphan?** Name the surface that renders the change (unrendered = not shipped); if the diff deletes anything, name what consumed the deleted thing — unhandled orphans are a MEDIUM finding.

Add a `CONTRACTS:` block to the output enumerating touched clauses with verdict (strengthens / weakens / neutral). Empty block when the diff doesn't touch contract surfaces.

## PRIORITY FOLLOWS THE DIFF

There is no standing "always lower priority" category. UI layout, naming, and copy are
load-bearing when the diff changes what the pastor sees (State #5, the Surface contract,
and the product-lens check above); they matter less only when the diff doesn't touch
them. Weight the audit by what actually changed.

## OUTPUT FORMAT

### Part 1 — Sweep Report

STATUS: PASS | WARN | FAIL

SUMMARY: 1-2 sentences

CONTRACTS:
- <clause> — <strengthens | weakens | neutral> — <one-line why>
(or "none touched" when the diff doesn't reach contract surfaces)

FINDINGS:
- [Severity: LOW | MEDIUM | HIGH] issue - file - why it matters - fix (short, no rewrites)

### Part 2 — Simplify Pass

After emitting Part 1, invoke `/simplify` on the same diff via the Skill tool with explicit scope: **REPORT FINDINGS ONLY. Do NOT apply fixes.**

Append its output below Part 1 under the heading `SIMPLIFY PASS`. If `/simplify` returns no findings, emit `SIMPLIFY PASS: nothing to simplify.` and stop. If the `/simplify` skill is not available in the current environment, emit `SIMPLIFY PASS: /simplify unavailable in this environment.` and stop — do not improvise a replacement pass.

The user decides whether to act on simplify findings — never edit code in this skill.

## HARD RULES

- Sweep portion (Part 1) max 300 words; Simplify portion (Part 2) governed by /simplify's own limits
- No full-repo scanning
- No embeddings or broad search
- No large refactors
- No speculation
- Stay grounded in the diff
- Any contract weakening or Principle violation forces `FAIL` regardless of other findings
- Simplify Pass is REPORT-ONLY. No fixes applied without explicit user approval (per Audit Workflow rule).
