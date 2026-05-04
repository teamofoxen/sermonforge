# Sermon Anchor Definition Initiative — Working Document

**Status:** Drafted 2026-05-04. No walks started yet.
**Charter:** [`sadi-charter.md`](./sadi-charter.md) — the why, the boundaries, the approach.
**Vision sheet:** [`sadi-throughline-vision.md`](./sadi-throughline-vision.md) — the throughline arc kept in view during walks.
**Merida cross-reference:** `~/.claude/projects/C--Projects-SermonForge/memory/project_cce_merida_source.md` — the source SermonForge's structure was built from. Steps 2 and 5 sections are SADI-relevant.
**SFDI working doc:** [`study-field-definition-initiative.md`](./study-field-definition-initiative.md) — Phase 4 Field 4 (Implications Synthesis) is the upstream substrate for SADI's Step 2 walks.
**Field-state source of truth (today):** Step 2 fields (MPT/MPS) live inline in `src/components/StudyTab.jsx` (no central definitions yet); Step 5 fields (Intro/Conclusion) currently live in the Manuscript step until SPRD ships the Step 5 elevation.

---

## Adopted from SFDI

SADI adopts SFDI's [Field Pattern](study-field-definition-initiative.md#the-field-pattern) and [seven-slot entry structure](study-field-definition-initiative.md#the-sfdi-walk-entry--seven-slots) wholesale. Re-stated briefly:

- Each field is an isolated focused workspace with one or more questions in an ordered sequence.
- Each per-field walk produces a structured entry with seven slots: Name, Intent, Question sequence, What gets written, Role in step, Connects from, Connects to.
- Heavy-lifting fields open with a pre-field overview screen on first entry.
- The N/A escape valve operates per-field and per-question.
- Per-question paste rules: blocked or allowed.
- Per-cell no-AI policy: certain cells declare AI-write blocked.
- Composite per-field empty-evidence gating with hover-checklist on disabled Continue buttons.

The cumulative-column synthesis-table sub-shape (introduced in SFDI Phase 1 Field 4 Q3, extended by Phases 2/3/4) **may or may not** extend into Steps 2 and 5 — open question for SADI walks (see vision sheet).

PC progression markers per field follow the SFDI convention: explicit marker for heavy-lifting and named-outcome fields; phase-level summary for steps where PC is uniform across fields.

The canonical vocabulary from CORE.md applies: *field*, *question*, *answer*, *step*, *step boundary*, *throughline*, *named outcome*, *handoff*, *Pastoral Context*. SADI introduces no new vocabulary.

---

## Step 2 — MPT/MPS Forge

### Field order

1. **MPT** *(Main Point of the Text — past tense, single sentence, anchored in author's intended meaning)*
2. **MPS** *(Main Point of the Sermon — present/future tense, single sentence, derived from MPT, redemptive)*

Two fields. Likely one session per field, or one session for both.

*(Walks not yet started. Per-field entries land here as walks proceed.)*

---

### Field 1 — MPT

*(Walk not yet started.)*

**Anticipated shape (working notes for first walk):**

- Likely a single-question field (one sentence, past tense, what the text meant)
- Reads from: Implications Synthesis (Phase 4 Field 4 Q2) primarily; Interpretation Set (Phase 2 Field 7 Q2) as anchor; Cross-References + Commentary Notes for verification
- Heavy-lifting? Possibly — MPT is theologically substantive
- Per-cell no-AI? Strong candidate — the pastor's voice is the discipline (echoes SFDI Field 8 Obvious Point's no-AI policy, since MPT IS the matured Obvious Point)
- Connects from: Implications Synthesis
- Connects to: MPS

---

### Field 2 — MPS

*(Walk not yet started.)*

**Anticipated shape (working notes for first walk):**

- Likely a single-question field (one sentence, present/future tense, what this sermon does for this congregation)
- Reads from: MPT (just-written) primarily; Implications Synthesis for the room-context; Christ-Connection Statement to keep redemptive (anti-moralism)
- Heavy-lifting? Yes — this is where the gospel-power thread from Phase 3 Field 3 lands as application
- Per-cell no-AI? Open question — the existing Draft button suggests AI-augmentation is allowed, but maybe the pastor writes first and AI proposes refinement (proposal pattern per Mutation Contract #2)
- Connects from: MPT
- Connects to: Step 3 (Outline) — the MPS shapes how the body unfolds

---

## Within-step flow pass for Step 2

*(Lands after MPT and MPS are walked. Will name the step's named outcome — working candidate "Main Point Pair" — and articulate how MPT + MPS compose into it. Will identify the load-bearing field at the Step 2 → Step 3 boundary.)*

---

## The MPT/MPS → Outline handoff

*(Lands after the within-step flow pass. Articulates what Outline reads from Step 2's named outcome. The hard gate at the boundary: composite gate over MPT non-empty + MPS non-empty + MPS-derives-from-MPT structural check?)*

---

## Step 5 — Intro / Conclusion

### Field order

1. **Intro** *(Frames the listener for the body — opener + text introduction + MPT/MPS landing + redemptive promise + expectations)*
2. **Conclusion** *(Lands the body's call — summation + response invitation)*

Two fields. Likely one session per field, or one session for both.

*(Walks not yet started. Per-field entries land here as walks proceed.)*

---

### Field 1 — Intro

*(Walk not yet started.)*

**Anticipated shape (working notes for first walk):**

- Likely multi-question — Merida's Intro covers: opener, text intro, MPT/MPS landing, redemptive promise, expectations. Each could be a question inside one Intro field.
- Reads from: MPS primarily (frames the listener for what MPS asks); Implications Synthesis for room-context; Christ-Connection Statement for redemptive promise
- Heavy-lifting? Possibly — Intro carries weight in establishing the listener's posture
- Per-question paste/AI rules: open
- Connects from: Functional Elements (the body's named outcome)
- Connects to: Conclusion

**Possible question sequence (to ratify in walk):**

- Q1: Opener (story, problem, multimedia — pastor's choice; per Merida the four types)
- Q2: How the opener transitions into the text (introduce the passage, MPT, MPS)
- Q3: Redemptive promise — what the gospel offers in this sermon
- Q4: Expectations — what the listener will be called to do/believe/change

---

### Field 2 — Conclusion

*(Walk not yet started.)*

**Anticipated shape (working notes for first walk):**

- Likely two-question — Merida's Conclusion has two parts: Summation + Response.
- Reads from: Functional Elements (the body's outline + E/A/I); Christ-Connection Statement (so the response is gospel-driven, not moralistic); Intro (so the conclusion lands what the intro promised)
- Heavy-lifting? Possibly — the response is load-bearing for the sermon's call
- Per-question paste/AI rules: open
- Connects from: Intro
- Connects to: Step 5's named outcome (Sermon Frame), then Manuscript/Delivery

**Possible question sequence (to ratify in walk):**

- Q1: Summation — recap the MPS in fresh words; reinforce the body's main moves
- Q2: Response — call to action, with one of Merida's seven response types

---

## Within-step flow pass for Step 5

*(Lands after Intro and Conclusion are walked. Will name the step's named outcome — working candidate "Sermon Frame" — and articulate how Intro + Conclusion compose into it. Will identify the load-bearing field at the Step 5 → Manuscript boundary.)*

---

## The Step 5 → Manuscript / Delivery handoff

*(Lands after the within-step flow pass. Articulates what Manuscript/Delivery reads from Step 5's named outcome. The hard gate: composite gate over Intro non-empty + Conclusion non-empty + Conclusion-includes-response structural check?)*

---

## Open questions to settle during walks

1. **Does the cumulative thought-unit table extend into Steps 2 and 5?** SFDI's table reaches 6 columns by Phase 4. SADI walks decide whether MPT/MPS/Intro/Conclusion add columns or read the table whole.
2. **Process Contract #6 extension or new Process #7?** SADI may extend #6 to cover Steps 2 + 5, or trigger a new clause for sermon-anchor structure. Decision at first walk where the question surfaces.
3. **MPS Draft prompt rewrite scope.** SADI's MPS field walk produces the substantive content; SPRD ships the prompt rewrite that drops PC-tier-weighting and reads the Implications Synthesis directly. SADI doesn't write the prompt; SADI defines what the prompt should read.
4. **Step 5 elevation timing.** SPRD has Step 5 (Intro/Conclusion as its own workspace step) in backlog. Does SPRD ship before or after SADI's Intro/Conclusion walks? Either order works; document which lands first.
5. **Per-cell no-AI policy on MPT.** Strong candidate (echoes SFDI Field 8 Obvious Point), but defer to walk.

---

*Skeleton document. No fields walked yet. Walks proceed in-session per the charter's "How to start a session."*
