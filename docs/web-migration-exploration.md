# SermonForge — Web Migration Exploration

> **Status: analysis only.** Written 2026-07-24 against the tree at `260ec6a` (schema v34).
> Evaluates moving SermonForge from a local-first Electron + SQLite desktop app to a
> web app on a teamofoxen.com subdomain (Next.js + Prisma + Postgres/Neon).
> Nothing in this document authorizes implementation. Per the stated scope:
> the commentary corpora, the theology/vector stack, and local full-text search
> indexes are **dead requirements** — this document does not design around them
> and marks them for deletion (§1.4, §8).
>
> Line numbers cite the current tree and will drift; they were verified against
> opened files during this exploration.

---

## 0. Executive summary

The migration is far more tractable than the phrase "port an Electron app to the web"
suggests, for one structural reason: **almost everything pastor-facing is already plain
React over pure derivation functions, and the entire desktop surface is concentrated
behind one seam.** All IPC is async and promise-based; the renderer talks to the world
through exactly two wrapper modules (`src/core/spine.ts`, 28 functions; `src/db/database.js`,
27 functions). Swap what's behind those 55 functions from `ipcRenderer.invoke` to
fetch/server-actions and the majority of the UI doesn't know anything changed.

The real work concentrates in four places, in descending order of difficulty:

1. **Autosave and multi-device conflict.** The workspace save is a whole-row,
   last-write-wins PUT of every column on an 800ms debounce. Fine with one writer on
   one machine; it is the single thing that must be redesigned, not ported (§4.4).
2. **The exit seam.** The desktop app went to great lengths to guarantee no keystroke
   is lost on close/quit/reload — including a main-process ask/ack that *awaits* the
   renderer's flush and a custom menu that deletes Ctrl+R. A browser cannot do any of
   that. The fix is a different save model, not a port of this one (§4.2, §4.5).
3. **Responsive rebuild.** The shell is a fixed, non-scrolling 1024×700-minimum
   desktop pane with a hard 260px sidebar and one media query in the whole app.
   iPad/iPhone support is a real project, not a CSS pass (§4.6).
4. **Concurrency in the planner.** Renderer-side JSON merges, SELECT-then-INSERT
   races, and whole-list sort rewrites all assume a single synchronous writer (§3.4).

**The editor question resolves cleanly: there is no rich-text editor to replace.**
The writing surface is structured forms of plain `<textarea>` elements. Recommendation:
keep it; do not adopt ProseMirror/Lexical/TipTap (§2.5).

**And two premises need a formal reckoning:** the migration repeals CORE law
("No backend. Local-first only.") and the shipped privacy promise ("your sermon
content never leaves your machine") — plus the ESV key licensing posture changes
when one server key replaces per-user keys (§6).

---

## 1. Inventory

Method note: everything below was read in this exploration — either directly or by
sweep agents that opened the files. Where a claim is an assumption rather than an
observation, it is flagged.

### 1.1 Bucket A — ports directly

The heart of the product. These are pure data, pure functions, or plain client-side
React with no Electron reach:

**The walk itself (the product's content and grammar):**
- Field definitions: `src/utils/studyFields.js`, `src/utils/sadiAnchorFields.js`,
  `src/utils/sermonOutlineFields.js`, `src/utils/sermonEquipFields.js`,
  `src/utils/sermonManuscriptFields.js` — pure data + pure envelope helpers.
- Sequence: `src/utils/walkOrder.js` (WALK_ORDER / QUESTION_WALK_ORDER / nextField).
- Derivations: `src/utils/sermonState.js` (position, question states, outcomes,
  completeness), `src/utils/studyAdvancement.js` (the five composites),
  `src/utils/useWorkspaceCompletion.js`.
- Canon and law documents (`docs/WORKSPACE-CANON.md`, `docs/PASTORS-CHARTER.md`, the
  SFDI/SADI records) — content is runtime-independent.

**Workspace components (client components, no Electron reach):**
`src/components/SermonWritingSurface.jsx` (811 lines), `SermonMap.jsx`,
`SermonStartLanding.jsx`, `StudyAnchorHandoff.jsx`, `SermonFinish.jsx`,
`ReferencePane.jsx`, `FieldTeaching.jsx`, `PassageCanvas.jsx` (440 lines),
`WorkspaceNotebookDrawer.jsx`, `UnsavedLeaveConfirm.jsx` (renderer half),
`src/utils/useModalA11y.js`, `src/utils/buttonKeydown.js`.

**Planner pure logic:** `src/utils/coverage.js`, `src/utils/pacing.js`,
`src/utils/topicalPassage.js`, `src/utils/discovery.js` (the parse function — the
*merge call site* moves server-side, §3.4), `src/utils/studyGuideModel.js`,
`src/utils/arc.js`, `src/data/canonicalBooks.js` (66-book KJV dataset — keep as a
static module; it never changes).
Caveat: `src/utils/churchCalendar.js` and everything downstream of `parseLocalDate`
in `src/utils.js` is timezone-naive (local-TZ `Date` constructors) — portable code,
but it must be pinned to a date-only/fixed-TZ discipline before it runs on a server
(§3.6).

**Design system + assets:** `src/styles/global.css` / `typography.css` / `fonts.css`
and the 36 self-hosted woff2 files (~992 KB) — maps onto `next/font/local`; worth
pruning weights for mobile first-paint. `src/datasets/preachingVerses.js`,
`preacherQuotes.js`. `src/components/Logo.jsx`. All primitives
(`src/components/primitives/` — PrimaryButton, SecondaryButton, IconButton,
TextButton, BackButton, EmptyState, LoadingState, KeyInput, DeleteButton).

**Search rendering:** `src/components/SearchResultSnippet.jsx` and
`src/utils/searchHints.js` port unchanged if the server emits the same
`‹mark›…‹/mark›` markers (Postgres `ts_headline` can be configured to do exactly
that — `StartSel`/`StopSel`).

**Tests:** roughly two-thirds of the ~88 test files. The source-text/grammar
scanners in `tests/contracts/` (allowlist sync, one-vocabulary, no-anonymous-atoms,
grammar-ownership, etc.) don't care what the runtime is; the 28 jsdom RTL tests
survive modulo mocking `core/spine` against fetch instead of IPC; most of
`tests/unit/` is pure-function.

### 1.2 Bucket B — needs rework

- **The persistence spine.** `src/core/spine.ts` + `src/db/database.js` keep their
  exported names and signatures; their bodies become fetch/server-action calls.
  The server side is a rewrite: `electron/persistence.cjs` (the spine ops,
  `buildUpdate` allowlists, `withTransaction`, relational validation) becomes Prisma
  models + route handlers/server actions. The three-mirror allowlist system
  (`src/core/contracts.ts` / `electron/contracts.cjs` /
  `tests/contracts/_helpers/test-spine.ts`) collapses to **one** TypeScript module —
  the mirrors exist only because of the Electron CJS/ESM boundary. Same for
  `electron/studyGuideModel.cjs` (hand-maintained mirror of
  `src/utils/studyGuideModel.js`) and `electron/saveTransition.cjs`.
- **The save architecture** — redesigned, not ported (§4.4).
- **Routing.** `src/App.jsx` (435 lines) is a `useState` VIEW-enum state machine
  with zero deep-linkability. The 8-member enum + 4 nested selections map almost
  1:1 onto a Next.js route tree; five pieces of App-level state need re-homing
  (§4.1). Sidebar nav items are `role="button"` divs — become real links.
- **Exports.** Both `.docx` exports (`sermon-export-manuscript`,
  `series-export-study-guide` in `electron/main.js`) write to the user's Documents
  folder and shell-open Word. The `docx` library is pure JS and runs fine in a Node
  route handler — the export becomes a streamed download. All "Opened in Word —
  saved to Documents › …" copy (e.g. `src/components/CompletedSermons.jsx`,
  `SeriesPlanner.jsx`) becomes false and must be rewritten.
- **ESV passage fetch.** `passage-fetch` becomes a server-side proxy route; the key
  moves from the OS keystore (`electron/keystore.js`) to a server secret.
  `SetupScreen`/`EsvKeyModal`/`EsvRecovery` copy ("stored securely on this machine",
  the Windows-specific `key-unreadable` case) must be rewritten; the licensing
  posture changes (§6).
- **Sermon search.** Feature is live and stays; implementation is replaced
  server-side (§1.4 for what gets deleted). At two-user scale, Postgres `ILIKE`
  over a flattened generated column reproduces today's substring semantics exactly;
  `tsvector`/`ts_headline` is the upgrade path. Fold the client-side lifecycle
  filter (SermonList strips completed, CompletedSermons keeps only completed —
  both currently fetch everything and discard half) into the query.
- **Feedback/BTI.** The event schema and validation (`electron/telemetry/events.js`,
  `transport/worker.js`) port trivially; ~90% of `electron/telemetry/bus.js` (NDJSON
  buffering, orphan sweeps, tester-id files) exists because a desktop process dies
  with unsent data, and deletes. Simplest web form: an API route writing to a
  Postgres table; the Cloudflare worker becomes optional.
- **Theme.** Dark mode is fully token-based and manually toggled
  (`data-theme` + `localStorage["sf-theme"]` + a pre-paint script in `index.html`).
  The pattern ports (next-themes or an inline script); the `ui-prefs.json` IPC half
  deletes; a server-read cookie removes the SSR flash entirely.
- **Per-series localStorage keys** (`sermonforge_planner_tab_*`,
  `_intro_*`, `_guide_built_*`, `sermonforge_discover_step_*`) — per-browser today,
  never cleaned up, and wrong the moment one user has two devices. Become per-user
  prefs rows (§3.3).
- **Error reporting.** `reportRendererError` / `electron/logger.js` → Sentry or
  equivalent.
- **Fixtures.** The `?workspace` / `?planner` / `?arc` query-param fixture routes in
  `App.jsx:271-346` become dev-only routes; note two of the five are currently
  **not** DEV-gated.

### 1.3 Bucket C — deletes outright

Consolidated with rationale in §8. Headline: the entire `electron/` directory except
the portable data modules; the theology/corpus stack; the `sermon_search` projection
machinery; the browser-preview stubs; several orphan components.

### 1.4 Explicit call-out: what exists mainly to serve corpora or local search

Per the scope instruction, these exist mainly (or only) for the dead requirements and
are **marked for deletion**:

**The theology/commentary corpus stack — confirmed fully dormant, zero UI consumers.**
Exhaustive greps found no component, hook, or page that calls the three renderer
wrappers (`getTheologyStatus` / `searchTheologyLibrary` / `getTheologyChunks` in
`src/db/database.js:41-43`); the embedder's `preWarm` has no caller anywhere.
- `electron/embedder/host.js` + `electron/embedder/worker.js` (the
  @xenova/transformers MiniLM worker)
- `electron/main.js` ~360–416 (`ensureTheologyDbLoaded`, `embedText`), ~451–473,
  ~908–1170 (the `theology-status` / `theology-search` / `theology-get-chunks`
  handlers, author scoring, FTS query builder)
- `resources/models/` (bundled quantized ONNX model, shipped via `extraResources`)
- `scripts/theology/` (corpus build pipeline), `scripts/smoke-embedder-worker.js`
- `corpus/` (raw/parsed/chunked/manifest) and `theology.db` (519 MB at repo root)
- Dependencies: `@xenova/transformers`, `sqlite-vec`, the transitive
  `onnxruntime-node` asarUnpack, and (apparently unused at runtime already)
  `mammoth`

**The local sermon-search index.** Not FTS5 — a plain flattened-text projection
table (`sermon_search`, 15 columns) written transactionally beside every sermon
mutation, queried with LIKE, with a hand-rolled JS snippet generator:
- The indexer/query machinery in `electron/persistence.cjs`
  (`SERMON_SEARCH_COLUMNS`, `indexSermonFts*`, `dropSermonFts`, `flattenJsonToText`,
  `rebuildSearchIndex`) and `electron/main.js` (`searchSermonsFts`,
  `buildSearchSnippet`, tokenizer)
- The `sermon_search` table itself (v22/v24 migrations)

The *feature* those serve — searching your own sermon library — is live in two
surfaces and should survive as a server-side Postgres query (§1.2). The *index
machinery* is what dies.

---

## 2. The sermon workspace

### 2.1 How the writing surface is built today

**There is no rich-text editor anywhere in the workspace.** The "editor" is a
field-walking surface: `SermonWritingSurface.jsx` resolves the current field from
`walkOrder.js`, renders that field's questions stacked, and dispatches each question
by `kind` to one of eight renderers — every one of which bottoms out in plain
`<textarea>` (auto-grown via scrollHeight) or `<input>`:

| Question kind | Renderer | Storage target |
|---|---|---|
| text-prompt (default) | `PromptBlock` — textarea + N/A toggle | `{value, na}` envelope in the sub-phase JSON column |
| `indented-canvas` | `PassageCanvas` — row array, per-row textarea + verse-gutter input | `observations.divisions.canvas` + derived `thought_units` |
| `cumulative-synthesis-table` | `CumulativeSynthesisTable` — read-only prior columns + one editable textarea per thought unit | the cross-phase `thought_units` array |
| `outline-builder` | `OutlineBuilder` — reorderable `{id,text}` list | native `outline` column |
| `functional-elements` | `FunctionalElementsEditor` — 4 textareas per outline point | native `functional_elements` keyed by point UUID |
| `manuscript-transitions` | `ManuscriptTransitions` | `manuscript.transitions` keyed by point UUID |
| `manuscript-prose` | `PromptBlock` over the native `manuscript` column (N/A as `_na` sidecar) | `manuscript.<section>.<key>` |
| `sermon-title` | `SermonTitleEditor` — input with spoken empty-refusal | native `title` column |

The most editor-like component is `PassageCanvas.jsx`: a **row-array outliner**, not
contenteditable. Each row is `{id, text, depth, verse?}`; Tab/Shift+Tab indent
(max depth 5), Enter splits/inserts rows, Backspace-at-start merges, ArrowUp/Down
hop rows at caret boundaries, paste is deliberately blocked ("type the passage by
hand IS the discipline"), and destructive gestures on rows carrying downstream work
pause behind a row-scoped confirm banner. Row identity is load-bearing: canvas row
UUIDs key the Meaning/Christ-Connection/Implication columns across three later
sub-phases, and the code is elaborately careful never to strand work on a
regenerated id (Enter-at-offset-0 inserts *above* so the existing row keeps its id;
re-seed refuses when any row carries anchored work).

### 2.2 Document model and the "invisible system" in state and storage

The document model is **a structured questionnaire, not a document tree**:

- Four Study sub-phase JSON columns (`observations`, `interpretation`,
  `redemptive_thread`, `implications`), each `{fieldKey: {questionKey: {value, na}}}`,
  plus the v19 `main_point_pair` envelope.
- Three native JSON columns the export reads directly: `outline` (array of
  `{id, text}` points), `functional_elements` (keyed by point UUID), `manuscript`
  (`{introduction, transitions, conclusion}`).
- The cross-phase `thought_units` array living inside `observations.divisions`,
  extended column-by-column as the pastor moves through Interpret → Redemptive
  Thread → Implications.

The minimalist surface and summoned map are represented in exactly two columns plus
pure derivation:

- **`last_touched_position`** (TEXT, `Stage/SubPhase/FieldKey`) — the sole position
  store. NULL fires the sermon-start threshold; non-NULL is the re-entry landing.
- **`thresholds_seen`** (TEXT, JSON array) — one mechanism for every dismissed
  threshold, including per-field first-visit teaching flags.
- Everything else the pastor sees — the map's answered/partial/unanswered weighting,
  the handoff's outcomes readback, the Finish screen's nine-artifact roll-up — is
  **derived client-side** from the loaded sermon row
  (`deriveQuestionStatesFromSermon` etc. in `src/utils/sermonState.js`). No server
  round-trip is involved in opening the map today, and none needs to be on the web.

This is the single best migration property the workspace has: **the invisible system
is two columns and a bundle of pure functions.** It ports untouched.

### 2.3 The save spine (what actually has to change)

`src/utils/useWorkspaceSave.js`: every edit merges into a `sermonRef` (full sermon
object), schedules an 800ms debounce, and on fire `persistUpdate` sends
`pickSermonColumns(sermonRef.current)` — **the entire writable row, every column,
every time** — through `update-sermon`. Writes commit durably at the IPC handler
(synchronous better-sqlite3, WAL). Exit safety is a three-layer ceremony:
per-surface flush registry (`src/utils/closeFlush.js`), a main-process ask/ack
(`app-flush-edits` with nonce + 2s timeout) that can *block the window close* on a
failed flush, and a native "Keep working / Close anyway" dialog
(`electron/saveTransition.cjs`). Deliberate in-app exits resolve the same tri-state
(`saved`/`failed`/`unknown`) via `requestLeave` + `UnsavedLeaveConfirm`.

On the web: the whole-row PUT becomes the conflict problem of §4.4; the exit
ceremony is unreproducible in a browser (§4.2) and is replaced by a different model
rather than ported. The renderer-side *pattern* — optimistic local state as the
typing truth, a visible Saving/Saved/Failed+Retry vocabulary, flush-before-navigate
— is exactly right for a network app and survives.

### 2.4 What survives a move to the browser, and what has to be rebuilt

**Survives (mostly untouched):** the entire rendering layer of §2.1; the walk data
and derivations; the map/threshold/notebook/reference-pane components; the N/A
grant system (field-def flags + surface toggle + write-path guard); the dialog
accessibility contract (`useModalA11y`); the completeness contract and Finish
screen; the beforePositionChange flush-await discipline (it just awaits a fetch
instead of an IPC call).

**Rebuilt:**
- The save spine (§4.4) and the exit seam (§4.2).
- The load path: `SermonWorkspace.jsx`'s mount effect (getSermon + series + sections
  + siblings + tags) becomes one server fetch; the search-result `navHint` position
  rewrite becomes a URL param (an improvement — deep-linkable).
- The `key={openSermonId}` remount discipline (App.jsx) exists to kill pending
  debounce timers across sermon switches; under URL routing the equivalent unmount
  guarantee must be re-established deliberately (App Router does not promise a
  remount on a shared segment).
- Word export button → download (§1.2).
- Touch affordances for the canvas: Tab/Shift+Tab don't exist on the iOS software
  keyboard, so indent/outdent needs visible controls on touch (§4.6).
- One real input bug to fix in passing: `PassageCanvas`'s keydown handlers don't
  check `e.isComposing`, so Enter during IME composition would split a row
  mid-composition. Irrelevant on desktop-Electron-with-US-keyboard; real on the
  web (§4.7).

### 2.5 The editor question: hand-rolled vs ProseMirror / Lexical / TipTap

**Recommendation: keep the hand-rolled structured surface. Do not adopt an editor
framework.** This is not a close call, and the reasoning matters because the framing
("is hand-rolling still viable on the web?") presumes an editor that doesn't exist:

1. **There is no rich text.** No formatting, no marks, no inline nodes, no mixed
   content — not one contenteditable in the codebase. ProseMirror, Lexical, and
   TipTap are solutions to contenteditable's problems; SermonForge has none of
   those problems because it never opted into contenteditable. Plain textareas are
   the *most* battle-tested text input on every browser including iOS Safari —
   native IME, native autocorrect, native undo/redo, native selection, native
   spellcheck, all free.
2. **The document model is the product.** The walk is a keyed questionnaire whose
   storage shape (per-question envelopes, cross-phase thought-unit joins, outline
   point UUIDs threaded through functional elements and transitions) is ruled canon
   and consumed by derivations, exports, search flattening, and the map. An editor
   framework imposes *its* document model (a node tree) and you would spend the
   whole adoption translating between the tree and the canon shape. Stable row/point
   identity — which three sub-phases of downstream work hang off — is precisely the
   thing ProseMirror's default position-based addressing does not give you for free.
3. **The constraint system is behavioral, not typographic.** Paste-blocking on the
   canvas, N/A envelope semantics, per-row destruction confirms, the walk's
   field-at-a-time rendering — all of this is ordinary React state logic today.
   Reimplementing it as editor-framework plugins is strictly more code and a new
   dependency to master.

**What we give up by staying hand-rolled** (stated honestly):
- Rich formatting in manuscript prose (bold/italic/lists) — doesn't exist today; if
  the pastor ever asks for it, adopt **TipTap on the `manuscript-prose` question
  kind only** (a per-question island behind the existing `renderQuestion` dispatch,
  storing HTML/JSON in the same `manuscript.<section>.<key>` slot). The dispatch
  architecture makes this a contained later decision, not a fork in the road now.
- Real-time collaborative cursors (the Yjs ecosystem binds naturally to these
  frameworks) — explicitly out of scope for two users (§5).
- Inline comment anchoring to arbitrary *text ranges*. Per-question anchoring —
  which is what the walk's shape actually wants — needs no framework at all (§5).

Assumption flagged: this recommendation assumes the manuscript remains
plain-prose-in-boxes by product intent (the OEM ruling: "the manuscript page reads
as prose, not a worksheet" describes the *export*, and cell clarity is the ruled
mechanism). If the product direction changes toward a free-flowing single-page
manuscript editor, revisit TipTap for that surface first.

---

## 3. The series planner

### 3.1 Data model and relationship to sermons

Three tables, already relational and Prisma-shaped:

- `series` — identity + book fields + `kind` (`book`|`topical`) + `discovery` JSON.
  Seven retired backup columns (`redemptive_context`, `book_background`,
  `book_argument`, `book_structure`, `series_motivation`, `emerging_big_idea`,
  `melodic_evidence`) are dead weight: **do not port them** (also `delivery_notes`,
  `timing_notes`, `preaching_blocks`, `manuscript_delivery`, `last_tune_up`,
  `study_guide_note`, `checklist`, `post_sermon`, `preacher` on `sermons` — audit
  each at Prisma-schema time; most are ARI/era tombstones with no reader).
- `series_sections` — title/range/big-idea/overview + `sort_order` + `discovery`.
- `sermons` — the planner touches a narrow slice (`series_id`, `section_id`,
  `title`, `passage`, `book_id`, `date`, `sort_order`, `big_idea`, `overview`,
  `study_guide_extras`, `discovery`); everything else is workspace-owned.

The relationship is the strong part of the design: **a "preaching text" in Discovery
IS a sermon row; a "major section" IS a section row** — one create/edit path shared
by the Discover and Outline tabs (all entity mutations hoisted to the
`SeriesPlanner` parent and passed down as props — 22 props into SeriesDiscover, 20
into OutlineTab). That prop surface is exactly the server-action boundary in a Next
port, and the one-path constraint ("no shadow outline") is worth preserving
verbatim. The hard invariant — no in-series-but-section-less sermon in a book
series — is enforced at `create-sermon`, `delete-section`, and two data migrations,
and becomes a Prisma-transaction concern.

Ordering is one shared SQL composite (`seriesSermonOrderBy` in
`electron/persistence.cjs`: dated-first → section order → sermon `sort_order` →
`created_at`) used by the Schedule, the workspace breadcrumb, and the study-guide
export. Keep it one derivation on the server.

### 3.2 Desktop and filesystem dependencies

- **Study-guide `.docx` export is entirely main-process**: main re-queries
  series/sections/sermons, builds via `docx`, writes to Documents, and returns a
  local filepath rendered verbatim in the UI, with filesystem-specific error copy
  ("close it in Word" on EBUSY). Becomes a route handler streaming a download; the
  `electron/studyGuideModel.cjs` mirror evaporates.
- **Four localStorage keys** (tab memory, intro-seen, guide-built, discover-step —
  all per-series, per-browser, never cleaned). Become per-user preference rows;
  two devices currently guarantee they disagree.
- **No other Electron dependency.** Calendar notes ride a separate small IPC
  channel; everything else is spine ops.

### 3.3 Synchronous-DB assumptions

Every planner handler is synchronous better-sqlite3 inside `withTransaction` —
"validate then write" is atomic *because there is one process and one writer*. The
renderer constants are tuned for ~0ms writes: 800ms debounce, a 2000ms
flush-timeout in `resolveSaveTransition` (a slow network legitimately produces
"unknown" today's code treats as near-failure), and one deliberately **un-awaited**
follow-up write in `commitDraft` (`SeriesPlanner.jsx` ~:567) that is harmless
locally and becomes a real revert bug at 200ms RTT (the pre-commit snapshot can land
after a newer debounced write).

### 3.4 What changes when it's multi-user and network-latent

Concrete breakage found in the code, worst first:

1. **The `discovery` JSON envelopes are merged in the browser**
   (`mergeDiscovery` spreads a patch over the client's last-rendered envelope,
   then the whole envelope is serialized and written). True single-client claim
   ("a single-field merge can't drop a sibling"), false across two writers: the
   second writer silently erases the first's sub-fields with no conflict signal.
   Fix on the way over: move the merge into the server transaction (read row,
   merge, write), or promote the flat well-known keys to real columns.
2. **No optimistic concurrency anywhere** — every update is
   `SET col=? WHERE id=?` with no version/updated_at precondition. Same-field
   edits from two writers: later debounce silently wins.
3. **`firstSectionIdForSeries` is SELECT-then-INSERT** with no unique constraint —
   two concurrent creates in a section-less series produce duplicate "Section 1"
   rows. Needs a partial unique index or upsert.
4. **`end_date` has two writers**: `bulk-date-sermons` recomputes it server-side in
   the transaction (correct), but delete paths compute it from the *local* sermon
   list and push it through the debounced series saver (clobbers under
   concurrency). Make delete recompute server-side, matching the bulk op.
5. **Whole-list `sort_order` rewrites** (`reorder-sections`,
   `reorder-series-sermons`): validation rejects if the id set changed (good), but
   the client's only recovery is a full reload that discards the gesture; and two
   reorders over the same set are silent last-wins.
6. **Reload-on-failure and load-once**: planner data is fetched once and never
   invalidated; two tabs diverge immediately and permanently. The web port needs at
   minimum revalidate-on-focus (SWR/React Query), even before any real-time story.
7. **Fixture/preview seams that report success for writes that never happened**
   (`runSave`'s `_fixture` short-circuit, the spine `browserPreviewMock`, the
   `database.js` Proxy stub) must be deleted, not adapted — in a networked app a
   fake-success seam is a data-loss generator.

What ports well: the single save funnel (`runSave` + keyed retry queue +
Saving/Saved/Failed+Retry topbar), the gesture-equals-transaction spine ops, the
draft-row/commit pattern (with the follow-up awaited and folded into one
transaction), Coverage/Pacing/study-guide-model as pure functions, and the entire
Discover walk UI (owns zero persistence — every mutation arrives as a prop).

### 3.5 Size and shape

`SeriesPlanner.jsx` is 2,234 lines containing ~16 components with every saver
hoisted into the parent; `SeriesDiscover.jsx` is 796 lines of well-factored steps;
`Planning.jsx` (378) is clean. The port is an opportunity to split the planner
along its natural seams (the four tabs), but that's optional — the module runs
fine as one client component.

### 3.6 Dates and timezones

`churchCalendar.js` (Easter computus, seasons, Suggest Sundays) and
`pacing.js` are pure but **timezone-naive** — local-TZ `Date` math throughout, plus
hardcoded `toLocaleDateString("en-US")`. Run on a server (or on two devices in
different TZs) a Sunday can shift a day at the boundary. Rule needed before port:
all sermon/series dates are **date-only strings** (`YYYY-MM-DD`), all calendar math
runs in a fixed interpretation (UTC-noon trick or a date library), all formatting
happens client-side in the viewer's locale.

---

## 4. UX and UI impacts

### 4.1 The minimalist writing surface in a browser

**Losses:**
- **Chrome you don't control.** The desktop app is a chromeless fixed pane; the
  browser adds tab strip, URL bar, and (on iOS) dynamic toolbars that fight
  `100vh` (the shell uses `height:100vh; overflow:hidden` — must become `100dvh`
  plus interior-scroll discipline). The writing surface's calm is partly the
  absence of exactly this chrome.
- **Reload/close protection** (see 4.2) — the app currently *deletes Ctrl+R from
  the menu* in packaged builds because reload destroys in-flight edits; a browser
  restores every one of those exits.
- **Fullscreen is weaker**: the Fullscreen API exists but Escape always exits it —
  and Escape is also the app's universal dialog-dismiss key, so a pastor closing
  the map in fullscreen will sometimes exit fullscreen instead. Livable; worth a
  deliberate test.
- The native "Keep working / Quit anyway" dialog on failed saves at quit — gone;
  the generic `beforeunload` prompt (uncustomizable copy) is the ceiling.

**Gains (real ones):**
- **URLs.** Today zero states are addressable — no sermon, no planner tab, no
  lens, no calendar month. Every one becomes a link: bookmark the sermon you're
  prepping, send the resident "look at Sermon 3," search-result deep links become
  query params instead of the consume-once `navHint` object. This is the single
  biggest UX *win* in the whole migration and it lands mostly for free from
  routing.
- **A PWA install** ("Add to Home Screen" / installed app on desktop) recovers most
  of the chromeless feel on iPad and desktop at near-zero cost — standalone
  display, own icon, no tab strip. Recommended as the default answer to "where did
  my quiet writing room go," well before any offline investment.
- Browser-native zoom, find-in-page, print — the Electron menu's zoom items exist
  because browsers have this for free.

Five pieces of App-level state need re-homing under URL routing: the search
`navHint` (→ query params, an upgrade), `workspaceReturn` (→ browser back, but the
two "back" notions must be reconciled to one), `deletedSermonNotice` (a whole
summary object carried across a remount — needs a toast/flash store, not a URL),
`refreshKey` remount-to-refetch (→ router.refresh/revalidate, an upgrade), and the
`key={openSermonId}` remount that kills stale debounce timers (must be
deliberately re-established, §2.4).

### 4.2 Keyboard: collisions and the Cmd/Ctrl problem

The audit result is unusually clean: **the renderer defines zero Ctrl/Cmd
shortcuts** (grep for `metaKey|ctrlKey|altKey` across `src/`: no matches). The
app's keyboard surface is: Enter/Space on role-button divs, Escape to dismiss,
Tab-trap in dialogs, and the canvas's Tab/Enter/Backspace/Arrow grammar. The
Electron menu contributes only stock roles (undo/copy/paste/zoom/fullscreen) that
browsers provide natively. So the collision problem is small — but three items are
real:

1. **Ctrl+R / F5 / Cmd+W / tab-close are unsuppressible.** The desktop app closed
   the reload data-loss hole by deleting the accelerator (`electron/menu.js:1-12`)
   and blocks window close on failed flushes via an awaited ask/ack. A browser can
   do neither: `beforeunload` is fire-and-forget with uncustomizable copy. The
   honest mitigation is to make the hole not matter: shorter effective save
   latency (per-field patches on a ~800ms debounce are already small), a
   `sendBeacon`/`fetch(keepalive)` best-effort flush on `visibilitychange`/
   `pagehide`, an IndexedDB pending-patch buffer replayed on next load, and the
   generic `beforeunload` prompt only while the queue is non-empty.
2. **Ctrl+S reflex.** Pastors will hit it; the browser opens Save-Page. Intercept
   it, flush the debounce, and flash the existing "Saved" indicator — cheap and
   exactly the reassurance Mutation #3 wants.
3. **Canvas Tab-indent** works technically in browsers (preventDefault on a
   focused textarea) but breaks the universal "Tab moves focus" convention and is
   flagged by accessibility tooling; it also simply doesn't exist on the iOS
   software keyboard. Keep Tab on hardware keyboards, add visible indent/outdent
   controls on coarse pointers (§4.6).

Mac-vs-Windows Cmd/Ctrl: with no app-defined combos there is nothing to remap
today. Any *future* shortcuts must avoid browser-reserved combos (Ctrl/Cmd+T, W, N,
L, D can't be intercepted at all in most browsers).

Inherited a11y gap worth fixing during the port: EsvKeyModal, FeedbackForm,
FeedbackFlag, and OneDriveWarning's modals have Escape but no focus trap/restore
(only `useModalA11y` consumers have the full contract).

### 4.3 Latency: what stops being instant, and what keeps the surface immediate

Currently every read is a synchronous-SQLite round-trip measured in microseconds.
Becomes network-bound:

| Interaction | Today | Web pattern |
|---|---|---|
| Open a sermon (workspace mount) | ~instant | One aggregated fetch (sermon + series + sections + siblings + tags in a single payload); skeleton via the existing `LoadingState` vocabulary; prefetch on dashboard/list hover |
| Dashboard / lists / Planning grid | ~instant | RSC-rendered on navigation + SWR cache; `getSeriesSermonCounts` already avoids N+1 — keep that shape |
| Search-as-you-type | 200ms debounce → local LIKE | Same debounce (~250–300ms) → server query; results are small |
| Every save | ~0ms commit | Optimistic, debounced, backgrounded — already the architecture |
| Planner reorder / bulk-date | one sync transaction | Optimistic apply + server transaction + reconcile (already the pattern — `bulk-date-sermons` settles on returned DB truth) |
| ESV passage fetch | already networked | Server proxy + Postgres passage cache — likely *faster* than today's per-machine cold cache |

What stays instant with no work, because it never touched the DB per-interaction:
typing (local state is the truth while editing), chevron/map navigation (position
writes are debounced fire-and-forget), the summoned map and all completeness
weighting (pure derivation over the loaded row), N/A toggles, the reference pane.

The load-bearing rule to preserve: **the writing surface never blocks on the
network.** The current code already has this shape (optimistic `setSermon` merge →
background debounce → visible save state). The migration must resist any
"await-the-server-then-render" temptation in the workspace; the only awaited write
should remain the flush inside `beforePositionChange` and `requestLeave`, with the
same failed/unknown → "Keep working / Leave anyway" fork.

### 4.4 Autosave, revision history, and multi-device conflict — the hardest new problem

**The problem, precisely.** Today's save is: merge everything into one in-memory
sermon object, debounce 800ms, PUT *every writable column* (`pickSermonColumns`)
with no version check. Two devices with the same sermon open — iPad on the couch
Saturday, desktop Sunday morning, both left open — will each PUT their full stale
snapshot; whichever fires last silently erases every field the other edited,
including fields the winner never touched. This isn't an edge case in a two-device
world; it's the default outcome of leaving a tab open.

**Recommended design (in order; each step is independently shippable):**

1. **Narrow the writes: per-field patches instead of whole-row PUTs.**
   The mutation handlers (`useWorkspaceMutations`) already know exactly which
   column and which fieldKey/questionKey changed — they currently re-serialize the
   whole column anyway. Change the wire shape to
   `{column, path (fieldKey.questionKey or native key), value, baseRev}` and merge
   into JSONB **server-side, inside the row transaction**. This one change
   eliminates the "winner erases fields it never touched" failure completely: two
   devices editing *different questions* now compose instead of clobbering. It is
   the same fix the planner's `discovery` merge needs (§3.4) — one server-side
   JSON-merge discipline covers both.
   *Tradeoff:* the canvas and thought-unit writes are structural array writes, not
   scalar patches — patch at the granularity of `divisions.canvas` +
   `divisions.thought_units` as a unit (they're written atomically today by
   `setDivisionsCanvas`; keep that atomicity).
2. **Optimistic concurrency: a `rev` integer per sermon (and series/section).**
   Client sends `baseRev` with each patch batch. Server applies patches whose
   `(column, path)` was untouched since `baseRev` (the overwhelmingly common
   case); a patch targeting a path that *has* changed since `baseRev` is the only
   true conflict.
3. **Conflict policy: per-question last-write-wins, with the loser preserved.**
   For a two-user, essentially single-author-per-sermon product, interactive merge
   UI is over-engineering. On a true same-question conflict: apply the newer
   write, record the displaced value in the revision log, and surface a quiet,
   dismissible notice ("This answer was also edited on another device — view the
   other version"). Honest, cheap, and recoverable — which is the Mutation-contract
   posture (destruction visible and reversible, never silent).
4. **Revision history: an append-only `sermon_revisions` table**
   (`sermon_id, rev, author_id, at, patches JSONB`). This is the safety net that
   makes LWW acceptable, the undo story the desktop app never had (the current RPO
   is "one app launch" via a boot-time `.bak`), and the audit trail comments will
   later want. Compact old revisions periodically. This *replaces* the entire
   desktop backup/recovery apparatus (`.bak`, quarantine, legacy-path resolver)
   with Neon's PITR underneath it.
5. **Presence, not locks.** A lightweight heartbeat ("Ross is editing this sermon
   — opened 5 minutes ago") on the workspace and planner. Advisory only; no hard
   locks (a crashed tab must never strand a sermon). This handles the
   mentor/resident case socially rather than mechanically.
6. **Explicitly deferred:** CRDTs, OT, real-time co-editing, live cursors. Two
   users who mostly don't co-edit do not need Yjs; per-question granularity plus
   revisions covers the actual risk. Revisit only if simultaneous editing of the
   *same sermon* becomes a real workflow.

The save *indicator* contract (Mutation #3: saves visible, failures visible and
retryable, tri-state on exit) carries over verbatim and matters *more* on a
network — extend the vocabulary with an offline/queued state (§4.5).

### 4.5 Offline and flaky-network behavior — the honest floor

Moving off local-first means accepting: **this becomes a network application, and
the floor must be stated plainly rather than papered over.**

The recommended floor (degradation ladder):

1. **Typing never blocks and is never lost to a blip.** Local state remains the
   truth while editing; failed patch batches park in an IndexedDB queue (the web
   equivalent of the planner's `failedWritesRef`, but durable across a tab crash)
   and replay on reconnect/next load. The save indicator gains an honest third
   voice: "Saving… / Saved / **Offline — N changes waiting**" with retry.
2. **Reads require the network on first open.** A sermon you haven't loaded can't
   be opened offline. Full stop — say so in the product rather than half-promising.
3. **The pulpit case gets a deliberate answer, not an accident.** A pastor
   reviewing his manuscript Sunday morning on church Wi-Fi is the one
   offline-adjacent scenario that matters pastorally. Two cheap mitigations:
   the Word export (exists, becomes a download) and a read-only cached copy of the
   last-opened sermon (serialize the loaded row to IndexedDB on open; offer it,
   labeled as a possibly-stale reading copy, when offline). Both are far cheaper
   than sync.
4. **Explicitly out: full offline editing / PWA sync.** That is rebuilding
   local-first on top of a server — the exact complexity this migration abandons.
   If it ever becomes a requirement, it's a product pivot, not a feature.

Flaky-network specifics to design for: the 2000ms flush timeout in
`resolveSaveTransition` maps to "unknown" far more often on real networks — the
"unknown is spoken as uncertainty, never dressed as success" wording already ruled
for the desktop is exactly right and should survive; idempotency keys on patch
batches so a timeout-then-retry can't double-apply; `fetch(keepalive)` on
`pagehide` as the best-effort exit flush.

### 4.6 Responsive behavior: iPad and iPhone

**Where it stands:** one `@media (max-width: 980px)` rule in the entire app shell
(dashboard grid collapse) plus two workspace-CSS breakpoints; a fixed
260px sidebar with no collapse; `html, body, #root { overflow: hidden }` with all
scrolling delegated to inner panes; a 1024×700 minimum enforced by the
BrowserWindow; hover-only affordances throughout (row-arrow reveals, CSS tooltips,
`title=` attributes as the only hint in Calendar/Arc); `<datalist>` autocomplete
(effectively absent on iOS — and the TagInput comment calls it "the anti-drift
mechanism"); `PassagePopup` is mouse-drag + native corner-resize, both dead on
touch. **This is a desktop app that happens to be web-renderable, not a responsive
app.**

**Recommendation: three explicit tiers, not one fluid layout.**

- **Desktop (≥~1024px):** current layout, preserved.
- **iPad (~768–1024px): full editing, deliberately adapted.** Sidebar collapses to
  an overlay/hamburger; the writing surface's reference pane becomes a
  toggle/stack instead of a fixed left column (a breakpoint already starts this at
  1100px); the fixed bottom chrome (Back/Next, Map, Notebook summons) must respect
  the software keyboard via `visualViewport` (fixed-position elements sit under
  the iOS keyboard otherwise) and `100dvh`; canvas gains visible indent/outdent
  buttons under `pointer: coarse`; PassagePopup becomes a sheet on touch.
- **iPhone (<~768px): reading and review, not the full walk.** The honest call:
  the walk (reference pane + stacked prompts + canvas) is a two-pane writing
  environment that does not compress to 375px, and pretending otherwise produces
  the "train wreck" class of failure. Ship a deliberate phone experience: read
  the manuscript/outline, browse the map and completeness, read the study guide,
  review/comment (future), light edits to single text prompts. Frame it as a
  designed mode, not a degraded one.

Cross-cutting touch work: replace hover-reveals with always-visible-on-coarse
affordances; replace `title=` hints with visible text or tap-targets; replace
`<datalist>` with the house autocomplete pattern; audit the three inline
Enter/Space re-implementations in Dashboard onto `buttonKeydown`.

### 4.7 Safari/WebKit: contenteditable, selection, and IME risk

**The exposure is structurally low, and this is worth stating as a finding:**
because the editor is textareas, the classic Safari editor-killers —
contenteditable selection drift, `beforeinput` divergence, IME composition events
inside custom DOM mutation, `Selection`/`Range` bugs — mostly don't apply. What
the app actually uses is `setSelectionRange` on textarea/input (universally
solid, and already wrapped in try/catch), `scrollIntoView({behavior:"smooth"})`,
and keydown interception on focused textareas. All fine on WebKit.

The real WebKit/iOS risk list, ranked:

1. **Keyboard occlusion + viewport units.** `100vh`+`overflow:hidden` shell vs.
   iOS dynamic toolbars and the software keyboard covering fixed bottom chrome.
   Known, well-mapped problem (`100dvh`, `visualViewport` listeners); it is
   layout work, not mystery debugging — but it must be done or the writing
   surface's own Next button is unreachable mid-edit on iPad.
2. **Programmatic focus chains.** PassageCanvas moves focus between rows after
   Enter/merge (`focusNextRef` effect). iOS only reliably honors `.focus()`
   within a user-gesture call stack; a focus applied in a post-state-update
   effect can drop the keyboard. Needs real-device verification; the fallback
   (keyboard stays up, caret placed on next tap) is degraded but not
   data-destructive.
3. **IME composition.** The canvas keydown handlers don't check `e.isComposing` —
   Enter/Backspace during composition would fire the structural handlers
   mid-composition. One-line guards; fix during the port regardless of user base.
4. **Autocorrect/autocapitalize defaults.** Mobile Safari will autocorrect and
   capitalize in every textarea — probably *desired* for prose fields, probably
   *not* for the verse-gutter input (already char-filtered) or chapter:verse
   fields (`inputmode`/`autocapitalize` attributes to set deliberately).
5. **Escape-in-fullscreen** and `<datalist>` absence — covered above.

**Testing from Windows:**
- **CI tier:** Playwright WebKit for the writing-surface interaction suite
  (typing, canvas grammar, dialog traps, save-state transitions). Be honest about
  its limits: Playwright's WebKit is the engine, not Safari — no real iOS
  keyboard, no real IME pipeline, different text-input internals. It catches
  layout and logic regressions, not input-quirk regressions.
- **Real-device tier:** BrowserStack/LambdaTest for real iPhone/iPad Safari on the
  handful of flows that matter (open sermon → type in canvas → background the tab
  → return → verify save state; the keyboard-occlusion layout), or — given two
  known users who both presumably own iPads — a standing manual smoke checklist
  in the house style (`docs/REFERENCE/release-smoke.md` is the template).
  Recommendation: real hardware for the writing surface before first use on iPad;
  cloud devices for regression thereafter.

---

## 5. Auth and multi-user

### 5.1 Recommendation

Two named users (Ross + a pastoral resident), future draft-plus-inline-comment
collaboration.

- **Provider:** match the C3 Ops convention — *assumption flagged: this
  exploration did not have access to C3 Ops, so its auth choice is unknown.*
  Absent that constraint: Clerk (fits the Vercel/Neon stack, hosted UI, invite
  flow for exactly-two-users, free tier covers this) over hand-rolled Auth.js —
  the tradeoff is a third-party dependency for auth UI you don't have to build or
  secure. Either way, **no self-managed passwords** (the desktop app's prohibition
  on credential handling is worth keeping in spirit).
- **No organizations/tenancy layer now.** A `users` table (or provider IDs as
  strings) and an `owner_id` column is the whole model. Adding a workspace/org
  table for two users is the over-engineering the house style warns against.

### 5.2 What the data model needs *now* (cheap insurance, painful later)

1. **`owner_id` on every root row** — `series`, `sermons`, `calendar_notes` — set
   non-null from day one, backfilled to Ross's id at import. Retrofitting
   ownership after rows exist without it is the classic painful migration; this is
   one column per table now.
2. **Keep the existing ID scheme.** IDs are already TEXT/UUIDs everywhere
   (Prisma `String @id`); the import can preserve them, and every cross-reference
   (outline point UUIDs, canvas row ids, section/sermon FKs) survives intact.
3. **`rev` + `sermon_revisions` with `author_id`** (§4.4) — this is *also* the
   multi-user substrate: who-changed-what falls out of the conflict design for
   free.
4. **A minimal grant table for the mentoring case:**
   `sermon_shares (sermon_id, user_id, role ∈ viewer|commenter)` — or at series
   granularity if the resident reviews whole series. Tiny now; retrofitting
   sharing *semantics* later is easy, but designing queries that never assumed
   "all rows are mine" is much easier done at the start (every list/search
   query scoped `owner_id = me OR shared-with-me` from day one).
5. **Per-user prefs table** replacing `settings` + the localStorage scatter
   (`user_prefs (user_id, key, value)`): theme, planner tab memory, intro-seen
   flags, discover step, reference-pane collapse.
6. **Sample seeds become per-user.** The `sample-%` id-prefix filter is currently
   a global hack across every list and search query; replace with an
   `is_sample boolean` column and per-user seeding — this deletes a whole class
   of `NOT LIKE 'sample-%'` predicates (and the half-landed field-primitives chip
   noted in project memory).

### 5.3 The comment-anchoring finding (why inline comments are cheap later)

The walk's addressing scheme is already a complete, stable coordinate system:
`stage/subPhase/fieldKey/questionKey` for every prompt, canvas row UUIDs for
passage-structure lines, outline point UUIDs for points/elements/transitions,
thought-unit row ids for table cells. **A future
`comments (id, sermon_id, author_id, anchor, body, resolved_at)` table can anchor
to any of these with zero editor infrastructure** — per-question comments are what
a structured walk wants anyway (comment on "the MPS tighten answer," not on
characters 47–112). This is a direct consequence of the §2.5 recommendation: an
editor framework is *not* required for the collaboration future either.

### 5.4 Explicitly deferred

Real-time co-editing and cursors; roles beyond owner/viewer-commenter;
organizations; notification/inbox machinery; public/read-only share links
(worth a thought later for congregational study guides — the guide is already a
projection that would make a nice public page — but out of scope now).

---

## 6. What you didn't ask about, and where the premises need pushback

1. **This migration repeals constitutional law, and that should be done in
   writing, not implied by a deploy.** `docs/CORE.md` — "No backend. Local-first
   only. No web API, no server process, no remote storage" — is the *first*
   non-negotiable architectural boundary, and `docs/REFERENCE/privacy.md` promises
   in bold that "your sermon content never leaves it [your machine]." The
   userData-path permanence clause, the RPO ruling, the exit-seam invariants —
   a large fraction of CORE's boundary section describes the architecture being
   abandoned. Before implementation: a CORE amendment (the existing
   CORE-CHANGELOG discipline is built for exactly this), a rewritten privacy
   document (what the server stores, who can read it, Neon's role), and a decision
   about what the *desktop* app's promise means for its existing users.
2. **The desktop app doesn't disappear by itself.** v1.2.2 is live with
   auto-update and public download buttons on teamofoxen.com. Coexist, freeze, or
   sunset is a product decision this document can't make — but note the cost of
   coexistence honestly: every walk/content change would need shipping twice, and
   the two-mirror discipline this codebase already fights (contracts, study-guide
   model) would become a two-*product* discipline. Recommendation: freeze the
   desktop app at a final version with an export path once the web app reaches
   parity; don't run two.
3. **Data migration is real but small.** A one-time importer: read
   `sermonforge.db` (sermons/series/sections/calendar_notes), map TEXT→JSONB,
   preserve IDs, stamp `owner_id`. The JSON envelopes import as-is. Legacy columns
   (§3.1) get dropped, not migrated. The importer is a script, not a product
   feature — two users, run it twice.
4. **ESV licensing changes shape.** Today each install brings its own Crossway
   key; a hosted app serving passages through one server key to multiple users is
   a different licensing posture (per-application terms, caching limits,
   attribution requirements). *Unknown flagged: this exploration did not verify
   Crossway's current API terms.* Verify before building the proxy; the fallback
   (each user enters a key, stored server-side per-user) preserves today's posture
   at the cost of the setup friction the desktop app already has.
5. **Where the premise needed correction:** "local full-text search was never
   live" is half right. The *theology/corpus* stack was never live (confirmed:
   zero consumers). But **sermon-library search is live** in two surfaces with
   deep-link landing — the dead thing is its local *index machinery*, not the
   feature. This document treats the feature as retained (server-side) and the
   machinery as deleted (§1.4). If the intent was to drop sermon search entirely,
   that's a product decision to state explicitly — it would orphan
   `SearchResultSnippet`, `searchHints`, and the navHint landing flow.
6. **The test suite loses coverage exactly where the new risk is.** The
   persistence/exit-seam/packaging tests (~a third of the suite) die with the
   desktop model; the new risk (patch merge, concurrency, revisions) needs new
   tests of the same discipline — the existing `atomic-mutations` failure-injection
   pattern is the right template, rebuilt against Postgres (Neon branch databases
   or testcontainers).
7. **Two small parity notes for the port:** the pre-Pilot-B lint rules
   (`no-direct-ai`, `canonical-stage-name` in the local eslint plugin) port
   trivially and should — they're grammar enforcement, not Electron; and
   `import.meta.glob` (portraits) is Vite-only and needs a static import map in
   Next.

---

## 7. Hard problems, ranked

1. **Multi-device autosave and conflict.** Whole-row LWW must become per-field
   patches + `rev` + server-side JSON merge + revision log (§4.4). Everything
   else in the migration can be done incrementally; shipping without this is
   shipping a data-loss generator to a two-device user.
2. **The exit seam.** The browser restores every data-loss exit the desktop app
   painstakingly closed (Ctrl+R deleted from the menu, awaited close-flush,
   native quit dialog). Not solvable by porting — solvable by making the window
   of loss small and durable (short-debounce patches, IndexedDB queue,
   keepalive flush, `beforeunload` only when dirty) (§4.2, §4.5).
3. **Offline floor and the flaky-network save vocabulary.** Deciding — and
   stating — what the app honestly does on church Wi-Fi, and extending the
   save-state contract with a queued/offline voice plus idempotent retries
   (§4.5).
4. **Responsive rebuild for iPad (edit) and iPhone (review).** A fixed
   1024×700 shell with one media query, hover-only affordances, keyboard-occluded
   fixed chrome, dead datalist, and a mouse-only PassagePopup. Real design work,
   tiered deliberately (§4.6).
5. **Planner concurrency.** Renderer-side `discovery` merges, no optimistic
   concurrency, the Section-1 race, the `end_date` dual-writer, whole-list
   reorders (§3.4). Bounded and mechanical, but it's ~six distinct fixes.
6. **Constitutional and trust rework.** CORE amendment, privacy rewrite, desktop
   coexistence decision, ESV licensing verification (§6). Not engineering-hard;
   consequence-hard.
7. **Routing re-cut.** VIEW enum → URL tree is mostly free wins, but five pieces
   of App state (navHint, workspaceReturn, deletedSermonNotice, refreshKey, the
   sermon-keyed remount) each need a deliberate new home (§4.1).
8. **Test regeneration at the persistence seam.** Two-thirds transfers; the third
   that doesn't is exactly where the new failure modes live (§6.6).

Deliberately *not* on this list: the editor (no rebuild needed, §2.5), search
(straight replacement, §1.2), exports (docx runs server-side), theming, fonts,
the walk content, and the invisible system (two columns + pure functions).

---

## 8. Deletes

Everything below goes away entirely in the web app (it may of course persist in
the desktop app's history/branch for as long as that ships).

**Corpora / local-search stacks (dead requirements — §1.4):**
- `electron/embedder/` (host.js, worker.js)
- Theology handlers + helpers in `electron/main.js` (~360–416, ~451–473, ~908–1170)
- `resources/models/` (bundled MiniLM ONNX model), `scripts/theology/`,
  `scripts/smoke-embedder-worker.js`, `corpus/`, `theology.db` (519 MB)
- `sermon_search` table + all indexer/snippet/query machinery in
  `electron/persistence.cjs` and `electron/main.js`
- Dependencies: `@xenova/transformers`, `sqlite-vec`, `better-sqlite3`,
  `onnxruntime-node` (transitive), `mammoth` (already unused at runtime)

**The Electron shell, wholesale:**
- `electron/main.js`, `electron/preload.js`, `electron/config.js`,
  `electron/keystore.js`, `electron/logger.js`, `electron/updater.js`,
  `electron/menu.js`, `electron/loading.html`, `electron/dbMigration.js`,
  `electron/dbRecovery.cjs`, `electron/saveTransition.cjs`,
  `electron/crosswayFetch.cjs` (logic reused server-side, module deleted)
- The mirror modules that exist only for the CJS/ESM boundary:
  `electron/contracts.cjs`, `electron/studyGuideModel.cjs`
- `electron/telemetry/bus.js` buffering machinery (~90% of it),
  `electron/telemetry/queueSweep.js`, `tester-id.txt` identity
- The SQLite migration ladder (v1–v34), `assertSchemaContract`, `safeAlter`,
  the boot backup/quarantine/legacy-resolver apparatus, `legacyDbPaths`, WAL
  checkpointing — all replaced by Prisma migrations + Neon PITR
- The close-flush ask/ack (`app-flush-edits` / `flushEditsDone`),
  `src/utils/closeFlush.js` in its current form, the single-instance lock
- `electron-updater`, `electron-builder`, `electron` deps; the entire
  `package.json` build block (NSIS, mac notarization, asarUnpack,
  extraResources); `C:/Projects/SermonForgeBuilds` as a concept

**Components and modules:**
- `src/components/OneDriveWarning.jsx` (all five warning kinds are local-file
  concerns; keep the *slot* — a global startup-notice host — for server notices)
- `src/components/SetupScreen.jsx` + `src/components/EsvKeyModal.jsx` in current
  form (replaced by auth onboarding + server key; if per-user ESV keys survive
  licensing review, a much smaller settings row replaces them)
- `src/components/Archive.jsx` (dead re-export shim, nothing imports it)
- `src/components/DeleteButton.jsx` (shim — repoint the two consumers at the
  primitive)
- `src/components/SynthesisTable.jsx` + its test (orphan — imported only by its
  own test; the writing surface has its own inline implementation)
- `src/datasets/churchHistory.js` (imported by nothing)
- Updater UI in `src/components/Sidebar.jsx` (the update-ready block)
- The browser-preview fake-success seams: the Proxy stub in
  `src/db/database.js`, `browserPreviewMock` in `src/core/spine.ts`, the
  `BridgeError` guard in `src/main.jsx`, and the `_fixture` write short-circuits
  (fixtures themselves can stay as dev routes, but they must stop *pretending
  writes succeeded*)
- The `sample-%` id-prefix filtering scattered across list/search queries
  (replaced by an `is_sample` column, §5.2)

**Schema (do not port):**
- All retired/backup columns listed in §3.1 (seven on `series`, the dead
  AI-era and Delivery-era columns on `sermons`)
- `sermon_search` (above), `meta` (schema_version — Prisma owns this), and
  `settings` in current form (→ per-user prefs)

**Law and docs that describe the deleted architecture** (amend, don't silently
orphan — §6.1): the local-first/no-backend boundaries and userData-path clause in
`docs/CORE.md`, `docs/REFERENCE/privacy.md`, `docs/SYSTEMS/database.md`,
`docs/SYSTEMS/ipc.md`, `docs/PROPOSALS/distribution.md`, and the
distribution/packaging test files named in §1.1's test inventory.
