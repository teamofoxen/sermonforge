# SermonForge — FUTURE.md

This file captures architectural and design improvements that have been identified, reasoned
about, and deliberately deferred. It is not a bug list and not a feature backlog.

Each entry records what the current situation is, what a better approach would look like,
why the change was not made immediately, and what conditions would trigger revisiting it.

Use this file during any session that touches the relevant area — the trigger conditions
are hints about when to fold the improvement in naturally rather than making a dedicated
pass at it.

---

## Entry 1 — Structural enforcement of the database.js boundary

**Current situation:** The rule "no direct `window.electronAPI` calls outside `database.js`"
is enforced by documentation and convention (CLAUDE.md GUARDRAILS) rather than by code
structure. It is a social constraint, not an architectural one.

**Better approach:** Consume `window.electronAPI` entirely inside `database.js` at module
load time so it is never a named global accessible to other modules. This would make boundary
violations structurally impossible rather than just documented.

**Why deferred:** The current approach works correctly and all known violations have been
fixed. The refactor touches `database.js` and `preload.js` and requires careful verification
of every IPC call path. Low risk of regression but non-trivial to verify completely.

**Triggers revisiting:** Any session that substantially modifies `database.js` or
`preload.js` for another reason — fold the structural enforcement in at that point.

---

## Entry 2 — Shared CONTEXT_SCHEMA constant for pipeline and system prompt

**Status: COMPLETED 2026-04-04**

`src/constants/contextSchema.js` created. Exports `CONTEXT_SECTIONS` (frozen object) with
all 7 section label strings. Both `contextBuilder.js` (`assembleContext()`) and
`AIPanel.jsx` (`buildSystemPrompt()` MESSAGE CONTEXT RULES) import from this constant.
No string literal section labels remain in either file.

~~**Current situation:** The section labels (`[PASSAGE & MPT]`, `[THIS SERMON]`,
`[INTERPRETATION]`, `[STRUCTURE]`, `[SERIES CONTEXT]`, `[SUPPORTING MATERIAL]`,
`[PASTOR CONTEXT]`) appear as string literals in both `contextBuilder.js` and
`AIPanel.jsx`. When a section label changes, two files need updating. If they drift, the
AI's MESSAGE CONTEXT RULES silently break — the rule references a label that no longer
matches what the pipeline emits.~~

~~**Better approach:** A single `CONTEXT_SCHEMA` constant in `src/constants/` that exports
the section labels and tier metadata. Both `contextBuilder.js` and `buildSystemPrompt()` in
`AIPanel.jsx` derive their labels from this constant. A label can only be defined in one
place.~~

~~**Why deferred:** The current labels are stable and both files are currently in sync. The
refactor requires touching two architecturally sensitive files simultaneously. The risk is
low but the benefit only materializes if labels change — which they will eventually as the
pipeline evolves.~~

~~**Triggers revisiting:** Any session that adds a new context tier or renames an existing
section label — do the consolidation at that point rather than updating two files separately.~~

---

## Entry 3 — Pastor memory storage: localStorage to AppData flat JSON

**Current situation:** Pastor memory is stored in `localStorage` under
`"sermonforge_memory"`. `localStorage` lives in Electron's Chromium profile directory —
not in the user's expected data location, not guaranteed to survive Electron major version
updates, and not synced via OneDrive alongside the sermon database.

**Better approach:** Store memory as a flat JSON file at
`~/AppData/Local/SermonForge/pastor_memory.json`. More intentional, survives Electron
updates reliably, and puts the data where the user would expect to find it. If sync ever
becomes desirable, migrating from a flat file to the sermon database is straightforward.

**Why deferred:** `localStorage` is working correctly. The migration requires a one-time
read of the old storage location and write to the new location, plus updating all read/write
calls in `memory.js`. Low risk but non-trivial to test thoroughly.

**Triggers revisiting:** If the pastor reports memory loss after an Electron update, or if
multi-machine use becomes a real workflow.

---

## Entry 4 — is_one_off as a type discriminator

**Current situation:** A single `is_one_off: 0/1` flag gates meaningfully different
behavior across three subsystems — the Pastoral Intelligence card (conditional series
context display), the context builder (series context threading), and the navigation layer
(return destination on workspace close). This is a boolean doing the work of a type
discriminator.

**Better approach:** If the behavioral divergence between one-off sermons and series sermons
continues to grow, consider a `sermon_type` column with explicit values
(`"series" | "standalone"`) rather than an implicit boolean. This makes the branching logic
more readable and extensible.

**Why deferred:** Three branch points is not yet a problem. The boolean is semantically
clear. The migration would require updating all `is_one_off` references across the codebase.

**Triggers revisiting:** If a fourth subsystem begins branching on `is_one_off`, or if a
new sermon type is needed (e.g. guest preacher, special service).

---

## Entry 5 — sql.js write queue with retry on launch

**Current situation:** The 500ms debounce on `saveDb()` creates an accepted crash window
(ADR-012). The in-memory sql.js DB and the disk file are treated as a single concern — a
crash during the debounce window means the last 500ms of changes are lost.

**Better approach:** Treat the in-memory sql.js DB as the always-current source of truth.
Make disk writes fire-and-forget with a small write queue that records a last-write
timestamp. On launch, if the timestamp doesn't match the DB state, attempt recovery from
the last good write. The crash window becomes recoverable rather than accepted data loss.

**Why deferred:** The current approach is simple and the failure mode is well understood.
The write queue adds meaningful complexity for a single-user local app where crashes are
rare. The accepted risk is documented in ADR-012.

**Triggers revisiting:** If the pastor experiences data loss from a crash, or if the app
moves toward more frequent auto-save operations that make the 500ms window more likely to
be hit.

---

## Entry 6 — Series Study Guide Export

**Status: BUILT — 2026-04-05**

The study guide export is implemented. "Export to Word" in the StudyGuideModal writes a
5-part .docx to `~/OneDrive/SermonForge/StudyGuides/[title] — Study Guide.docx` via the
`series-export-study-guide` IPC channel. See ADR-014 for the full specification.

**What was built:** Series title + accent color, passage range, date range, then five
content parts (The World of This Book, Why We're Here, The Big Idea, The Journey, Reference).
Empty parts are omitted. Each sermon in Part 4 shows passage, title, date, liturgical season,
and the study_guide_note written in the Sermon Slots tab.

**Remaining improvements worth revisiting:**
- **Cover page / title page formatting** — the current output uses plain heading styles.
  A proper title page with the series color as a design element would make it more
  distributable. Requires a .dotx template or custom XML — non-trivial with the docx library.
- **Table of contents** — for long series (10+ sermons, multiple sections), a ToC after
  the title would improve navigability. The docx library supports ToC generation; deferred
  for now.
- **Congregation-facing polish** — the current output is a faithful assembly of planning
  data. A "congregation version" might want the book study research omitted and only the
  sermon arc (Part 4) plus big idea exported. A mode selector (full / abbreviated) could
  address this without maintaining two separate export flows.

**Triggers revisiting:** If the pastor wants to distribute the study guide to congregation
members and needs cleaner formatting, or if a ToC becomes useful for longer series.

---

## Entry 7 — Unused dead code cleanup

**Current situation:** Six items of dead code exist in the codebase:

- `electron/main.js`: `buildLogosUrl()` function — fully implemented, never called. The
  `open-logos` handler uses clipboard only.
- `electron/main.js`: `generateId()` function — wraps `randomUUID()`, never called. All
  handlers call `randomUUID()` directly.
- `src/components/AIPanel.jsx`: `getSuggestions("series")` branch — unreachable from any
  real tab value in `SermonWorkspace`.
- `src/components/AIPanel.jsx`: `getSuggestions("book-study")` branch — unreachable because
  Book Study uses `AIChatPanel` (SeriesPlanner's local component) with inline system prompts,
  not `AIPanel.jsx`. Structurally identical to the `"series"` case above.
- `src/components/AIPanel.jsx`: `HOW_CHIP_MESSAGES["book-study"]` entry — same reason.
- `src/components/AIPanel.jsx`: `buildSystemPrompt()` `stepDescriptions["book-study"]` entry
  — same reason.

**Why deferred:** Dead code, no behavioral impact.

**Triggers revisiting:** Any session that touches these files for another reason — remove
the dead code at that point.

---

## Entry 8 — Pre-v7 silent failure handlers in SeriesPlanner.jsx

**Current situation:** Several AI handlers across `SeriesPlanner.jsx` (Overview, Structure,
Calendar chat tabs) and `StudyTab.jsx` use `try/finally` with no `catch` block. These fall
into two sub-patterns:

1. **Chat handlers** (`handleChatSubmit` in Overview/Structure/Slots/Calendar tabs,
   `SeriesPlanner.jsx` lines ~558, ~792, ~1012, ~1350): When `sendAIMessage` throws, the
   loading spinner stops but no error is surfaced. The conversation appears stuck.

2. **Generate/draft handlers** — previously also wrote the result directly to fields
   (`onChange("field", resp.trim())`). This carried a data-loss dimension: if
   `sendAIMessage` returned `''` (its silent error return), the field was overwritten with
   empty string. **This sub-pattern was fixed 2026-04-07** — all generate/draft handlers
   in `SeriesPlanner.jsx` and `StudyTab.jsx` now guard writes with `if (resp?.trim())`.
   Only the missing error-message aspect of the chat handlers remains deferred.

The pattern predates v7. The three new v7 handlers (`handleAnalyze`, `handleChatSubmit` in
BookStudyTab, `handleSlotAI`) were fixed in the 2026-04-05 session.

**Also deferred:** `normalizeSermon()` in `contextBuilder.js` lacks a test for the case
where `sermon.series` is present but `series_motivation` and `redemptive_context` are both
missing entirely (a pre-v7 series record with no v7 columns). The `?? ""` default handles
this correctly in code but the case is untested.

**Why deferred:** The remaining chat handlers show no response but do not lose data. Fixing
them requires touching multiple handlers across three tabs with no architectural change.

**Triggers revisiting:** Next maintenance audit, or any session that touches
`SeriesPlanner.jsx` AI handlers or `contextBuilder` tests.
