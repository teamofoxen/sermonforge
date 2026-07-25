# SermonForge Web v1 — Build Sequence

> **Status: plan, not implementation.** Sequences the settled design in
> [`docs/web-v1-design.md`](web-v1-design.md), which remains authoritative on
> every architectural question. No code, migrations, scaffolding, or installs
> are authorized by this document.
>
> **Resequenced 2026-07-24.** The prior version front-loaded archival machinery
> and test architecture ahead of weekly use. This revision applies one governing
> principle: *the shortest honest path is — build a real sermon in a real
> series, save it safely, export it to Drive, preach from it, and cut over.*
> Everything not required for that outcome moved after cutover. Concretely: the
> entire deletion system is post-cutover; the standalone-sermon slice is
> replaced by a minimal real-series path; the initial schema unit carries only
> pre-cutover models; scanner-style tripwires are replaced by behavior tests.
>
> **Sequencing corrections (same day).** Two, neither changing scope: the
> post-cutover queue now runs **planner first, deletion second** — delayed
> deletion is safe, a thin planner is corrosive; and the walk is split into
> four prompt-sized units (5a–5d) instead of two, because no single
> implementation prompt should carry the entire sermon workspace. Pre-cutover
> scope is unchanged: 10 critical-path units plus 2 parallel, the walk's four
> being the same work at finer grain.
>
> Unchanged context: solo developer in a prompt-relay (each unit ≈ one scoped
> prompt with an observable done-condition); ~42 preaching weeks a year, so the
> desktop app runs until the web app carries a full sermon; no data migration —
> cutover is the week a new sermon starts in the browser; January 2027 limits
> bandwidth, so usable early beats complete late.
>
> Unchanged structural call: **the web app is a new repository.** Porting means
> copying the portable modules in; the desktop repo is never built again and
> freezes at cutover. The governance docs are carried into the new repo and
> amended there — the ruled "CORE amendment before contradicting code" is
> Unit 0.

---

## A. The first usable milestone

**Sign in → open a sermon slot inside a real series → complete the full walk →
save across multiple sessions → export the manuscript to the shared drive →
preach from the exported document.**

The trial sermon is a real sermon in the real series — the series record is
right from sermon one, and nothing prepared before cutover is disposable. The
milestone *is* the cutover trial; there is no valley between them.

Standalone sermons remain supported (the schema's `seriesId` is nullable and a
one-off is just a slot with no series — U3 allows it at near-zero cost), but
they do not define the milestone.

Deliberately absent at the milestone, none of it blocking weekly prep: **any
deletion affordance** (nothing offers to remove work; work accumulates in
Postgres, which is safe because nothing auto-deletes); the planner beyond the
skeleton; Discover, Schedule, and the study guide; Dashboard, Calendar, and the
look-back lenses; preferences and theme polish.

---

## B. Build order

Sizing is relative (S/M/L). The critical path is
**0 → 1 → 2 → 3 → 4 → 5a → 5b → 5c → 5d → 7 → trial sermon → cutover**, with
2.5 and 6 in parallel. Each pre-cutover unit ends with the sentence the
resequencing demands: *why it must exist before next Sunday's sermon can be
safely prepared here.*

**Unit 0 — Repo, governance, deployment (S)**
New repository; Next.js + Prisma + vitest skeleton; deploy to the subdomain;
governance docs carried in with the successor CORE amendment; retirement banner
in the old repo's CORE.
Done when: the subdomain serves a page, migrate and test runs succeed in CI,
both CORE documents read correctly.
*Why before Sunday:* the law must exist before code that contradicts the old
law, and every later unit needs a deploy target to be verified on.

**Unit 1 — Minimal core schema + guarded write (M)**
Only the pre-cutover models: `User`, `Series`, `SeriesSection`, `SermonSlot`,
`SermonWork`, `WorkRevision`. With them, the cross-cutting invariants:
`ownerId` on every root row; `rev` everywhere mutable; `generation` on work and
revisions; `idempotencyKey` on revisions; the guarded-write helper (rev
precondition → update → revision row, one transaction, idempotency lookup
first); the single access module; date-only string discipline; no work content
in logs; `endDate` and `discovery` simply not accepted as client-writable
fields. **Not here** (each arrives with its first consumer): `CalendarNote`,
`UserPref`, `WorkDeletion` and every deletion-specific field, `ExportRecord`
(lands with Unit 7), study-guide structures.
Done when: the migration applies to a Neon branch and the guarded-write tests
are green — stale-rev 409 writes nothing, idempotent replay returns the
original rev, a forced revision-insert failure rolls back the whole write, an
unknown field rejects whole.
*Why before Sunday:* the save contract and ownership must be structurally right
before the first real keystroke is entrusted to them — these are the invariants
that cannot be retrofitted under live sermons.

**Unit 2 — Auth (S)**
Google sign-in (OIDC only), the hardcoded allowlist, sessions, user upsert,
route protection on everything.
Done when: your account gets in; a non-allowlisted account is refused with the
named screen; signed-out API requests are rejected.
*Why before Sunday:* sermon work cannot sit behind an unprotected deploy.

**Unit 2.5 — Drive spike (S — parallel, immediately after Unit 0)**
The human half (create the service account, add it to the preaching shared
drive, configure drive/folder ids) plus a throwaway upload of one test `.docx`,
reading back the link and checksum.
Done when: a file you can open from Drive sits in the SermonForge folder and
the checksum came back readable.
*Why before Sunday:* cutover requires the export, and the design's flagged
Drive unknowns must fail in week two, not the week of the trial sermon.

**Unit 3 — Minimal real-series path (M)**
Create a series (name, kind, year); create a section (title); create sermon
slots inside it (title, passage, date); a plain list of series → sections →
slots for re-entry; open a slot into the workspace shell; slot PATCH on the
guarded write. Standalone creation rides along as "slot with no series."
**Slot removal, bounded** (the reconsidered call): the `deletedAt` + Undo
pattern stays, because it is a nullable column, a list filter, and a restore
button — but pre-cutover the control is offered **only on slots that have no
work**. That is all a mistyped slot needs, and it keeps the pre-cutover path
clear of any question about what removing a slot means for the work inside it —
which is deletion governance, and belongs to P2. Once P2 ships, the control can
speak about work properly.
**Not here:** Outline polish, reorder, Discover, Schedule, study guide,
coverage/pacing, calendar notes, section deletion. In-series slots are born
inside a section *by construction* — this path is the only creator, so the
design's auto-file race never exists.
Done when: series → section → slot created in the browser, listed, reopened
after sign-out; a stale-rev title edit shows the two-button chip.
*Why before Sunday:* the sermon must be born in its real series, or the trial
sermon is a dead-end record beside the real preaching plan.

**Unit 4 — Work lifecycle + autosave (M)**
The start-work transaction (`workGeneration++`, generation-stamped work at
rev 0, genesis revision); the work PUT; the client save hook (sermonRef merge,
800ms debounce, flush-before-navigate, save chip); the 409 keep-mine /
discard-mine fork with its confirm; dirty-flag `beforeunload` + keepalive
flush; and the **merged slot+work shape adapter decided once** — the legacy
"sermon" shape the walk derivations consume, with `parseStructuredField`
accepting objects. (Threshold carry-forward across deleted generations belongs
to the deletion system, post-cutover; pre-cutover every work row is
generation 1.)
Done when: the four save-contract behavior tests pass (§D items 1–4) and the
two-tab 409 fork behaves per the design on screen.
*Why before Sunday:* this is "save it safely" — the whole reason the browser
can be trusted with a real sermon.

**Unit 5a — Walk frame and ordinary fields (M)**
The workspace shell; the merged slot+work adapter (decided in U4) wired in;
field defs and `walkOrder` copied in; position and chevron movement; ordinary
text-prompt fields with N/A read from the existing field definitions; autosave
integration; re-entry on `lastTouchedPosition`; the smallest fixtures that
prove movement and persistence.
Done when: a real sermon moves through ordinary prompt fields; answers survive
reload; position survives reload; N/A behaves per the field defs; every
position change flushes before it settles.
*Why before Sunday:* it is the spine of the walk — without it there is no
surface to write a sermon on.

**Unit 5b — Structural editors (L)**
`PassageCanvas`; thought-unit / cumulative tables; the outline builder;
functional elements; manuscript transitions; manuscript prose fields; the
sermon title editor; the relevant ported component and mutation tests. (If one
prompt runs long, this splits cleanly at the canvas/tables ↔ outline-derived
boundary — same scope, two passes.)
Done when: canvas row identity survives edits and reload; downstream
thought-unit relationships stay intact; outline point UUID relationships
survive reload, so functional elements and transitions stay correctly keyed;
each specialized field writes through the same work save contract.
*Why before Sunday:* the passage structure, outline, body, and manuscript doors
are where most of the sermon actually gets written.

**Unit 5c — Map, derivations, and completion (M)**
`sermonState`, `studyAdvancement` composites, map weighting, completion
calculations, handoff outcome derivation, the ported derivation tests and the
populated/at-handoff fixtures.
Done when: empty, partial, populated, and handoff fixtures produce the same
derived results as the desktop suite; the map matches the actual typed work;
completion readouts do not silently drift from stored content.
*Why before Sunday:* the map and the completeness readouts are how you know
where you are and what is still unfinished.

**Unit 5d — Thresholds and supporting surfaces (M)**
Sermon-start landing; first-visit teaching; the Study→Anchor handoff;
`thresholdsSeen` writes; reference pane; notebook; PassageLookup/PassagePopup;
the Finish screen; Mark-as-preached; the ported accessibility and
movement-narration tests.
Done when: thresholds fire once and stay dismissed across reload; the reference
pane and notebook work inside the completed workspace; Finish shows the
nine-artifact roll-up; Mark-as-preached settles the slot.
*Why before Sunday:* the handoff and Finish are the walk's two hinge moments,
and the reference pane keeping the text present is CORE law.

**Unit 6 — ESV proxy (S — parallel with the walk units; needed by 5d)**
The passage-fetch route (server key, cache), `useEsvPassage` re-pointed,
recovery copy rewritten for the web. Carries the standing unknown: verify
Crossway's terms for one server key before building; if per-user keys are
required, this unit grows a per-user key row.
Done when: the reference pane shows live ESV text; a bad reference and a cut
network each show recovery copy, not a spinner.
*Why before Sunday:* the text staying present in every region is CORE law, and
real prep against a blank reference pane is not real prep.

**Unit 7 — Drive manuscript export + print hatch (M)**
The `ExportRecord` model lands here (kind/status/`workRev`/generation, the XOR
check); the export route (flush → `expectedWorkRev` check → docx from the DB →
upload → record with the link); the Finish screen export button; the print
stylesheet with its "not the archived copy" header. Read-back checksum
verification is wired here if the spike proved it cleanly — but **cutover does
not wait for it**: for the trial sermon and cutover, Drive success means the
server generated the correct document, it landed in the correct shared-drive
folder, the returned link opens, and the pastor reviewed it and preached from
it. Machine verification must be green before the archive-delete door ships
(post-cutover, P2) — the eventual deletion gate is not weakened, it just isn't
this milestone's problem.
Done when: a real sermon's manuscript is on the shared drive, opens in Word,
and re-export after an edit updates the same file; with the network cut, print
produces the buffer's content.
*Why before Sunday:* getting the manuscript to the pulpit is the last step of
preparing it.

**→ The trial sermon.** Prepare next Sunday's actual sermon in the web app —
walked, saved across multiple sessions, exported, reviewed, preached from the
Drive document. Then cut over (§E).

### Post-cutover queue

In order of need; none of it blocks weekly preparation:

- **P1 — Planner Outline expansion (M).** Full Outline UI, reorder as
  transactions with the no-auto-reload failure UX, section deletion with the
  design's release semantics. **First because a thin planner is the corrosive
  gap, not the accumulating work:** the skeleton plans next Sunday, but it does
  not plan a *series*, and the moment the next series gets shaped in a document
  instead of the app, SermonForge has stopped being the planning home. Delayed
  deletion costs nothing; delayed planning costs the product's place in the
  workflow.
- **P2 — The deletion system (L).** Everything the design settled, arriving
  whole and unchanged: `WorkDeletion` (with the threshold carry-forward field),
  both doors with their written confirms, the purge transaction,
  archive/discard tombstone cards, "Work it again" with threshold seeding, the
  machine-verified-export requirement on the archive door, and the sentinel
  integration test (§D). **Must exist before the product offers any button that
  removes work** — until P2 ships, no such button exists and work simply
  accumulates, which is safe: nothing auto-deletes. **P2 moves ahead of P1 only
  if accumulated work becomes a real operational or privacy problem** — a
  concrete one (storage pressure, or work that must come out of the database
  for a reason that actually exists), not the discomfort of knowing it's piling
  up.
- **P3 — Discover (M).** The seven-step walk; `discovery` single-key patches
  through server-side merge (the contract is settled in the design; it gets
  built when its first consumer does).
- **P4 — Schedule (M).** Dates, Suggest Sundays, `bulk-date-sermons` with the
  server-computed `endDate` (the recompute logic lands here; the
  never-client-writable contract has held since U1); `CalendarNote` arrives
  with its first consumer; pacing, coverage, and churchCalendar copied with its
  timezone discipline pinned.
- **P5 — Study guide (M).** The `studyGuideExtras` column arrives, the
  projection tab, and the series-attached Drive export through the U7 pipeline.
- **P6 — The shell (M, parallel with any of the above).** Dashboard proper
  (resume on work-exists), Calendar view, Preached list + Reopen, What I've
  Preached (the `tags` column and input arrive here), `UserPref` + theme.
  If Reopen is wanted sooner, it's small enough to pull forward.

P1 precedes P3–P5 (they extend its surfaces); P2 and P6 are independent of the
planner track and can interleave with it.

---

## C. What must be born correct

Reserved for cross-cutting invariants and wire contracts that later features
depend on. **Adding an empty table to a young Postgres app later is not a
retrofit** — which is exactly why `CalendarNote`, `UserPref`, `WorkDeletion`,
and `ExportRecord`-before-U7 came off this list.

| Item | Lands in |
|---|---|
| `ownerId` on every root row | U1 |
| `rev` + the single guarded-write path | U1 |
| `generation` stamped on work and revisions from the first row (exports stamp it when they arrive) | U1/U4, U7 |
| `idempotencyKey` + retry-by-lookup | U1/U4 |
| Centralized authorization; series-scope responses never carry work content | U1/U3 (behavior-tested U4) |
| Date-only strings; `endDate` and `discovery` not client-writable | U1 |
| No work content in logs | U1 |
| The merged slot+work shape adapter, decided once | U4 |
| In-series slots born inside a section by construction (no auto-file path ever exists) | U3 |

---

## D. The tests that gate cutover

Behavior tests over observable guarantees — the scanner apparatus from the
prior revision (schema parsing, transaction-body scans, Prisma-create scans,
import-placement checks) is removed; CI does not depend on source-text
inspection where integration tests can protect the invariant.

Before cutover, all green:

1. **Work privacy:** with both real users configured, one user's read of the
   other's sermon work is denied, and series-scope responses contain no work
   content. (U4)
2. **Stale writes:** a stale `rev` and a stale `generation` are each rejected
   with server state unchanged. (U4)
3. **Idempotent retry:** a replayed write produces exactly one accepted save.
   (U4)
4. **Revision atomicity:** a forced revision-write failure rolls back the work
   update — failure injection, in the house `atomic-mutations` style. (U1/U4)
5. **The shape seam:** the merged slot/work object drives the ported derivation
   tests and fixtures to the same answers the desktop suite pinned. (Wired in
   U5a; proved in U5c, which owns the ported derivation tests.)

With P2, post-cutover, one strong test joins them: **the sentinel sweep** —
populate every work-content area through real write paths, accrue revisions,
export, delete through each door in turn, then verify no application-readable
work content remains anywhere while slot fields and export metadata survive. A
small explicit content registry may back the purge implementation if it
genuinely needs one; the sentinel test protects it, not a schema-parsing CI
step.

---

## E. The cutover

**The gate — all of it true, nothing more:**

1. Units 0–7 done: the minimal real-series workflow, safe save/revision
   handling, the full walk, ESV, and a working Drive export (manual
   verification — the link opens, the document is right).
2. The trial sermon prepared end to end in the web app and **preached from the
   Drive document**.
3. The current active series recreated only to the minimum needed to begin the
   next sermon — the series, its current section, and the next few slots. Not
   the whole plan; the rest arrives as it's needed once P1 lands.

**Explicitly not required:** planner polish beyond the skeleton (P1), work
deletion (P2), Discover (P3), Schedule (P4), the study guide (P5),
Dashboard/Calendar/lenses (P6), any scanner suite, or any model that has no
pre-cutover consumer.

**The week itself:** start the week's sermon in the web app — that act is the
cutover. Website shutoff: edit the one file at
`C:/Projects/ArmyFootball26/sermonforge/index.html` — download buttons out, a
short successor note in; push to main. Optionally archive the GitHub releases
so no new installs occur (existing installs untouched; ruled: no final
release). Rewrite the privacy document to the new story. One manual safeguard,
not an importer: copy `sermonforge.db` and the `Documents\SermonForge\exports\`
folder to the shared drive, once. Optionally switch off the BTI worker.

**What remains temporarily incomplete after cutover, and why none of it blocks
weekly prep:**

- **No deletion.** Work accumulates in Postgres exactly as it always did on the
  desktop's disk. Nothing auto-deletes, nothing is at risk; the "the app is not
  an archive" identity completes when P2 ships the ceremony.
- **A skeleton planner.** Sections and slots can be created, edited, and
  opened — enough to plan next Sunday, which is why it doesn't block cutover.
  It is also the first thing built afterward (P1), because planning the next
  *series* needs more than the skeleton.
- **No Schedule tab.** Dates are set on the slot at creation or edit; Suggest
  Sundays and the pacing strip are batch conveniences.
- **No Dashboard.** The minimal list is sufficient re-entry for one user; the
  resume tile is polish.
- **Old sermons live in the frozen desktop app** — readable, searchable, and
  locally exportable on that machine indefinitely, never updated, backed by the
  one-time shared-drive copy. Consulting them means opening the old app; they
  never appear in the web app. Accepted.

---

## F. After v1 — re-entry triggers

Build when the trigger fires: **series collaborators** — when a series outline
would otherwise be emailed back and forth; **revalidate-on-focus** — when a
second person has write access to any series; **reorder rebasing** — when
reorder 409s from real concurrent use stop being rare; **iPad tier** — when
iPad reading/review becomes a real weekly want; **study-guide share link** —
when distributing the booklet as a file becomes friction; **sermon search** —
when "where did I say that" returns as a felt need; **revision-history UI** —
the first time a rescue means reading `WorkRevision` rows by hand;
**IndexedDB pending buffer** — if a real save outage ever eats typing the chip,
retry, and print hatch didn't cover; **per-user ESV keys** — if the Crossway
check requires them; **samples/onboarding** — if anyone beyond the known users
is invited.

---

## G. Where this plan is most likely to go wrong

1. **The shape seam under the walk (U4 → U5a → U5c).** Still the top risk: the
   merged slot+work adapter is the one interface the whole "walk ports clean"
   bet rides on, and its failure mode is silently wrong derivations, not
   crashes. First symptom: a fixture or ported derivation test disagreeing with
   the screen. The split helps here — the adapter is decided in U4, wired in
   U5a, and *proved* in U5c, whose entire done-condition is the ported
   derivation tests and four fixtures agreeing. That proof is now its own unit
   with its own gate instead of one clause inside a large one; U5c is the unit
   where shortcutting the done-condition would hurt most.

2. **Post-cutover debt hardening into the permanent state.** The
   milestone-to-cutover valley is gone — the milestone *is* the trial sermon —
   so the stall risk moves past cutover. Its two halves are not equally
   dangerous, which is what the P1/P2 order encodes: work accumulating without
   the deletion ceremony is merely untidy, while a planner too thin to shape
   the *next series* pushes real planning back into a document, and a tool you
   plan around instead of in is one you stop opening. First symptom: series
   planning happening outside the app — watch for it specifically, since it
   arrives as a quiet convenience, not a complaint. Response: P1 is the first
   post-cutover unit, not a backlog item; if bandwidth collapses in January,
   shrink it, don't shelve it.

3. **Drive surprises past the spike.** The spike de-risks the happy path;
   update-in-place and checksum read-back can still behave differently under
   real Workspace policies. The resequencing already contains this: cutover
   accepts manual verification, so a broken verifier can no longer block the
   trial sermon — the blast radius narrows to P2's archive door, which waits
   for a green verifier. What must not happen is unchanged: the delete gate is
   never loosened to match a broken verifier. First symptom: VERIFIED never
   reached while the file visibly exists in Drive.
