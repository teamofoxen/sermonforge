# SermonForge Web v1 — Design

> **Status: design document only.** Written 2026-07-24 against the tree at `260ec6a`,
> as the follow-up to [`docs/web-migration-exploration.md`](web-migration-exploration.md).
> That report's findings stand except where the locked decisions override them
> (desktop-only v1; Electron retired; no sermon import; sermons never shared; series
> multi-user later; library search killed; Google Workspace sign-in + allowlist;
> textarea surface stays; corpus/search stacks confirmed not inherited; exports to a
> shared drive via the C3 Ops Google wiring). Nothing here authorizes implementation.
>
> Line numbers cite the current tree and were verified during this design pass.
>
> **Rulings applied 2026-07-24:** deletion promise settled at 24-hour Neon PITR
> retention (§C.3); shared-drive readability accepted as the boundary (§E.4, §F.3);
> the "Discard this preparation" door added beside the archive door, both confirms
> written in full (§C.2); the archive confirm's "what stays" list names the
> study-guide fields (§C.2); the workspace/planner slot-write race named as a
> dedicated test case (§D.1); desktop retirement plan stated — no final release
> (§G); `thresholdsSeen` carries across work generations (§B, §C.1); the 409 path
> reduced to two buttons and the comparison viewer cut (§D.3); the client-side
> export fallback cut (§F.6); idempotency moved to a stored UUID on `WorkRevision`
> (§B, §D.1, §D.2); the `notebookAssembly` rename settled (§B); §H reduced to
> genuine unknowns.
>
> **Corrections applied 2026-07-24 (same day):** planner 409 vocabulary aligned to
> the two-button keep-mine/discard-mine fork, comparison-view residue swept
> (§D.3); the export gate reframed as door-labeling, not protection (§C.2); a
> print stylesheet added as the broken-save escape hatch, explicitly not the
> archive (§F.6).

---

## A. The seam, verified

The prior report's claim — "the planner touches a narrow named slice of the sermons
table and everything else is workspace-owned" — was re-verified column by column,
this time specifically hunting for slot-side surfaces that reach into work-side
columns. **The seam is clean. Cleaner than it looked, in fact, because the one
suspicious surface (search previews) is being killed by decision 6.**

The four readers most likely to break the split, checked in code:

- **Study-guide export** (`buildStudyGuideDoc`, `electron/main.js:1234-1421` — read
  in full this pass): reads series `title/passage_range/start_date/end_date/
  big_idea/overview/structural_outline/color`, section `title/passage_range/
  big_idea/overview`, and sermon `passage/title/date/big_idea/overview/
  study_guide_extras` (`sermonPage`, main.js:1293-1351). **Zero work columns.**
  The booklet is a pure slot projection; it survives work deletion untouched.
- **Schedule ordering** (`seriesSermonOrderBy`, `electron/persistence.cjs:1104-1110`):
  `date`, section `sort_order`, sermon `sort_order`, `created_at`. All slot.
- **Coverage / pacing / Arc**: `coverage.js` reads `passage` strings clamped by
  `series.passage_range`; `pacing.js` reads dates + calendar notes;
  `arc.js:27-43` reads `book_id`/`canon_category`/dates (verified this pass —
  `unitOf`/`effectiveBookId` touch nothing work-side). All slot.
- **Dashboard resume rows** (`Dashboard.jsx:334-407`, read in full this pass):
  displays `title/passage/date/series_title` only. The *query*
  (`get-in-progress-sermons`, `persistence.cjs:1377-1387`) filters on
  `stage = 'in_progress'` — a slot lifecycle read. No position or content columns
  reach any list surface. (The old search previews did — dead with decision 6.)

**Column-by-column disposition of `sermons` (schema v34):**

| Disposition | Columns |
|---|---|
| **SLOT** (durable, planner-owned, survives work deletion) | `id`, `series_id`, `section_id`, `title`, `passage`, `book_id`, `date`, `sort_order`, `big_idea`, `overview`, `study_guide_extras`, `discovery`, `tags`, `stage` (lifecycle → becomes `preachedAt`), `deleted_at` (slot soft-delete), `created_at`, `updated_at` |
| **WORK** (transient, workspace-owned, deletable) | `observations`, `interpretation`, `redemptive_thread`, `implications`, `main_point_pair`, `outline`, `functional_elements`, `manuscript`, `notebook_study`, `notebook_blueprint`, `notebook_manuscript`, `last_touched_position`, `thresholds_seen` |
| **DEAD** (do not port — verified no live reader) | `mpt`/`mps` (flat mirrors, write-only via legacy `apply-mutation`), `sermon_frame`, `delivery_notes`, `timing_notes`, `preaching_blocks`, `manuscript_delivery`, `last_tune_up`, `study_guide_note`, `post_sermon`, `checklist`, `preacher`, `is_one_off` (derivable from `series_id IS NULL`; only writer is the create default, `spine.ts:93-110`), **and the five position-duplicate columns**: `current_stage`, `current_sub_phase`, `last_study_subphase`, `last_assembly_subphase`, `last_manuscript_subphase` — grep across `src/` finds no reader outside fixtures, comments, and the allowlists; `deriveCurrentPositionFromSermon` reads `last_touched_position` alone (`sermonState.js`), so one position column suffices |

**Four deliberate classification calls (the genuinely ambiguous ones):**

1. **`tags` → SLOT**, even though it's *authored* in the workspace (the Topics row,
   `SermonWorkspace.jsx:613-621`). Its consumers are durable-lens surfaces
   (`TopicsView`, `get-all-tags` autocomplete) that must keep working after the
   work is deleted — "what I've preached" outlives the prep.
2. **`title` → SLOT**, though the walk's terminal Sermon Title field writes it.
   The workspace legitimately writes *slot* fields in three places — title, tags,
   and mark-preached — so the workspace needs a slot-write path alongside the work
   PUT. This is a seam-crossing **write**, not a seam violation; the columns
   themselves are cleanly slot-side. (Design consequence in §D.)
3. **`discovery` (on sermons) → SLOT.** It's Discover-walk reasoning about the
   preaching *text* — planner data about the slot, not sermon prep content.
4. **`study_guide_extras` → SLOT.** Guide-local, planner-owned, feeds the booklet.

**The one place the split is load-bearing and was worth the paranoia:** the
manuscript Word export reads work columns — which is fine, because export is the
last act *of* the work. But `CompletedSermons.jsx:82-113` currently offers "Export
to Word" on every preached sermon by refetching the full row. Once work is
deletable, that button must give way to the Drive link for slots whose work is
gone (§C).

**Bottom line for A:** no slot-side surface reads work-side data. The split holds
with no schema contortions.

---

## B. Schema

Prisma schema for v1. Conventions: ids are `cuid()` strings; all dates that mean
"a day on the preaching calendar" are `String` in `YYYY-MM-DD` form (the app's
existing discipline — lexicographic compare, no timezone drift; the tradeoff is no
DB-level date arithmetic, which nothing needs); JSON envelopes become real `Json`
columns (the renderer's `JSON.stringify`-into-TEXT layer and the string-vs-object
`STRUCTURED_FIELDS` dual handling both delete); every mutable entity carries `rev`
for the §D/§E write discipline.

```prisma
// ── Identity ────────────────────────────────────────────────────────────────
// Google Workspace sign-in; membership is a hardcoded allowlist of 2–3 addresses
// checked at sign-in (see §F on why Drive authorization is NOT modeled here).

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  googleSub     String   @unique          // Google's stable subject id
  name          String?
  createdAt     DateTime @default(now())

  prefs         UserPref[]
  series        Series[]
  slots         SermonSlot[]
  work          SermonWork[]
  calendarNotes CalendarNote[]
  exports       ExportRecord[]
  workDeletions WorkDeletion[]
  revisions     WorkRevision[]
}

model UserPref {
  userId String
  key    String                            // e.g. "theme", "planner_tab:<seriesId>"
  value  String
  user   User   @relation(fields: [userId], references: [id])

  @@id([userId, key])
}

// ── Planner (durable) ───────────────────────────────────────────────────────

enum SeriesKind   { BOOK  TOPICAL }
enum SeriesStatus { IN_PROGRESS  COMPLETE }

model Series {
  id                String       @id @default(cuid())
  ownerId           String                 // creator; future collaborators arrive
  owner             User         @relation(fields: [ownerId], references: [id])
  rev               Int          @default(0)

  title             String
  kind              SeriesKind   @default(BOOK)
  status            SeriesStatus @default(IN_PROGRESS)
  color             String?
  year              Int?
  description       String?
  bigIdea           String?
  overview          String?
  passageRange      String?
  startDate         String?                // YYYY-MM-DD
  endDate           String?                // DERIVED — single writer: the server,
                                           // recomputed inside every date-affecting
                                           // transaction (§E fix 3). Never client-set.
  structuralOutline String?
  canonCategory     String?                // Dever 7-genre key
  bookId            String?                // key into canonicalBooks
  discovery         Json?                  // flat envelope; merged SERVER-SIDE (§E fix 1)

  sections          SeriesSection[]
  slots             SermonSlot[]
  exports           ExportRecord[]         // study-guide exports attach here
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  // NOT modeled in v1, arrives additively in v2 (§E):
  // model SeriesCollaborator { seriesId, userId, addedAt } — no v1 table to tear up.
}

model SeriesSection {
  id           String   @id @default(cuid())
  seriesId     String
  series       Series   @relation(fields: [seriesId], references: [id])
  rev          Int      @default(0)

  title        String?
  passageRange String?
  bigIdea      String?
  overview     String?
  sortOrder    Int
  discovery    Json?                       // { whyBegin, whyEnd } — server-merged

  slots        SermonSlot[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([seriesId, sortOrder])
}

// ── The slot (durable) ──────────────────────────────────────────────────────

model SermonSlot {
  id               String         @id @default(cuid())
  ownerId          String                  // creator (standalone) / planner author
  owner            User           @relation(fields: [ownerId], references: [id])
  rev              Int            @default(0)

  seriesId         String?                 // NULL = standalone (replaces is_one_off)
  series           Series?        @relation(fields: [seriesId], references: [id])
  sectionId        String?
  section          SeriesSection? @relation(fields: [sectionId], references: [id])

  title            String                  // working title; never empty (State #3)
  passage          String?
  bookId           String?                 // topical per-sermon book
  date             String?                 // YYYY-MM-DD — the Sunday
  sortOrder        Int?                    // topical flat-list order
  bigIdea          String?
  overview         String?                 // study guide's per-sermon commentary
  studyGuideExtras Json?                   // { additions, notesLines }
  discovery        Json?                   // preaching-text reasoning — server-merged
  tags             String[]       @default([])   // durable "what I've preached" lens

  preachedAt       DateTime?               // lifecycle: null = not preached.
                                           // Replaces stage IN_PROGRESS|COMPLETE;
                                           // "Reopen" nulls it (§C).
  deletedAt        DateTime?               // slot soft-delete tombstone + Undo

  workGeneration   Int            @default(0)   // count of work cycles EVER STARTED.
                                                // 0 = never worked. Incremented in the
                                                // start-work transaction; never reused.
  work             SermonWork?
  workDeletions    WorkDeletion[]
  exports          ExportRecord[]

  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([seriesId, sectionId])
  @@index([ownerId, preachedAt])
}

// ── The work (transient, private, deletable) ────────────────────────────────
// At most one live work per slot (1:1). generation stamps WHICH cycle this is;
// every write, revision, export, and deletion carries it, so artifacts from a
// prior cycle can never be confused with a later one.

model SermonWork {
  slotId              String     @id
  slot                SermonSlot @relation(fields: [slotId], references: [id])
  ownerId             String                // the PRIVATE author — enforced in §E.4
  owner               User       @relation(fields: [ownerId], references: [id])
  generation          Int                   // == slot.workGeneration at creation
  rev                 Int        @default(0)

  observations        Json?
  interpretation      Json?
  redemptiveThread    Json?
  implications        Json?
  mainPointPair       Json?
  outline             Json?                 // [{id,text}] — point UUIDs still the join key
  functionalElements  Json?                 // keyed by outline point id
  manuscript          Json?                 // { introduction, transitions, conclusion }
  notebookStudy       String?
  notebookAssembly    String?               // renamed from notebook_blueprint (settled:
                                            // no imported data exists, so the
                                            // pre-restructure name dies here)
  notebookManuscript  String?
  lastTouchedPosition String?               // "Stage/SubPhase/FieldKey" — the ONE
                                            // position column (five dead duplicates
                                            // dropped, §A)
  thresholdsSeen      Json       @default("[]")   // seeded from the slot's most recent
                                                  // WorkDeletion on re-work (§C.1) —
                                                  // re-preaching doesn't re-teach

  startedAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt
}

// ── Revisions (append-only while work lives; PURGED with the work) ──────────
// One row per ACCEPTED work write. Stores only the columns that write changed
// (post-images), not the whole row — rev 0 is the full genesis snapshot, so any
// historical state reconstructs by replay within a generation. This bounds write
// amplification (a 2-hour typing session logs deltas, not 1,000 full copies).
// Tradeoff: point-in-time reads require replay; acceptable for a rescue/undo log
// that is not a user-facing history surface in v1.

model WorkRevision {
  id             BigInt   @id @default(autoincrement())
  slotId         String
  generation     Int
  rev            Int                        // the rev this write PRODUCED
  authorId       String
  author         User     @relation(fields: [authorId], references: [id])
  idempotencyKey String?  @unique           // client-stamped per write; a network retry
                                            // is detected by direct lookup (§D.2).
                                            // Null only on the server-created genesis row.
  changedColumns Json                       // { columnName: newValue, ... } — CONTENT-BEARING:
                                            // deletion purges these rows (§C)
  at             DateTime @default(now())

  @@unique([slotId, generation, rev])
  @@index([slotId, generation])
}

// ── Deletion history (metadata ONLY — no content fields, ever) ──────────────

model WorkDeletion {
  id                String   @id @default(cuid())
  slotId            String
  slot              SermonSlot @relation(fields: [slotId], references: [id])
  generation        Int                     // which cycle was purged
  deletedById       String
  deletedBy         User     @relation(fields: [deletedById], references: [id])
  deletedAt         DateTime @default(now())
  gatingExportId    String?                 // archive door: the VERIFIED manuscript
                                            // export that unlocked the delete.
                                            // NULL = the discard door (§C.2) — no
                                            // export gated this purge.
  revisionsPurged   Int                     // audit count, not content
  thresholdsSeen    Json     @default("[]") // the purged work's walk-orientation flags,
                                            // carried into the next generation (§C.1).
                                            // Threshold ids only — never content.

  @@index([slotId])
}

// ── Exports ─────────────────────────────────────────────────────────────────
// Metadata only — file identity, location, verification. NO sermon content and
// no document bytes are ever stored here ("export metadata may remain; sermon
// content may not"). slotId XOR seriesId (manuscripts attach to a slot+generation,
// study guides to a series) — Prisma can't express XOR; enforced by a raw CHECK
// constraint in the migration and validated at the API.

enum ExportKind   { MANUSCRIPT  STUDY_GUIDE }
enum ExportStatus { PENDING  UPLOADED  VERIFIED  FAILED }

model ExportRecord {
  id            String       @id @default(cuid())
  kind          ExportKind
  status        ExportStatus @default(PENDING)

  slotId        String?                     // MANUSCRIPT exports
  slot          SermonSlot?  @relation(fields: [slotId], references: [id])
  generation    Int?                        // work generation exported (MANUSCRIPT)
  workRev       Int?                        // work.rev AT EXPORT TIME — the staleness
                                            // guard that gates deletion (§C)
  seriesId      String?                     // STUDY_GUIDE exports
  series        Series?      @relation(fields: [seriesId], references: [id])

  driveFileId   String?
  webViewLink   String?
  fileName      String
  byteSize      Int?
  md5           String?                     // our hash of the generated .docx
  driveMd5      String?                     // Drive's reported checksum (must match)
  error         String?

  requestedById String
  requestedBy   User         @relation(fields: [requestedById], references: [id])
  createdAt     DateTime     @default(now())
  verifiedAt    DateTime?

  @@index([slotId, generation])
  @@index([seriesId])
}

// ── Calendar notes ──────────────────────────────────────────────────────────

model CalendarNote {
  id        String   @id @default(cuid())
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  date      String                          // YYYY-MM-DD
  type      String                          // holiday | guest | break | special
  label     String
  notes     String?
  createdAt DateTime @default(now())

  @@index([ownerId, date])
}
```

**How work generations prevent cross-cycle confusion (the invariant, mechanically):**

- `slot.workGeneration` is a monotonic counter, incremented in the same transaction
  that creates a `SermonWork` row; the work, every `WorkRevision`, every manuscript
  `ExportRecord`, and every `WorkDeletion` carry that generation number. The new
  work row is seeded with `thresholdsSeen` from the slot's most recent
  `WorkDeletion` (empty for a first generation) — orientation flags survive the
  cycle; content does not.
- A work write must present the generation it believes is live
  (`§D` wire shape); a browser tab left open across a delete-and-rework cycle
  sends generation *n* against live generation *n+1* and is **rejected** — a stale
  tab can never resurrect purged content into a new cycle.
- Deletion purges exactly `(slotId, generation)` — revisions from generation *n*
  cannot survive into *n+1* because *n+1*'s rows are stamped differently and *n*'s
  are gone.
- Exports keep their generation forever, so "the manuscript in Drive from the 2027
  rework" and "the one from 2026" are distinct records pointing at distinct Drive
  files (§F re-export rules).

**Dropped relative to today's schema** (beyond §A's dead list): the `sermon_search`
table, `meta` (Prisma owns schema state), `settings` (→ `UserPref`), the
`sample-%` id-prefix convention (v1 ships no sample seeds — two known users don't
need the worked example; if that's wrong, an `isSample Boolean` column is the
clean re-add), and all fail-soft legacy-shape parsing (no import → no legacy data:
the "JSON or legacy plain text" branches in `parseStructuredField`, the numeric-key
`functional_elements` warning, and every `sermon_frame` mention die).

---

## C. Lifecycle and deletion

### C.1 The state model: four orthogonal facts, not one enum

The invariant warns against collapsing lifecycle, work presence, export
verification, and deletion history into one enum unless that model is coherent.
**It is not coherent, and here is the argument:** the four facts are independently
true or false in nearly every combination. A sermon can be *preached* with work
*present* and export *unverified* (preached Sunday, forgot to export). It can be
*unpreached* with work *deleted* (prepped, exported, archived, then the guest
preacher took the date). It can be *preached, archived, and being worked again*
(generation 2 open for a re-preach). A single enum must either enumerate the
product space (2 lifecycle × 3 work × 3 export × deletion-history ≈ dozens of
named states, most meaningless) or collapse distinctions the UI genuinely renders
differently — and every writer of the enum becomes a hazard to every reader. The
house already has the right pattern for this: `deriveSermonCompleteness` — store
facts, derive display.

The four stored facts:

| Fact | Storage | Values |
|---|---|---|
| Slot lifecycle | `slot.preachedAt` (+ `slot.deletedAt` for slot soft-delete) | not preached / preached (timestamped) |
| Work presence | `slot.workGeneration` + existence of `SermonWork` row | never worked / in preparation / worked-then-removed |
| Export verification | latest `ExportRecord(kind=MANUSCRIPT, slotId, generation=current)` | none / pending / verified / failed — **and fresh only if `workRev == work.rev`** |
| Deletion history | `WorkDeletion` rows | append-only metadata |

One pure function — `deriveSlotDisplayState(slot, work, latestExport)` — maps those
to what the UI shows. The derived states and their surfaces:

| State (derived) | Condition | What the pastor sees |
|---|---|---|
| **Not started** | no work, `workGeneration == 0` | Planner: "Build this sermon". Dashboard: not listed under Resume. |
| **In preparation** | work exists | "Continue — Study · Interpret" (position label from `lastTouchedPosition`). Dashboard Resume lists it. |
| **Prepared** | work exists + verified *fresh* export | Same as above, plus the Finish screen now offers **Delete the work** — the archive door (C.2). |
| **Preached** | `preachedAt` set (orthogonal — combines with any work state) | Preached list; Calendar chip settles. |
| **Archived** | no work, `workGeneration > 0` | Archive-door deletion: "Prepared and archived — manuscript in Drive [open]. Work removed <date>." Discard-door deletion: "Work discarded <date>" — no Drive link. Both: **Work it again**. The walk does not open; there is nothing to open. |

Whenever work exists — exported or not — the **discard door** (C.2) is also
reachable from the Finish screen as a quiet secondary action; it is the abandon
path, not the archive path, and its confirm is scaled accordingly.

**What the UI shows for a slot whose work is gone** — the state the current app
cannot represent — is the Archived card: slot fields (title, passage, date, big
idea, overview — all still editable in the planner), the deletion date, the
"Work it again" door, and — for an archive-door deletion — the Drive link(s)
from its export records. A discarded generation renders the same card with
"Work discarded <date>" and no Drive link. `CompletedSermons`'
"Export to Word" button (`CompletedSermons.jsx:82-113`) renders only when work
exists; for archived slots it becomes "Open in Drive". The Dashboard's Resume tile
switches its query from `stage = in_progress` to *work exists* — which incidentally
fixes a real defect: today every never-worked planner slot floods the Resume list
(`get-in-progress-sermons` has no work filter and no limit; a 100-slot book plan
would render 100 resume rows).

**"Reopen" and "Work it again" are different gestures and must stay different:**
Reopen (`CompletedSermons.jsx:117-125` today) is lifecycle only — it nulls
`preachedAt`; if work exists the walk resumes exactly where it was. "Work it again"
is generational — it runs the start-work transaction (`workGeneration++`, fresh
`SermonWork` at rev 0 seeded with the prior generation's `thresholdsSeen` from the
slot's latest `WorkDeletion` record, genesis revision row). The walk's *content*
starts empty; its *orientation* does not — re-preaching a passage re-fires neither
the sermon-start landing nor the first-visit teaching (ruled: re-preaching should
not re-teach the walk).

### C.2 Ending a preparation: two doors, both human-pressed

Nothing auto-deletes, ever. There is no bulk delete, no cleanup job, no retention
policy. A preparation ends through exactly one of two doors, each a button a human
presses with a confirm proportioned to what is lost (Mutation #4). Both doors run
the identical purge transaction (step 5 below).

**The export gate is labeling, not protection.** Unexported work is always
deletable — the discard door is available whenever work exists — so a verified
export protects nothing from deletion. What the gate decides is which door a
deletion may go through, and therefore what the deletion *is* and how it is
spoken: an **archive** (the tombstone records the gating export, the Archived
card keeps the Drive link, the confirm is proportioned to a loss with a copy
behind it) or a **discard** (the tombstone records no export, the card says
"Work discarded," the confirm is proportioned to a loss with no copy anywhere).
No reader should infer a safety property from the gate; the safety properties
live in the confirms and the revision log.

**Door 1 — Archive (export-verified delete).** The normal end of a preparation:

1. **Export.** From the Finish screen: client flushes the debounce → confirmed
   save at work rev *N* → `POST /api/slots/:id/export` with
   `{ expectedWorkRev: N }`. The server re-reads work from the DB, **rejects if
   `work.rev != N`** ("save your latest changes first" — this replaces the
   desktop's build-from-renderer-memory export and closes its staleness hole),
   builds the docx, uploads to Drive (§F), records
   `ExportRecord{generation, workRev: N, md5}`.
2. **Verify.** The server reads the uploaded file's metadata back from Drive and
   compares checksums (§F.5). Only a match sets `status = VERIFIED` +
   `driveMd5` + `verifiedAt`. No local inference ("the upload call returned 200")
   ever counts as verified.
3. **Offer.** The archive door's **Delete the work** button renders only when a
   `VERIFIED` manuscript export exists for the *current* generation with
   `workRev == work.rev`. This is a labeling condition: it is what entitles the
   deletion to record itself as *archived*. The `workRev` guard keeps the label
   honest — **any edit after the export closes the archive door** until
   re-export, because "archived" would otherwise claim keystrokes the Drive
   copy doesn't have. Work edited past its export remains deletable at any
   moment through the discard door, under its stronger confirm.
4. **Confirm.** The house `DeleteButton` two-step shape, named and explicit, with
   the verified Drive file linked so the pastor can eyeball it before pressing.
   The copy:

   > **Delete the preparation for Luke 5:1–11?**
   >
   > This removes from SermonForge: every Study answer, the passage structure
   > and thought-unit work, the outline, the sermon body, the manuscript doors,
   > your notebooks, and this preparation's full revision history.
   >
   > What stays: your archived manuscript in Drive ([open it]), and this
   > sermon's place in the series — title, passage, date, topics, **and the
   > study-guide fields: the big idea, the overview, and your study-guide
   > questions and notes.** The congregational study guide is built from those
   > fields and is not affected.
   >
   > [ Keep the work ]   [ Delete the work ]

5. **Delete — one transaction** (shared by both doors):
   ```
   BEGIN;
     DELETE FROM SermonWork      WHERE slotId = ?;                    -- the content row
     DELETE FROM WorkRevision    WHERE slotId = ? AND generation = ?; -- ALL revision content
     INSERT INTO WorkDeletion (slotId, generation, deletedById,
                               gatingExportId, revisionsPurged,
                               thresholdsSeen);                       -- metadata only
   COMMIT;
   ```
   (`thresholdsSeen` on the deletion record carries the walk's orientation flags
   into any future generation — §C.1. Threshold ids, never content.)

**Door 2 — Discard (abandoned work).** For preparations that should never be
archived: a false start, a date handed to a guest preacher, a duplicate slot. No
export gate — but a **stronger** confirm, because there is no archived copy behind
it. Offered wherever work exists, as a quiet secondary action on the Finish
screen, never adjacent to the archive door's primary button. The confirm requires
typing the passage:

   > **Discard this preparation?**
   >
   > Nothing here has been archived. Every Study answer, the passage structure
   > and thought-unit work, the outline, the sermon body, the manuscript doors,
   > your notebooks, and this preparation's revision history will be removed
   > from SermonForge — there is no exported copy and no undo.
   >
   > The sermon's place in the series stays: title, passage, date, topics, big
   > idea, overview, and study-guide notes.
   >
   > Type the passage to confirm — **Luke 5:1–11**
   > `[____________]`
   >
   > [ Keep the work ]   [ Discard it ]

   (When a verified export from this generation exists but is stale, the first
   line changes to: "Your latest changes are not in the archived Drive copy.")

Same purge transaction, same completeness; `WorkDeletion.gatingExportId = null`
records it as a discard rather than an archive, and the Archived card (§C.1)
renders accordingly — "Work discarded <date>" with no Drive link.

### C.3 What the delete removes — the no-content-survives audit

Every database location that can hold work content, and its disposition at delete:

| Location | Contains content? | Disposition |
|---|---|---|
| `SermonWork` row | yes — the work itself | deleted in the transaction |
| `WorkRevision.changedColumns` | yes — post-image deltas | all rows for the generation deleted in the transaction |
| `WorkDeletion` | **no** — threshold ids, counts, and references only; no content field | retained (that's the point) |
| `ExportRecord` | **no** — file id, link, name, hashes | retained ("export metadata may remain"); note the *file name* embeds passage/title, which are slot data, not work content |
| `SermonSlot` | slot fields only (big idea, overview, tags are planner/lens data by §A's ruling) | retained |
| Feedback/telemetry | no — metadata-only by the existing enforced schema | n/a |
| Application logs | must not — **implementation invariant: request bodies of work writes are never logged** (Prisma query logging off for these models; no body echo in error paths) | n/a |

**The deletion promise, settled:** the transaction above guarantees no
*application-readable row* holds the content; beneath the application, managed
Postgres retains deleted data in WAL, base backups, and point-in-time-restore
history until the retention horizon passes. **Neon PITR retention is set to
24 hours**, and the privacy document states the promise in exactly those terms:
*removed from the application immediately, unrecoverable after 24 hours.*
(Self-hosted Postgres with backups disabled was considered and rejected — the
disaster-recovery loss isn't worth chasing physical erasure.)

Slot soft-delete (`deletedAt` + Undo — today's v24 pattern, kept) is planner
bookkeeping, **not** content disposal: a tombstoned slot's work is untouched so
Undo restores everything. The confirm for deleting a slot that has live work must
say the work stays recoverable via Undo. True content disposal is only ever one
of the two C.2 doors — the archive door for finished work, the discard door for
abandoned work.

---

## D. Save model

Simplified per the locked decisions: single author, one desktop, never shared.
The prior report's per-question patch protocol, server-side JSON merge for work,
per-question LWW, and presence design are **cut as oversized**. What remains is
deliberately small:

### D.1 Wire shape

Whole-row PUT of the work, preconditioned on `rev` and `generation`:

```
PUT /api/slots/:slotId/work
{
  "baseRev": 41,
  "generation": 2,
  "idempotencyKey": "6f0c…",            // client-stamped per write; retry-safe (§D.2)
  "columns": {
    "observations": { ... },            // any subset of SermonWork content columns;
    "interpretation": { ... },          // in practice the client sends all of them
    "mainPointPair": { ... },           // (whole-row semantics, matching today's
    "outline": [ ... ],                 // pickSermonColumns behavior)
    "functionalElements": { ... },
    "manuscript": { ... },
    "notebookStudy": "...",
    "lastTouchedPosition": "Study/Interpret/cross_refs",
    "thresholdsSeen": [ ... ]
  }
}

→ 200 { "rev": 42, "savedAt": "..." }
→ 409 { "reason": "stale-rev",           "currentRev": 44, "lastSavedAt": "..." }
→ 409 { "reason": "generation-mismatch", "currentGeneration": 3 }
→ 404 { "reason": "no-work" }            // work was deleted since this tab loaded
```

Slot writes (planner fields, and the workspace's three slot writes — title, tags,
mark-preached) use the same discipline at field granularity, replacing
`buildUpdate`'s allowlist with the Prisma types plus one shared guarded-write
helper:

```
PATCH /api/slots/:slotId        { "baseRev": 7, "fields": { "title": "..." } }
PATCH /api/series/:id           { "baseRev": 3, "fields": { "bigIdea": "..." } }
PATCH /api/sections/:id         { ... same ... }
```

**Named test-plan case (ruled):** the workspace and the planner both write the
slot row — a walk title-write racing a planner rename must surface as a slot-rev
409 handled per §D.3 in whichever surface loses. This is the design's one
same-row cross-surface write; it gets a dedicated test, not incidental coverage.

### D.2 Where rev is checked, and the revision write

One transaction, one shape, every entity:

```
BEGIN;
  SELECT rev FROM WorkRevision WHERE idempotencyKey = ?;
    -- hit = this exact write already landed: return 200 { rev }, write nothing
  SELECT rev, generation FROM SermonWork WHERE slotId = ? FOR UPDATE;
  -- reject 409 on rev/generation mismatch, 404 on absence; nothing written
  UPDATE SermonWork SET <columns>, rev = rev + 1, updatedAt = now() WHERE slotId = ?;
  INSERT INTO WorkRevision (slotId, generation, rev, authorId,
                            idempotencyKey, changedColumns);
    -- changedColumns = server-computed diff of the incoming row vs the row it
    -- just read under the lock: only columns whose value actually changed.
    -- A position-only write (chevron-next) logs a two-key delta, not a copy
    -- of the whole sermon.
COMMIT;
```

The revision row rides the same transaction as the accepted write — an accepted
write without its revision row cannot exist, and vice versa. Idempotency: the
client stamps each PUT with an idempotency UUID; the server stores it on the
`WorkRevision` row (§B) and, before evaluating `baseRev`, looks the incoming UUID
up directly. A hit means this exact write already landed — return `200 { rev }`
from the stored revision instead of a 409. Without this, every flaky-network
timeout-then-retry masquerades as a conflict. (A retry arriving after the
generation was purged finds no revision row and falls through to the
generation/absence checks, which reject it — correctly.)

### D.3 The rejection path — the invariant made concrete

On 409, the client **does nothing to the editing buffer.** `sermonRef` and the
rendered textareas are untouched; no refetch fires; no state is replaced. The save
chip changes to an error line in the existing vocabulary:

> **Couldn't save — this sermon was changed somewhere else** (usually another
> open tab). Your writing here is safe and unsaved.
> `[ Keep this version ]`  `[ Discard my version and load the server's ]`

- **Keep this version** (primary): re-PUT with `baseRev = currentRev`. This
  overwrites the other tab's row — *losing nothing*, because the displaced state
  is by construction already captured in the revision log (it was an accepted
  write, so it has a revision row). The chip returns to "Saved".
- **Discard my version and load the server's**: carries its own confirm
  ("Replace what you've written here with the version saved elsewhere?"), and
  only that explicit press replaces the buffer — never a fetch, never
  navigation, never a retry. Two buttons, confirm-before-replace: that is the
  invariant, satisfied.

The same discipline applies to slot/series/section 409s in the planner — which
**changes today's planner behavior**: `reloadPlannerTruth` and the
`setSermons(await …)` failure paths (`SeriesPlanner.jsx:363-371, :490, :506`)
currently blow away local state on failure. Under the invariant they are replaced
by the same keep-mine/discard-mine fork; for structural gestures (reorder, dates)
where "the buffer" is the arrangement, the rejected arrangement stays visible
under an error banner with explicit "Try again" / "Discard my arrangement"
buttons. Auto-reload-on-failure does not survive into the web app anywhere.

### D.4 What this design does NOT protect against — honestly

- **Two tabs both actively editing** ping-pong: every save from the stale tab
  409s, the pastor mediates each time. Detection and rescue (revision log), not
  merge. With one user on one desktop this is the "I forgot a tab was open" case,
  not a workflow.
- **Loss of the debounce window.** A crash, power cut, or force-closed browser
  loses up to the last ~800ms of typing (plus anything queued behind a failing
  network). Same exposure the desktop app documents and accepts — minus the
  desktop's awaited close-flush, which the browser cannot provide. Mitigations
  that ship: `beforeunload` prompt while dirty, `fetch(keepalive)` best-effort
  flush on `pagehide`. Mitigation that does not ship in v1 (cut as oversized for
  one desktop): the IndexedDB pending-write buffer.
- **Whole-row granularity.** A 409 is raised even when the two writers touched
  different fields. Correct for this product (the "other writer" is the same
  person), and the cost of false conflicts was judged lower than the cost of
  maintaining merge machinery nobody needs. §E deliberately does *not* extend
  whole-row PUT to series data, where two writers are real.
- **The revision log is a rescue log, not a UI.** Recovering a clobbered
  answer in v1 means an operator (Ross) reading `WorkRevision` rows, not a
  history browser. Acceptable at this scale; noted so nobody mistakes it for a
  shipped undo feature.

---

## E. Series concurrency, built toward

Decision 5 makes series data the real concurrency frontier. Split of the prior
report's §3.4 breakages into **fix in v1** (retrofitting is painful: wire-contract
changes, data that heals badly, or invariants that must be born correct) versus
**wait for the second user** (additive when needed):

### Fix in v1

1. **Server-side `discovery` merge** (prior finding 1). The client currently
   merges the envelope in the renderer and writes the whole blob — the classic
   lost-sibling race. The v1 API accepts single-key patches
   (`{ "discovery": { "whyBegin": "..." } }`) and merges inside the row
   transaction. *Why now:* this is the write path's wire contract; changing it
   after v1 means coordinated client+server surgery on a live app, and the server
   merge is ~ten lines when built fresh.
2. **Kill the Section-1 race by removing the auto-file, not by locking it**
   (prior finding 2). `firstSectionIdForSeries`'s SELECT-then-INSERT
   (`persistence.cjs:171-183`) exists as a defensive net for creation paths that
   pass `series_id` without `section_id` — but in the web app the only
   legitimate in-series slot creators are planner paths that always know their
   section. v1 therefore **rejects** book-series slot creation without a
   `sectionId` (a validation error, per the create-then-update cleanup) instead
   of auto-filing. The race has no code left to race. *Why now:* duplicate
   "Section 1" rows are the kind of data damage that heals badly after the fact.
3. **`end_date` gets exactly one writer** (prior finding 4). It is a derived
   mirror; the server recomputes it inside every transaction that changes any
   sermon date in the series — including the delete paths that today push a
   client-computed value through the debounced series saver
   (`syncSeriesEndDate`, `SeriesPlanner.jsx:355-359`). The client never sends it;
   it's not an accepted PATCH field. *Why now:* removing a client writer later
   means finding every call site again; deriving it server-side from day one is
   less code, not more.
4. **`rev` preconditions on series/sections/slots** (prior finding 5's "no
   optimistic concurrency"). Already being built for §D — the guarded-write
   helper is one function; excluding planner entities from it would be extra
   work, not less.

### Wait for the second user

5. **Reorder UX under contention** (prior finding 3's client half). The
   transactional set-validation in `reorder-sections` / `reorder-series-sermons`
   ports as-is and is already correct; the invariant-required no-auto-reload
   failure UX ships in v1 (§D.3); but the *nice* handling — rebasing a reorder
   over a concurrent add, or merging two same-set reorders — waits. With one
   user, a reorder 409 means "your other tab"; the blunt fork is fine.
6. **Revalidation/subscription** (prior finding on load-once divergence).
   Two-tabs-one-user is already caught by rev rejection. Revalidate-on-focus
   (SWR-style) arrives with the second user; live subscription may never be
   needed at two-collaborator scale.
7. **The collaborator model itself**: a `SeriesCollaborator` join table, an
   access-predicate change, and invite UI — all additive. The v1 groundwork that
   makes it additive is below.

### Work-side privacy once a series has collaborators

The rule: a collaborator on the series sees the *slot* — and, deliberately, a
derived *status* ("in preparation", "archived") so planning is honest about what's
underway — but never work content, never revisions, never the walk. Enforcement,
designed now so v2 doesn't have to retrofit it:

- **Schema:** `SermonWork.ownerId` / `WorkRevision.authorId` exist from day one
  (§B); work is owned by its author, not by the series.
- **One access module.** All authorization predicates live in a single repository
  layer: `canReadSeries(user, series)` (v1: `ownerId == user.id`; v2: `OR` a
  collaborator-row exists) and `canReadWork(user, work)` (**permanently**
  `work.ownerId == user.id` — decision 4 says this predicate never widens).
  Series-scope Prisma queries **never** `include` work content — they select slot
  columns plus an `EXISTS`-derived status. Work content is reachable only through
  the dedicated work endpoints, which check `canReadWork`. Same for
  `WorkRevision` reads.
- **A tripwire test in the house meta-test style** (the pattern of
  `process-3-movement-visible.test.tsx`): a source scanner asserting no
  series-scope query path selects `SermonWork` content columns, so the boundary
  is pinned by CI rather than by review vigilance.
- **Export records** are series-visible metadata (file name, date, verified
  status). The Drive *files* they point to live on the preaching shared drive,
  whose own membership decides who reads them — ruled and accepted: a preached
  sermon is a public act, and the privacy wall exists to keep *unfinished* work
  private, which it still does. The app's boundary is the export; beyond it,
  Drive's permissions govern.

---

## F. Google Drive export

Design for both exports (manuscript per-slot, study guide per-series) as
server-built `.docx` files written to a shared drive in the @c3denton.com
Workspace. The `docx` library runs in a Node route handler unchanged.

*Assumption, flagged:* "reuses the same wiring as my C3 Ops project" — this
exploration has no access to C3 Ops, so its concrete auth library and credential
storage are unknown. The design below states requirements the wiring must meet;
where C3 Ops already meets them, reuse verbatim.

### F.1 Identity vs. Drive authorization — why they must be separate

Two different questions with different lifetimes and blast radii:

- **"Who is this?"** — Google **sign-in** (OpenID Connect: `openid email profile`
  scopes only), checked against the hardcoded allowlist. Short-lived session;
  no Drive capability whatsoever rides on it.
- **"May the app write to the preaching drive?"** — a standing **authorization to
  act on Drive**, which must keep working regardless of which allowlisted human
  is signed in, must not break when a user revokes a personal grant or their
  session expires mid-export, and should exist exactly once rather than
  per-user.

Collapsing them (requesting Drive scope at sign-in) couples export capability to
whichever user last consented, invites over-scoped sessions, and breaks the
export the day a token silently expires — which is why the invariant names the
separation.

### F.2 Per-user OAuth vs. service account — recommendation

**Recommendation: a dedicated service account added as a member of the preaching
shared drive (Content manager role). No domain-wide delegation. No per-user Drive
OAuth.**

- *Why not per-user OAuth:* it needs offline refresh tokens stored per user, an
  incremental-consent flow, re-auth failure handling in the middle of the C.2
  ceremony, and it makes export capability depend on which human clicked — for
  zero benefit here, since the files land on a shared drive either way.
- *Why not domain-wide delegation:* DWD exists to *impersonate users*. Nothing
  here needs to act as Ross; the app acts as itself. DWD is a Workspace-admin-
  console-wide grant with the largest possible blast radius — wrong tool.
- *Why the SA-as-member works:* shared drives accept service accounts as ordinary
  members, and files created on a shared drive belong to the *drive*, not the
  uploader — which sidesteps the classic service-account quota/ownership problems
  that make SAs a bad idea on My Drive. The SA's reach is bounded by its
  membership: it can touch the preaching drive and nothing else in the Workspace,
  which makes granting it the broad `https://www.googleapis.com/auth/drive` scope
  acceptable (the scope is wide; the membership is narrow).
- *Unsure, flagged rather than guessed:* whether the narrower `drive.file` scope
  suffices for an SA creating files inside folders it didn't create — my belief
  is it's unreliable for addressing arbitrary existing parents, hence the
  full-scope-narrow-membership recommendation, but this should be verified
  against current Drive API docs during implementation. Likewise the
  implementation detail that shared-drive calls need `supportsAllDrives=true`.
- App-side: the SA credential is a server secret in the same secret store as the
  C3 Ops wiring; the shared drive id and root folder id are configuration, not
  discovery.

### F.3 Folder convention and naming

On the existing preaching shared drive, app-owned subtree, configured by folder
id (never found by name-search at runtime):

```
<Preaching shared drive>/
  SermonForge/
    <Series title> (<year>)/            e.g. "Jesus of Luke (2026)/"
      <Series title> — Study Guide.docx
      Manuscripts/
        <date> — <passage> — <title>.docx     e.g. "2026-09-13 — Luke 5:1-11 — Fishing with Jesus.docx"
    Standalone/
      Manuscripts/ ...                  same naming, for slots with no series
```

Filenames are sanitized with the existing export sanitizer rules (length-capped,
filesystem-hostile characters stripped). Files upload **as `.docx`** (no
conversion to Google Docs format) — Word-compatible, and binary files get a
Drive-reported checksum, which F.5 depends on.

**Readability boundary (ruled):** every member of the preaching shared drive can
read every exported manuscript, including from sermons whose in-app work was
owner-private. Accepted by design — the app keeps *unfinished* work private;
finished, exported work is a public act living on the church's drive. Per-user
subfolders and a separate private drive were considered and rejected.

### F.4 Re-export behavior — same generation vs. across generations

- **Same sermon, same generation** (the pastor edited after exporting and
  re-exports — the normal C.2 loop): `files.update` on the stored `driveFileId` —
  same file, same link, Drive's own version history keeps the superseded copy.
  A new `ExportRecord` row is written per attempt (records are append-only;
  "latest verified for generation" is a query, not an updated row).
- **Same slot, later generation** ("Work it again" → export): **create a new
  file, never update the old one.** The generation-*n* file *is the archive of
  generation-n work* — clobbering it would destroy the only surviving copy of
  work the database already purged. Naming disambiguates by date, which differs
  naturally on a re-preach; if the slot's date is unchanged, suffix
  ` (rework <generation>)`. The old file's `ExportRecord` (generation *n*) and
  the new one (generation *n+1*) never point at the same `driveFileId`.
- **Study guides** are series-scoped and generation-free: always `files.update`
  in place (the booklet is a live projection of slot data; its history is
  Drive's version history).

### F.5 Verification — what "truly succeeded" means

The record §C's delete gate consumes:

1. Server builds the docx bytes; computes MD5; writes
   `ExportRecord{status: PENDING, md5, workRev, generation, fileName}`.
2. Upload (simple multipart — these files are tens to hundreds of KB; resumable
   upload is not worth its complexity here). On the API response:
   `status: UPLOADED, driveFileId, webViewLink`.
3. **Read-back verification:** `files.get(driveFileId, fields: "md5Checksum,size,name")`
   — a *second, independent* request. `driveMd5 == md5` and size match ⇒
   `status: VERIFIED, verifiedAt`. Mismatch ⇒ `FAILED` with the discrepancy in
   `error` (never silently retried into a verified state).
4. Only `VERIFIED` — never `UPLOADED` — satisfies the C.2 delete gate.

### F.6 Failure handling

- **Build or upload failure:** `status: FAILED, error` (mapped to the house plain-
  English error voice — the EBUSY/"close it in Word" mapping dies with local
  files; its replacements are "couldn't reach Google Drive" and "the preaching
  drive said no — has the SermonForge account been removed from it?"). Retry is a
  button; each attempt is a new record.
- **Timeout after upload may have landed** (the duplicate-file hazard): before
  any `files.create`, list the target folder for the exact filename; if present,
  adopt it (fetch metadata, verify checksum against the *pending record's* md5,
  proceed to verification) instead of creating a twin. Flagged: this is the one
  place the design searches Drive by name, and it is scoped to a single app-owned
  folder.
- **Verification failure after a good upload** stays `FAILED` — the file may
  exist in Drive, the delete gate simply doesn't open. Human resolves via the
  link in the error.
- **Nothing in the failure path ever deletes anything**, in Drive or in Postgres.

*Cut:* the desktop's "renderer-memory rescue copy" semantics (export proceeds
while the library save is failing). The server export builds from the DB and
refuses on unsaved work (§C.2) — the correct trust posture. There is no
client-side "download a local copy" fallback either (ruled): Drive is the
archive, and a second unverified copy path only creates ambiguity about which
file is real.

**The escape hatch that replaces the rescue copy (ruled): print.** The
workspace's manuscript reading view carries a print stylesheet. Its job is
exactly one scenario: saves are failing, so the export refuses (§C.2 step 1),
and Sunday is still coming. Browser print renders **whatever is in the local
editing buffer** — including the unsaved keystrokes the server hasn't accepted —
straight from the DOM; it works with the network fully down, costs a stylesheet
to maintain, and produces paper or a user-named PDF rather than an app-produced
file, so it cannot be mistaken for a second archive (the ambiguity that killed
the download button). It is explicitly **not the archive**: no `ExportRecord` is
written, nothing is verified, the C.2 gate does not know it happened, and the
printed page's header says so — "Printed from SermonForge — not the archived
copy."

---

## G. What this simplifies

The prior report's "Hard problems, ranked," reduced by the locked decisions:

| Prior rank | Was | Now |
|---|---|---|
| 1. Multi-device conflict | Per-question patch protocol, server JSON merge for work, per-question LWW, presence, revision-log-as-conflict-net | **Collapsed** to whole-row PUT + rev + generation (§D). The revision log survives with a different job: deletion-era history and rescue. |
| 2. Exit seam | Fundamental redesign vs. an unreproducible desktop ceremony | **Shrunk.** Same browser limits, but stakes are one desktop: dirty-flag `beforeunload` + keepalive flush; IndexedDB buffer cut. |
| 3. Offline floor | Queue, replay, pulpit story, offline vocabulary | **Shrunk** to save-state honesty + retry. Desktop-only means office/home networks; the pulpit story is now "the manuscript lives in Drive," which is Google's offline problem, not ours. |
| 4. Responsive rebuild | Three device tiers, touch affordances, keyboard occlusion, datalist, PassagePopup | **Gone** (decision 1). ≥1024px assumed; the fixed shell ports as-is. |
| 5. Planner concurrency | Six fixes, all seemingly v1 | **Halved**: three structural fixes in v1 (§E), three deferred to actual second-user arrival. |
| 6. Constitutional rework | CORE amendment, privacy rewrite, desktop coexistence decision, ESV licensing | **Reduced and scheduled**: coexistence dissolved (retirement plan below); CORE amendment ships with this design's adoption; privacy doc rewritten to the new story; ESV licensing verification remains (§H). |
| 7. Routing re-cut | Five stateful re-homings incl. search deep links | **Reduced**: search deep links (`navHint`) die with search; four re-homings remain. |
| 8. Test regeneration | Rebuild the persistence third against Postgres | Remains, smaller: no search tests, no import tests, no offline-queue tests. |

Killed outright by the decisions, beyond that table: the SQLite importer; the
desktop parity window; Safari/iOS/WebKit testing tiers; PWA install guidance;
sermon share grants, presence, and comment anchoring (permanently, per decision
4); the auth-provider evaluation (Google + allowlist, done); the editor-framework
contingency planning (decision 8 closes it); Postgres FTS / `ts_headline` / the
snippet-marker port (search killed); **and all legacy-shape tolerance** — with no
imported data, every "or legacy plain text" branch, the numeric-key
`functional_elements` warning, `sermon_frame` handling, and the string-vs-object
envelope duality die at birth.

**Desktop retirement, the plan (ruled):** the teamofoxen.com download buttons
and the update surfaces are switched off; the privacy document is rewritten for
the new story ("your finished sermons live in your church's Drive; SermonForge
holds work only while you're preparing, and you delete it when you're done —
removed from the application immediately, unrecoverable after 24 hours").
**No final desktop release is built** — the two or three real users are told
directly. The CORE amendment (the no-backend clause, the userData-path law, the
exit-seam invariants) ships with this design's adoption, before any code exists
that contradicts law.

**Search orphan cleanup (decision 6), the concrete list** — none of this is
ported: `src/components/SearchResultSnippet.jsx`; `src/utils/searchHints.js`; the
search bars + 200ms debounce effects + `searchResults` state in
`SermonList.jsx` (~:68-126) and `CompletedSermons.jsx` (~:56-145, including the
full-row refetch workaround at :89-93, obsolete once list rows are always full
rows); the `db-searchSermons` channel and `searchSermonsFts`/`buildSearchSnippet`
in main; `openSermonHint` in `App.jsx` and the navHint-consuming block in
`SermonWorkspace.jsx` (~:155-190); the lifecycle filtering of search results
(list queries take a `preached` filter server-side instead). The workspace load
effect loses its one position-rewrite special case — re-entry becomes purely
`lastTouchedPosition`.

**Decision 9 confirmation:** the web app inherits nothing from the theology/corpus
or `sermon_search` stacks. The ported-module inventory (prior report §1.1, and §B
here) contains none of their files; the schema above has no search table and no
vector anything; the only shared code that ever touched them
(`SearchResultSnippet`, `searchHints`) is on the kill list above. No strip-out
work in the Electron tree is planned, since no further desktop build ships.

---

## H. What remains open or risky

The prior draft's §H questions are settled and folded into their sections
(deletion promise → §C.3; shared-drive readability → §E.4 and §F.3; the discard
door → §C.2; the confirm's study-guide copy → §C.2 step 4; the slot-write race →
§D.1's named test case; desktop retirement → §G; threshold carry-forward → §B and
§C.1). What genuinely remains:

1. **Verify-don't-trust items in the Drive API** (§F.2, §F.6): whether
   `drive.file` scope reliably addresses existing parent folders (the design
   assumes full `drive` scope on the narrowly-membered service account instead);
   the `supportsAllDrives` plumbing; the adopt-on-timeout name-lookup. All
   flagged in place; none change the design's shape, only its implementation
   details.
2. **The C3 Ops wiring is still unseen** (§F, assumption flagged): the concrete
   auth library and secret store are unknown to this document. The requirements
   they must meet are stated in §F.1–F.2; reconcile at implementation time.
3. **ESV licensing** (inherited from the prior report, still unverified): one
   server key proxying passages for two or three users is a different posture
   than per-user keys. Verify Crossway's terms before building the proxy.
4. **Where the review budget goes.** Two things in this design are easy to state
   and easy to get subtly wrong: the purge transaction's completeness (§C.2
   step 5 + the §C.3 audit table — a future column added to `SermonWork` or a
   new content-bearing table must be caught by a tripwire test, or the
   no-content-survives guarantee silently rots) and the generation discipline
   (every write, revision, export, and deletion stamped and checked — §B). The
   rest of the design is conventional; these two are not.
