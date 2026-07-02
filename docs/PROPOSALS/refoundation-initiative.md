# Workspace Re-Foundation Initiative — working board

> **Status: ESSENTIALLY COMPLETE — Phase 1 shipped (2026-06-14/15, canon LIVE); Phase 2 rulable items 1–5 shipped (2026-06-15/16); the OEM walk + Frame→Manuscript collapse shipped 2026-07-02 (`oem-walk-rulings-2026-07-01.md`); the ruled N/A code build (Study grants 2b + per-cell cumulative-table N/A 2c) shipped 2026-07-02. Remaining: only the independent infra-doc pass below (present-tense sql.js/saveDb cruft, schema-version drift) + trivial doc-cleanup (historicize the §2 [◆] tags in canon). No code or rulings outstanding.** Chartered
> 2026-06-13 at the end of a long design conversation. This is the doc the work runs from.
> It has two coupled jobs: (1) **consolidate the scattered document authority** into a
> clean structure, and (2) **re-examine the contracts + the Study/Anchor question set
> through Tony Merida's intent** (CCE). The two are one act — you cannot state "what is
> true now" without resolving the initiative reversals, and you should not freeze the
> current truth without the Merida lens. **Report-only / no question gets cut in
> Phase 1.** Step 1's net-truth map is recorded below ("Phase 1 · Step 1 output"); step 2
> produced the verified draft at `docs/WORKSPACE-CANON.md` (DRAFT, not yet binding); step 3
> ruled the three contract examinations and slimmed CORE to live law (dated history → new
> `docs/CORE-CHANGELOG.md`); step 4 thinned `sermon-workspace.md` to mechanics + cross-refs
> (walk what/why → canon); step 5 historicized the nine old initiative docs, registered
> WORKSPACE-CANON on ANCHORS, and **lifted its DRAFT banner — the canon is now LIVE**, with
> CORE Process #6 re-pointed to it. **Phase 1 complete; Phase 2's rulable-now items (1–5)
> shipped 2026-06-15/16; the OEM walk + the N/A code build both shipped 2026-07-02 — see the
> dated progress entries below. Remaining: only the independent infra-doc pass.**
> Rescoped from the former `merida-fidelity-initiative.md` (its
> Merida findings are preserved below as the Phase-2 input).

---

## Where this stands (the simple version)

- We audited whether SermonForge applies Merida faithfully. Verdict: the **question
  spine is mostly faithful**, but there are a few **drifts**, some **gate-induced**
  questions, and several **additions** — and some additions got elevated into CORE.
- Separately, we found the **document authority is sprawled** across ~15 binding
  docs, ~8 governing the same thing through **supersession chains** (initiatives
  that reversed each other and never got retired).
- **Decision:** clean up the authority FIRST (consolidate + historicize), THEN do
  the Merida question surgery — but do the cleanup *through* the Merida lens so it
  isn't redone.
- **Phase 1 (next):** build a clean foundation. **Phase 2 (after):** cut/fix the
  questions against it.
- **No canonical change committed yet** (no CORE / CANON / code edit). The step-1
  net-truth map is now recorded on this board; that plus the memory pointer are the
  only artifacts.

---

## The problem

Authority accreted by initiative. Every redesign (SPRD, SFDI, SADI, invisible-system,
era-2, workspace-restructure, saturation, Merida) spawned a charter/spec that
**stacked and superseded** the last instead of folding into the law and retiring.
To know "what's true about Study field X right now" you read SFDI → era-2's reversal
→ CORE's amendment — a 3-hop chain. CORE itself is barnacled with dated amendment
history inside its clauses.

## Decisions locked (this conversation)

1. **Fresh canonical spec** — a new top-level doc, proposed `docs/WORKSPACE-CANON.md`,
   peer to CORE/RULES. The single live source for the walk's *what & why*.
2. **Whole-workspace** authority consolidation; **Merida-annotate Study + Anchor + OEM**
   (where fidelity bites).
3. **This doc is the working board**; it historicizes into CORE + CANON when done.
4. **Reversal-tracing runs as an ultracode fan-out** (pastor opted in).
5. **sermon-workspace.md is impacted but NOT historicized** — it stays as the
   mechanics doc, thinned (content migrates to CANON).

## Target doc set after Phase 1

- **CORE.md** — slimmed to clean current clauses; dated amendment-history moved to a
  change log (appended or a sibling). Reads like law again.
- **`docs/WORKSPACE-CANON.md`** (new) — the canon: every stage / sub-phase / field /
  question / named-outcome / completeness-policy at current-truth, Merida-annotated.
- **`docs/SYSTEMS/sermon-workspace.md`** — thinned to *how & where* (components,
  columns, derivations, save flow); cross-refs the canon.
- **Initiatives** (SFDI, SADI, SPRD, era-2, invisible-system, workspace-restructure,
  saturation, + this one) — banner-stamped *"Authority transferred to CORE +
  WORKSPACE-CANON [date]. Historical record."* They stop binding.

## Boundary rules

- **CORE = the law** (contracts, Principle, Test — why it can't change).
- **WORKSPACE-CANON = what & why** (questions, named outcomes, gates-as-policy, Merida fidelity).
- **sermon-workspace.md = how & where** (components, JSON columns, derivations, save flow).
- **Initiatives = how we got here** (frozen history).
- **Ground truth is the code at HEAD.** Where a doc and the code disagree, the code wins; the doc was stale.

## Phase 1 plan (order of operations)

**Ultracode allocation principle:** use it for *breadth* (fan-out over many independent
things) and *confidence* (adversarial verify against ground truth before it hardens) —
NOT for single-author writing or the rulings that are the pastor's. The verification
passes are where most of the value is.

1. **✅ DONE (2026-06-14) — Reversal-tracing → net-truth — ULTRACODE (fan-out + verify).**
   One agent per live-authority initiative (SFDI, SADI, SPRD, era-2, invisible-system,
   workspace-restructure, saturation), each producing: *net current contribution* +
   *what it reversed* + *what's now dead*, grounded against the code at HEAD. Then
   reconcile into one net-truth map. **Report before drafting.** A second fan-out folded
   in four more live-authority sources the first pass missed (v24 data-layer, the
   UX-overhaul governance batch, BTI, ARI). Result recorded in "Phase 1 · Step 1 output"
   below.
2. **✅ DONE (2026-06-14) — Draft `WORKSPACE-CANON.md` — SOLO draft, ULTRACODE verify.**
   Drafted from net-truth + code-at-HEAD, Merida-annotated for Study/Anchor/OEM (each
   question tagged faithful / addition / gate / drift). One coherent hand. The verify pass
   (13 section verifiers + a Merida-tag check + a completeness critic vs the code at HEAD)
   returned **0 blockers** — minor accuracy fixes applied. Output: `docs/WORKSPACE-CANON.md`
   (DRAFT (verified); not yet binding; does not yet supersede SFDI/SADI).
3. **✅ DONE (2026-06-14) — Slim CORE + examine the three contracts.** The per-unit-gate / N-A
   examination got the focused ultracode adversarial pass (6 agents → option matrix); the
   pastor RULED: **an honest "nothing here / doesn't apply" counts as done** — N/A restored to
   the declared SFDI Study questions + per thought-unit cell (the named-outcome paragraphs stay
   no-N/A). Written into WORKSPACE-CANON §5 + the SFDI banner (`abfb58e`); the per-cell/Study
   *code* build is scheduled separately. Examination 2 (constitutional weight): PC mechanics +
   moved to spec, principle kept as law. Examination 3: Principle scope note added (tool's telos,
   not the sermon's). CORE slimmed to live law, dated history → `docs/CORE-CHANGELOG.md`
   (`6b25097`).
4. **✅ DONE (2026-06-15) — Thin sermon-workspace.md — SOLO** migration + light verify. The
   walk's what/why migrated to canon (per-region cross-refs); the doc is now how & where.
   Fixed four code-grounded drifts (Field 3 kind → `indented-canvas`; completeness composites
   are *wired* into `deriveSermonCompleteness`, not "uncalled"; save-flow `saveDb` 500ms debounce
   → better-sqlite3 handler-commit; SERMON_COLUMNS 37 → 34) plus the ~1.3s → `<800ms` crash-window
   nit. The legacy-PC-column disposition (removed, zero readers/writers) corrected in
   CORE-CHANGELOG + ENFORCEMENT_STATUS (per-clause rows 39/41 + summary 24 + deferred 116/117).
   PC mechanics now explicitly held here, as CORE Process #4 points. Verified by a 3-agent
   ultracode pass (re-ground mechanics vs code · nothing-dropped vs canon · drift/refs):
   **0 orphans, all 39 mechanics claims match code, 0 broken refs.**
5. **✅ DONE (2026-06-15) — Banner-historicize the initiatives + update `ANCHORS.md` —
   SOLO/mechanical** + final consistency verify. The nine old initiative docs (SFDI ×2,
   SADI ×2, SPRD, invisible-system, era-2, workspace-restructure, workspace-trail) carry the
   "authority transferred to CORE + WORKSPACE-CANON — historical record" stamp; ANCHORS
   regrouped (canon = live anchor at top; the nine under historical); **the canon's DRAFT
   banner is lifted — it is now LIVE/ratified** (binds the walk's current shape; Merida tags
   stay Phase-2 input); CORE Process #6 + the ENFORCEMENT_STATUS Process-#6 row + the CLAUDE
   nav all re-point to the canon. A 3-agent ultracode consistency verify caught the residual
   gaps (workspace-trail un-listed on ANCHORS; the ENFORCEMENT summary bullet; canon
   §7/provenance/boundary DRAFT-era leftovers; the sermon-workspace canon pointer; the spent
   handoff) — all folded in before commit. **Phase 1 is closed; next is Phase 2.**

*(Phase 2 Merida surgery, later: SOLO edits + ULTRACODE adversarial review of the
combined diff before commit — the established pattern.)*

## Phase 1 · Step 1 output — the net-truth map (2026-06-14)

> Produced by two ultracode fan-outs over the code at HEAD (`320f272`): round 1 = the 7
> live-authority initiatives (16 agents); round 2 = 4 more sources the round-1 critic
> caught as untraced (10 agents); ~2.8M tokens total. Every "live / reversed / dead"
> claim was adversarially verified against the code. **Code wins all doc conflicts.**
> Report-only — no question cut.

**The one-line verdict.** The code is the net truth and it is internally consistent; the
docs are the drift. Across all 11 sources, adversarial verification found **zero** cases
of a "dead" thing still wired in the production tree (`src/` + `electron/`). Phase 1 is
overwhelmingly **documentation reconciliation, not code surgery.** Stable, CORE-canonical
counts that do not move: **3 stages · 8 sub-phases · 8 named outcomes · 8 composite
gates.** *(Updated 2026-07-01: Study was 25 fields at the time this line was written;
Phase 2 item 5 (2026-06-16, `c07139e`) cut Possible Implications + Genre, so Study is
now **23 fields** (7/7/5/4) — see CORE.md and the Study field set line below.)*

### Scope rulings — what is actually WORKSPACE-CANON

The most consequential output for step 2. Canon = the walk's *what & why* only; most of
the traced authority belongs elsewhere and must NOT be pulled into canon.

| Source / material | Canon? | Home |
|---|---|---|
| Study / Anchor / Frame / OEM questions, named outcomes, handoffs (SFDI, SADI, SPRD, OEM-draft) | **Yes** | WORKSPACE-CANON |
| Workspace chrome — place line, Back/Next, completion threshold, re-readable thresholds, reference pane (UX-overhaul batch) | **Yes** | WORKSPACE-CANON (CORE keeps the short binding clauses) |
| Product-shape premises — no-AI / "the system asks instead of answers" (ARI); sermon-first identity (UX batch) | **Yes — as settled premise; point to CORE** | WORKSPACE-CANON + CORE |
| Movement / completeness / threshold behaviour (invisible-system, era-2, saturation) | **Yes** | WORKSPACE-CANON (CORE keeps Process #1/#2/#3) |
| Data layer — better-sqlite3, soft-delete, search, Delivery-strike (v24) | **No** | CORE + SYSTEMS + REFERENCE |
| AI-removal *enforcement* — lint tripwire, keystore, deleted-file inventory (ARI) | **No** | CORE / RULES / ENFORCEMENT_STATUS |
| Beta program + telemetry/privacy (BTI) | **No — separate domain** | Its own charter + `privacy.md` + the CORE outbound clause |

### The 22 subjects (current truth · key cruft · [home])

**Structure & vocabulary**
- **Stage model** — 3 stages (Study/Assembly/Manuscript). Blueprint/Frame/Delivery are not stages; the read-coercion that once mapped legacy Blueprint/Frame→Assembly was *deleted* (harmless — no production sermons). ⚠ "coerced on read" is stale-and-now-false in 3 places (CORE:79-80, `contracts.ts:51-52`, restructure charter). `[CORE]`
- **Sub-phase model** — Study(Observe/Interpret/RedemptiveThread/Implications) + Assembly(Anchor/Outline/Equip/Frame); old within-Study Step layer + `current_step` gone. v21 `last_*_subphase` cols are spine-written / renderer-orphaned (live via SQL COALESCE; `contracts.ts:336-338` documents a "renderer derives" mechanism that is fiction). `[CORE/CANON]`
- **Canonical vocabulary** — holds. One drift: CORE:116 still expands MPT/MPS as "Main Preaching Thought/Statement"; all code + the rest of CORE say "Main Point of the Text/Sermon." `[CORE]`

**Movement & completeness**
- **Movement** — FREE. The entire advancement-wall layer is deleted; labeled ← Back beside Next. Canon language = "monotonic in expectation, not enforcement." Cruft: SADI/SPRD/restructure-charter still describe hard-disabled Continue. `[CANON+CORE]`
- **8 composite gates** — CORE-canonical; now *wired* (commit `9a86e48`) into `deriveSermonCompleteness` + SermonFinish as informational completeness, never blocking. The invisible-system "composites uncalled / surfacing in progress" framing is DEAD. `[CANON+CORE]`
- **Threshold screens** — 3 overlays (start / Study→Anchor handoff / SermonFinish); re-readable forever; within-stage movement silent. `[CANON]`
- **Workspace chrome** (round 2) — Back/Next, "Stage · Region" place line, map "You are here", the gold "Finish sermon →" door replacing the dead grey disabled Next, "Read again" doors. Ratified into CORE Process #1/#2/#3 + Surface #4 by the UX batch. `[CANON]`

**Study & Assembly content**
- **Study field set** — 23 fields (7/7/5/4) as of Phase 2 item 5 (2026-06-16, `c07139e`; was 25/8-8-5-4 when this line was first drafted). Field 3 (Divisions) is now ONE `indented-canvas` question (legacy 3-question shape + ParaphraseBlocks retired). SFDI doc still lists dead sub-shapes + per-question keys that don't exist (live key is `'primary'`). `[CANON]`
- **Cumulative thought-unit table** — closed at 4 columns (text + meaning + christ_connection + implication), not the 6 SADI committed to. SADI doc still says 6. `[CANON]`
- **Anchor/Frame fields** — MPT/MPS + Intro/Conclusion definitions live; the SpotlightWorksheet render layer is deleted (ReferencePane carries the pedagogy); flat mpt/mps auto-sync for Word export. SADI doc/memory still name StudyTab/SpotlightWorksheet/AI buttons. `[CANON]`
- **OEM (Outline/Equip/Manuscript) DRAFT defs** — the "No field found" gap is CLOSED (wired, commit `059bfce`); DRAFT pedagogy, not preacher-walked. Stale: `SermonWritingSurface.jsx:396-403` comment + invisible-system spec still assert the gap; memory `project_oem_field_defs` is stale. `[CANON — DRAFT caveat]`
- **Named-outcome architecture** — 8 outcomes, one per sub-phase. 2 of 8 (Sermon Outline, Sermon Body, from Restructure RW1) are first-draft names with no Merida/SFDI/SADI ratification — provisional. `[CANON]`
- **Pastoral Context** — third voice inside Implications Field 3 (`room_specifics`/`cost_and_gift`); standalone PC card retired. The 3 legacy PC columns era-2 Ruling 3 ordered deleted are **removed** (struck from `SERMON_COLUMNS` in both contracts mirrors, zero readers/writers) — Ruling 3 **fully discharged**. *(Corrected 2026-06-15, step 4: the step-1 map read "still retained + read-coerced," but the code at HEAD has them struck.)* `[CANON+CORE]`
- **Pending N/A ruling** — code enforces a strict two-question allowlist (`intro.redemptive_note` + `mps.gospel_check`); SFDI's Study-wide N/A grants suspended behind a "PENDING PASTOR RULING" banner. **The one open decision.** `[blocks the N/A section of canon]`

**Saturation**
- **Marinate & saturation** (most recent authority, commit `a2fe292`) — reference pane defaults to the passage in every region; marinate restored as a return to the passage at 3 surfaces (Implications send-off, Study→Anchor handoff renders the ESV, MPT draft prompt); explicitly NOT a relabel of the synthesis (the era-1 conflation stays struck). SADI doc fully un-propagated (0 "saturation" mentions, "beside you" fossils). `[CANON]`

**Data & infrastructure — NOT canon**
- **Data layer & durability** (v24) — better-sqlite3 WAL; writes commit at the IPC handler (the 500ms sql.js debounce + crash window gone, may not return); `closeFlush.js` on every exit path. `[CORE + SYSTEMS]`
- **Soft delete** (v24) — `deleted_at` tombstone + visible Undo; hard delete gone from the user path; satisfies Mutation #4. `[CORE]`
- **Search** (v24) — `sermon_search` rebuilt: sermon body (`functional_elements`) in, delivery/timing out. `[SYSTEMS/REF]`

**Premises & governance**
- **AI removal** (ARI — now first-hand owner) — zero AI authorship surfaces; MutationKind collapsed to `user_input`; keystore narrowed to ESV-only; `no-direct-ai` is a no-exception lint tripwire; Mutation #2 (proposal slot) is a tombstone clause. `[premise → CANON; enforcement → CORE/RULES]`
- **CORE persona & identity** (UX batch) — sermon-first rewrite; the old "series planning room / Calendar-assigns-Sundays" identity (features that never existed) removed wholesale; low-software-confidence as binding design law; the Test grew to 5 questions. **This batch is the source of ~12 dated 2026-06-10 parentheticals barnacling CORE.** `[split CANON/CORE]`
- **Beta-testing governance (BTI)** — one opt-out Cloudflare metadata call; single FeedbackFlag mount; 6-type frozen event registry (only app-open + crash fire). Charters carry stale cruft (multiple per-tab mounts, "ai-press cleanup pending", a phantom `transport.js`, TOUR_STEP). `[separate charter]`

**Dead machinery (confirmed gone)**
- **Trail / wall / cutoff / tour engine** — entirely deleted (Invisible-System A–G). Live surface = writing surface + map + reference pane + 3 overlays. Heavy doc cruft: `workspace-trail-charter.md` describes the dead trail as "all live"; SPRD lists `ThroughlineRail` as shipped. `[historicize]`

### Supersession chains (the load-bearing 9 of 19)

- **Stage:** 4-stage → Restructure collapsed to 3 + built read-coercion → Invisible-System deleted the coercion → v24 struck Delivery.
- **Walls:** SPRD evidence-gated hard-disabled Continue → Invisible-System F deleted the wall layer + spine rejections → UX batch clarified Back+Next is compliant.
- **Completeness:** SPRD built the 8 composites as blocking gates → SFDI/SADI ratified them → era-2 Ruling 8 recast Field-3 to one check → Invisible-System kept them as predicates (uncalled) → `9a86e48` wired them informational.
- **Marinate:** era-1 conflated synthesis with "marinate-output" → era-2 Rulings 1/4 struck the conflation + removed marinate → saturation restored marinate as return-to-passage (conflation stays struck).
- **Trail:** Restructure + Trail built it ("sole rendering") → Invisible-System E/F/G deleted all trail/tab/spotlight/rail + tour engine + cutoff.
- **DB engine:** sql.js serialize-per-write + 500ms debounce → v24 swapped to better-sqlite3 WAL handler-commit + close-flush.
- **Delete:** hard delete → v24 soft-delete tombstone + Undo → UX batch amended Mutation #4 to friction-scales-with-loss.
- **AI:** era-1 AI subsystem → ACC/ACCI hardened it → ARI deleted it entirely + no-exception lint tripwire.
- **Identity:** series-first (Dashboard-as-planning-room / Calendar-assigns-Sundays) → UX batch rewrote to sermon-first + persona-as-law + Test Q5.

*(All 19 chains + every per-subject code anchor live in the on-disk run artifacts — see Provenance.)*

### Cleanup worklists (for steps 2–5 — NOT step 1)

- **A. Canon-bound doc cruft (highest value):** the SADI working doc (0 saturation mentions; StudyTab / SpotlightWorksheet / AI / 6-column fossils), `workspace-trail-charter.md` (the whole dead trail as "live"), the SPRD doc (`ThroughlineRail` "shipped"). WORKSPACE-CANON should supersede these wholesale.
- **B. Separate infrastructure-doc pass — DONE 2026-07-01 (doc drift sweep):** the present-tense `sql.js` / `saveDb` references in `SYSTEMS/ipc.md`, `REFERENCE/ipc-channels.md`, `REFERENCE/project-structure.md` are corrected; `SYSTEMS/database.md`'s schema-version line and `REFERENCE/schema.md`'s legacy-PC-columns line were already accurate at HEAD by the time of the sweep (both read v32 / "removed", not the stale v14 / "retained defensively" this item originally flagged). *(`SYSTEMS/sermon-workspace.md:545` `saveDb` — DONE in step 4.)*
- **C. CORE slimming:** ~12 dated 2026-06-10 amendment-history parentheticals (identity, persona, Test Q5, Process #1/#2/#3, Mutation #4, Surface #4) + the pre-invisible-system retired-framing blocks quoted inside Process #1/#2/#3 → move to a changelog so CORE reads like law.
- **D. Memory housekeeping:** mark `project_oem_field_defs` superseded by `059bfce`; mark `project_invisible_system_state` stale on the "composites uncalled / surfacing in progress" line.

### Readiness — CONDITIONAL go to draft canon

- **Every live-authority source is now owned** — the round-2 critic's `remainingLiveAuthorityUntraced` came back empty.
- **The one blocker:** the SFDI Study-side N/A pastor ruling (above) — blocks only the N/A section of canon; the rest drafts around it.
- **Drafting discipline:** honor the scope rulings — canon is the walk's what & why; the data layer, BTI, and ARI-enforcement stay in CORE/RULES/SYSTEMS/charters.
- **Grep caution:** deleted symbols still live in `.claude/worktrees/`; scope every consolidation grep to `src/` + `electron/` + `docs/` and exclude that dir.

### Provenance

- **Round 1** (16 agents, ~1.85M tokens): the 7 initiatives traced + verified → a 16-subject map. Artifact: `tasks/w9k1vp1z8.output`.
- **Round 2** (10 agents, ~949K tokens): v24 data-layer, the UX-overhaul governance batch, BTI, ARI → +6 subjects, scope rulings, readiness verdict. Artifacts: `tasks/w3yvvh2vk.output`; reconciled `priorMap.json` + `round2.json`.
- Both grounded at HEAD `320f272`; code-wins-on-conflict; adversarially verified. (Run artifacts are session-scoped temp files and may be cleared; the distilled map above is the durable record.)

## The three contract examinations (more than filing)

- **Process #2 (completeness).** "Done = artifacts exist" + the per-unit no-N/A gate
  is the clause most in tension with Merida. Ties to the **already-pending SFDI N/A
  ruling**. Rule the gate granularity + N/A here.
- **Constitutional weight of the CORE-elevated additions** — Pastoral Context
  (Process #4 + vocabulary) and the named-outcome architecture. Keep their weight, or
  demote to spec-level? Weigh against the product-owner's own PC articulation
  (currently `sermon-workspace.md` lines 52–70 — preserve it).
- **The Principle's scope note** — Clarity-through-Constraint is the *tool's* telos
  and is right; add a one-line scope note so the "wrong star" audit language can't be
  read as undermining it. Clarification, not amendment.

## Phase 2 (after Phase 1) — the Merida question surgery

Rule + cut against the clean CANON, editing one doc in place. Lowest-cost first:
MPS→fallen-condition-focus, two-brothers language, authority gradient, the cuts
(title/3 AM test, 25-observations), then thin the additions, then the per-unit gate,
then the OEM-walk items.

---

## APPENDIX — Merida findings (the Phase-2 input)

### The design frame (settled)
1. The tool's telos is **Clarity through Constraint** — and that's correct (it
   measures the *tool*, not the *sermon*; the sermon's adoration-telos is the
   preacher's, off-surface). Reconciles with CORE's Principle.
2. The tool is the **writing surface for Merida's questions**, downstream of the
   preacher's spiritual prep. So fidelity = **question fidelity + processional feel**,
   NOT manufacturing prayer/adoration as fields.
3. The constraint we want is a **processional environment, not enforcement** —
   gravity, not a gate (= CORE Process #1).

### Merida's intent (the standard)
Forming a *man*, not running a procedure; telos = adoration / beholding Christ;
test = Goldsworthy's "How did the sermon testify to Christ?" Dangers (the mechanical
tripwires): moralism, inserting Christ where he isn't, the heresy of application
(possible-as-necessary), imposed/clever outlines, information without transformation,
preaching only to believers. Source extracted from the pastor's own book:
`C:/Users/rossa/AppData/Local/Temp/merida_ext/MERIDA_PROSE.txt` +
`MERIDA_FIGURES_OCR.txt`. Fleet output: `tasks/wd613b60v.output`, `w5pbnuo6z.output`.

### The question provenance map
Tags: **[M]** faithful Merida · **[+]** addition (not in Merida) · **[◆]** gate-shaped
· **[⚠]** drifted off intent · **[✂]** Merida has it, app dropped it.

**Observe:** context before/after/impact **[M]**; *Holy-Spirit-intent* **[+]**;
surface where/when/how **[M]**; divisions hand-typed canvas **[M]**; characters/
commands-declarations/big-ideas/obvious-point **[M]**; Possible Implications
(early PC) **[+]**; 25-observations device **[✂]**; background **[✂, moved to series]**.

**Interpret:** deeper-context/recurring/character-purpose/contrasts/cross-refs/
commentary-last **[M]**; genre-as-field **[+]**; meaning_whole **[M]**; meaning_per_unit
**[M intent / ◆ mandatory-row grid]**.

**Redemptive:** this-passage-and-christ **[M]**; four pointing mechanisms **[M, near-verbatim]**;
gospel-makes-possible **[M]**; need/character **[M]**; statement **[M/+ named-outcome]**;
christ_per_unit **[⚠/◆ — mandatory every-row gate contradicts "some carry none, that's fine"]**.

**Implications:** theological-significance 5 Qs **[M, exact]**; personal-implications
4 verb-slots **[M/⚠ — missing necessary/probable/possible gradient]**; pastoral-context
**[+, the third voice]** **[⚠ "everyone" flattens prodigal/older-brother]**;
implications-synthesis **[+/◆, named outcome]**; implication_per_unit **[◆, least-Merida table]**.

**Anchor:** mpt draft/tighten **[M]**; **mps translate [⚠ — biggest drift: reduced to a
tense-swap; missing the fallen-condition-focus "why do my people need this"]**;
gospel_check **[M]**; tighten **[M]**; title + 3 AM test **[✂]**.

**Outline:** points **[M, free list]**.
**Equip (DRAFT):** scripture/explanation/illustration **[M, hierarchy]**; application
**[M/⚠ — missing idols-of-heart, two-brothers, evangelistic address]**.
**Frame:** intro 4 / conclusion 4 **[M]**; closing_posture **[+ forced choice]**.
**Manuscript (DRAFT):** intro/transitions/conclusion **[M/+ — re-asks Frame as prose;
the Frame→Manuscript split doubled the count]**.

### Contracts & rules the Merida changes touch
- **Green light:** CORE **Process #6** explicitly permits pedagogical evolution (question
  number/wording/named-outcome text) — covers all drifts + cuts; cost = mirror into SFDI/SADI.
- **Constitutional tier (cutting amends CORE):** Pastoral Context (Vocabulary +
  Process #4), early Possible Implications (Process #4), Implications Synthesis
  (named outcome / State), the named-outcome architecture (Process #6), the
  Frame→Manuscript split (State #2 stage model).
- **The per-unit gate:** CORE **Process #2** (named composites) + era-2 **Ruling 8** +
  the **pending SFDI N/A ruling** + **The Test Q4**.
- **OEM walk:** all construction-stage drifts defer to it (`project_oem_field_defs`).
- **RULES.md:** light (prompt changes are content; schema migration only if a JSON
  column is removed/re-keyed).

## Sources & provenance
- Merida source + fleet outputs (above).
- Memory: `project_refoundation_initiative`, `project_merida_intent_audit`,
  [[saturation-question]], [[cce-merida-source]], [[oem-field-defs]], [[project_ux_overhaul_state]].
- Question source files: `src/utils/studyFields.js`, `sadiAnchorFields.js`,
  `sermonOutlineFields.js`, `sermonEquipFields.js`, `sermonFrameFields.js`,
  `sermonManuscriptFields.js`; gates in `src/utils/studyAdvancement.js`.
- Contract surface: `docs/CORE.md`, `docs/RULES.md`, `docs/ANCHORS.md`, the SFDI/SADI
  charters + working docs, era-2 charter (Rulings 1/4/7/8), `sermon-workspace.md`.
