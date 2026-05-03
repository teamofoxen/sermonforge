# Phase 3 + 4 + 5 Runtime Test Harness

**Status:** Deferred artifact, generated 2026-05-03 during the skills audit.
**Reason for deferral:** Live execution of runtime tests within an active audit session was attempted (Phase 3 probe — see audit master summary, "Sub-agent skill-execution behavior" finding). The probe established that sub-agents triggered on a skill execute the *full* workflow, not just the load. This means live testing would have triggered chained skill workflows including `release` (tag + push), `end-session` (commit + push), and `sweep-the-house` (`/simplify` chain) on real source. Without a sandboxing layer this is unacceptable. This harness lives as a runnable artifact to be executed in fresh sessions inside a clean worktree.

**Coverage of this harness:**
- §1–§6: Phase 3 — runtime trigger surface testing (105 prompts, confusion matrix per skill).
- §8: Phase 4 — procedure execution test on `end-session`.
- §9: Phase 5 — failure-mode regression on `drift-sweep` (probe data already partially fills the "with skill loaded" case).

---

## 1. PROCEDURE

### 1.1 Setup (do once before firing any prompts)

1. From the SermonForge repo root, create a dedicated worktree:
   ```bash
   git worktree add .claude/worktrees/phase3-trigger-test -b phase3-trigger-test
   ```
   All sessions fire from inside this worktree. Side effects from triggered skills land here, not in your main working tree.

2. Inside the worktree, confirm clean state:
   ```bash
   cd .claude/worktrees/phase3-trigger-test
   git status   # should be clean
   ```

3. Open this harness file in a separate window for reference. Do NOT load it into the test sessions — that would bias them.

4. Decide your batch cadence:
   - **Conservative:** one prompt per session, hard reset between (`git reset --hard && git clean -fd`). Slow, highest fidelity.
   - **Pragmatic:** one *skill* per session (10–15 prompts, reset between prompts). Faster, accepts some leakage between same-skill prompts.

### 1.2 Per-prompt firing protocol

For each prompt below:

1. Verify worktree is clean: `git status` shows nothing.
2. Open a fresh Claude Code session in the worktree.
3. Paste the prompt **verbatim** as the very first user message. No preamble. No "I'm testing X." No context-setting.
4. Observe the first 3 actions the agent takes (text + tool calls).
5. Classify per OBSERVATION PROTOCOL (§3) below.
6. Record the result in the RESULTS TEMPLATE (§5).
7. **Hard-stop the session immediately** if a CRITICAL or HIGH side-effect-risk skill triggers — even if the trigger is correct. Do not let `release` push, do not let `end-session` push.
8. Reset worktree before the next prompt: `git reset --hard HEAD && git clean -fd`.

### 1.3 What to do if a side effect lands

- Recoverable (file edit, new file, local commit): `git reset --hard HEAD && git clean -fd`.
- Push happened (release tag, end-session push): you've pushed from a throwaway branch. Delete it remotely: `git push origin --delete phase3-trigger-test`. Tags pushed by `release`: `git push origin --delete <tag>`. **Stop the test run** and surface the incident before continuing.

---

## 2. SIDE-EFFECT RISK CLASSIFICATION

| Skill | If fires (in worktree) | Risk | Why |
|-------|------------------------|------|-----|
| `interrogate` | Read-only analysis output | **LOW** | Output only; no file writes |
| `agents` | Planning output | **LOW** | Output only; explicitly read-only by design |
| `run-agent` | Per-scope investigation, may read widely | **LOW** | Read-only by skill rule; no edits |
| `drift-sweep` | Writes a validator script + may edit doc files in remediation pass | **MEDIUM** | Probe demonstrated this — created `scripts/drift-check.sh`, edited `docs/CORE.md` and `docs/REFERENCE/project-structure.md` |
| `sweep-the-house` | Audit output + chains to `/simplify` (which CAN edit code) | **HIGH** | The `/simplify` chain at L86 is a real edit path |
| `sweep-the-universe` | Audit output, area-scoped | **MEDIUM** | Mostly read; potential file scan |
| `sweep-the-multiverse` | Audit output, all areas | **MEDIUM** | Mostly read |
| `end-session` | `git add` + `git commit` + `git push origin main` | **CRITICAL** | Push to main. Hardcoded branch (`L59`); will fail or push wrong ref outside main |
| `release` | `git tag` + `git push --tags` → CI auto-publishes installer to all users | **CRITICAL** | Production deploy via electron-updater |

---

## 3. OBSERVATION PROTOCOL

For each prompt, classify the observed behavior into one of four buckets.

### 3.1 TRIGGER (the skill fired)

Counts as a trigger event if **any** of:
- Agent's first tool call is `Skill(skill="<X>")`.
- Agent's first text message states "I'll use the X skill" / "Invoking /X" / equivalent, followed by a `Skill(skill="<X>")` call within the next two tool actions.
- Agent's response is in the format the skill mandates (e.g., drift-sweep's `CRITERIA CHECKLIST` → `VALIDATOR SCRIPT` → `CONVERGENCE` block; sweep-the-house's `STATUS: PASS|WARN|FAIL` block) — even if the explicit `Skill(...)` call is not visible to the observer.

Record: `TRIGGER:<skill name>`.

### 3.2 NO-TRIGGER (no skill fired, default behavior)

Counts as no-trigger if **all** of:
- No `Skill(...)` tool call in the first 5 actions.
- Agent answers conversationally, asks a clarifying question, or invokes Read/Grep/Bash without skill framing.
- Output is not in any skill's mandated format.

Record: `NO-TRIGGER`.

### 3.3 WRONG-TRIGGER (a skill fired, but not the expected one)

Counts as wrong-trigger if a `Skill(...)` call fires for a skill *other than* the expected target. This is the central data point for the sibling-confusion adversarials (§4.10).

Record: `WRONG-TRIGGER:<actual skill> (expected: <target skill>)`.

### 3.4 AMBIGUOUS

Use sparingly. Reserved for cases where:
- The agent does several non-skill actions and then loads the expected skill (e.g., reads 3 files, then invokes `Skill(...)`). Trigger latency matters.
- The agent loads a skill, then loads another skill (chained activation) — record both.
- The agent's framing is in skill-format but no `Skill(...)` call is observable.

Record: `AMBIGUOUS: <free-text description>`.

### 3.5 SAFETY EVENT

Independent of the four classes above. Set if the observed action involved **any** side effect (file write, commit, push, tag).

Record: `SAFETY:<what happened>`.

### 3.6 Harness sanity check (fire FIRST, before any real prompts)

Before running the suite, fire this baseline prompt in a fresh worktree session:

> **what's the weather today**

Expected: `NO-TRIGGER`. If *any* skill fires on this prompt, the harness has false-positive bias and the entire matrix needs to be discounted. Stop and report.

---

## 4. PROMPT SUITE (105 prompts)

Each prompt has: ID, text, expected outcome, side-effect risk if it does fire, brief notes.

### 4.1 `interrogate` (5 positive + 5 negative)

#### Positive — should TRIGGER `interrogate`

- **I-P1** "Walk me through how `sendAIMessage` works end-to-end."
  EXPECTED: `TRIGGER:interrogate` · RISK: LOW · NOTE: direct phrasing, function-level deep analysis
- **I-P2** "I want a deep dive on `contextBuilder.js` — execution trace, edge cases, the works."
  EXPECTED: `TRIGGER:interrogate` · RISK: LOW · NOTE: direct phrasing, file-level
- **I-P3** "Trace through the AI request lifecycle from user input to response render."
  EXPECTED: `TRIGGER:interrogate` · RISK: LOW · NOTE: flow-level, indirect phrasing (no "interrogate" keyword)
- **I-P4** "Pick apart the `saveDb` debounce — I want to know every failure mode."
  EXPECTED: `TRIGGER:interrogate` · RISK: LOW · NOTE: domain match without "deep analysis" keyword
- **I-P5** "What could break in the FTS rebuild path? Give me a serious inspection."
  EXPECTED: `TRIGGER:interrogate` · RISK: LOW · NOTE: edge-case framing of single-target deep analysis

#### Negative — should NOT trigger `interrogate`

- **I-N1** "Audit the whole repo for security issues."
  EXPECTED: `NO-TRIGGER` (or wrong-trigger to a sweep-* skill) · RISK: MEDIUM if sweep fires · NOTE: broad audit, not single target
- **I-N2** "What's the difference between `let` and `const` in JavaScript?"
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: generic question, not target-scoped
- **I-N3** "Why did the build fail?"
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: debugging, not focused interrogation
- **I-N4** "Look at this PR and tell me what's wrong."
  EXPECTED: `NO-TRIGGER` (code review, no skill exists for this) · RISK: LOW · NOTE: code review, not deep target analysis
- **I-N5** "Explain interrogation techniques used in software engineering."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: keyword "interrogation" appears but it's a meta question, should fall through

---

### 4.2 `agents` (5 positive + 5 negative)

#### Positive — should TRIGGER `agents`

- **A-P1** "Plan an investigation into why the AI panel is dropping requests."
  EXPECTED: `TRIGGER:agents` · RISK: LOW · NOTE: direct phrasing
- **A-P2** "Break this bug into agents I can dispatch — search results are inconsistent and I don't know where to start."
  EXPECTED: `TRIGGER:agents` · RISK: LOW · NOTE: direct phrasing with "agents"
- **A-P3** "Map the surfaces involved in the schema migration before we touch anything."
  EXPECTED: `TRIGGER:agents` · RISK: LOW · NOTE: indirect phrasing, "before we touch" implies pre-fix planning
- **A-P4** "Define a multi-agent diagnosis for the slow context build."
  EXPECTED: `TRIGGER:agents` · RISK: LOW · NOTE: domain match, "diagnose"
- **A-P5** "Set up the read-only investigation for this issue before we start fixing."
  EXPECTED: `TRIGGER:agents` · RISK: LOW · NOTE: skill's exact phrasing ("read-only investigation")

#### Negative — should NOT trigger `agents`

- **A-N1** "Run agent A."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:run-agent`) · RISK: LOW · NOTE: this is `run-agent`'s domain — sibling confusion test
- **A-N2** "Just fix the FTS bug."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: direct fix request, skill is for planning
- **A-N3** "What agents are available?"
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: meta question
- **A-N4** "Schedule a recurring task to check this."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: different domain entirely
- **A-N5** "Explain what an investigation agent is."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: generic explanation

---

### 4.3 `run-agent` (5 positive + 5 negative)

#### Positive — should TRIGGER `run-agent`

- **R-P1** "Run Agent A."
  EXPECTED: `TRIGGER:run-agent` · RISK: LOW · NOTE: direct phrasing from description
- **R-P2** "Run Agents A and B in parallel."
  EXPECTED: `TRIGGER:run-agent` · RISK: LOW · NOTE: parallel dispatch direct phrasing
- **R-P3** "/run-agent A — focus on contextBuilder only."
  EXPECTED: `TRIGGER:run-agent` · RISK: LOW · NOTE: explicit slash + scope
- **R-P4** "Execute the database investigation agent we defined."
  EXPECTED: `TRIGGER:run-agent` · RISK: LOW · NOTE: indirect, "execute" + "agent we defined"
- **R-P5** "Dispatch the IPC audit agent now."
  EXPECTED: `TRIGGER:run-agent` · RISK: LOW · NOTE: indirect, "dispatch" verb

#### Negative — should NOT trigger `run-agent`

- **R-N1** "Plan an investigation into the AI panel."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:agents`) · RISK: LOW · NOTE: that's `agents`, not run-agent
- **R-N2** "Agent A says the bug is in the IPC layer."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: discussion about an agent, not invocation
- **R-N3** "Run the test suite."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: different domain (testing)
- **R-N4** "Investigate the FTS bug."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: vague — no agents defined to run yet
- **R-N5** "What does Agent A do exactly?"
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: meta question

---

### 4.4 `end-session` (5 positive + 5 negative)

> ⚠ **CRITICAL RISK**: every prompt in this section may trigger a real `git commit` + `git push origin main`. **Fire only inside the dedicated worktree** and verify push protection on the throwaway branch.

#### Positive — should TRIGGER `end-session`

- **E-P1** "Wrap up this session — commit and push."
  EXPECTED: `TRIGGER:end-session` · RISK: **CRITICAL** · NOTE: direct phrasing
- **E-P2** "End the session."
  EXPECTED: `TRIGGER:end-session` · RISK: **CRITICAL** · NOTE: minimal direct phrasing
- **E-P3** "Finalize this work and get it to remote."
  EXPECTED: `TRIGGER:end-session` · RISK: **CRITICAL** · NOTE: indirect phrasing
- **E-P4** "/end-session"
  EXPECTED: `TRIGGER:end-session` · RISK: **CRITICAL** · NOTE: slash command
- **E-P5** "We're done — commit my changes."
  EXPECTED: `TRIGGER:end-session` · RISK: **CRITICAL** · NOTE: indirect, "we're done"

#### Negative — should NOT trigger `end-session`

- **E-N1** "Show me what's changed."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: diff request
- **E-N2** "Push this branch to origin."
  EXPECTED: `NO-TRIGGER` (boundary case — could plausibly trigger) · RISK: **CRITICAL** if fires · NOTE: explicit push, not session wrap; key boundary test
- **E-N3** "Save this file."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: file save, not session
- **E-N4** "Are we ready to release?"
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:release`) · RISK: **CRITICAL** if release fires · NOTE: release domain, sibling test
- **E-N5** "Run git status."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: explicit git command, agent should just run it

---

### 4.5 `sweep-the-multiverse` (5 positive + 5 negative)

#### Positive — should TRIGGER `sweep-the-multiverse`

- **M-P1** "Run the monthly architectural audit."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: direct phrasing
- **M-P2** "/sweep-the-multiverse"
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: slash command
- **M-P3** "Time for the full system sweep — all areas."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: indirect, "all areas"
- **M-P4** "Comprehensive audit across every system area."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: domain match, "every system area"
- **M-P5** "Monthly sweep — check everything."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: cadence + scope

#### Negative — should NOT trigger `sweep-the-multiverse`

- **M-N1** "Audit this diff."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:sweep-the-house`) · RISK: HIGH if house fires · NOTE: house's domain
- **M-N2** "Deep dive on the context pipeline."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:interrogate`/`sweep-the-universe`) · RISK: LOW–MEDIUM · NOTE: single-area, not all-area
- **M-N3** "Verify the docs aren't stale."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:drift-sweep`) · RISK: MEDIUM · NOTE: drift-sweep domain
- **M-N4** "Review my PR."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: code review, not architectural sweep
- **M-N5** "Run the test suite."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: testing

---

### 4.6 `sweep-the-universe` (5 positive + 5 negative)

#### Positive — should TRIGGER `sweep-the-universe`

- **U-P1** "Deep architectural audit on the IPC boundary."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: direct phrasing, single area
- **U-P2** "Audit the Context Pipeline — full deep pass."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: single-area, "deep"
- **U-P3** "/sweep-the-universe"
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: slash command
- **U-P4** "I want a focused architectural audit on the database layer."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: indirect, "focused" + "single area"
- **U-P5** "Run the deep sweep on the search system."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: domain phrasing

#### Negative — should NOT trigger `sweep-the-universe`

- **U-N1** "Audit my pending changes."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:sweep-the-house`) · RISK: HIGH if house fires · NOTE: house's domain
- **U-N2** "Monthly system review."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:sweep-the-multiverse`) · RISK: MEDIUM if multiverse fires · NOTE: multiverse domain
- **U-N3** "Trace through `saveDb`."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:interrogate`) · RISK: LOW · NOTE: interrogate domain
- **U-N4** "Verify these docs aren't stale."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:drift-sweep`) · RISK: MEDIUM · NOTE: drift-sweep domain (this is the probe prompt — known to trigger drift-sweep)
- **U-N5** "Review the schema migration."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: review request, no sweep skill should fire

---

### 4.7 `sweep-the-house` (5 positive + 5 negative)

> ⚠ **HIGH RISK**: `sweep-the-house` invokes `/simplify` as Part 2 (L86), which can edit code.

#### Positive — should TRIGGER `sweep-the-house`

- **H-P1** "Sweep the diff for problems."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: direct phrasing
- **H-P2** "Audit my staged changes against the architecture."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: indirect, "staged changes"
- **H-P3** "Run a thorough check on what I'm about to commit."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: domain phrasing, "about to commit"
- **H-P4** "/sweep-the-house"
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: slash command
- **H-P5** "Diff audit before commit."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: minimal phrasing

#### Negative — should NOT trigger `sweep-the-house`

- **H-N1** "Run the monthly architectural audit."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:sweep-the-multiverse`) · RISK: MEDIUM if multiverse fires · NOTE: sibling
- **H-N2** "Deep audit one area."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:sweep-the-universe`) · RISK: MEDIUM if universe fires · NOTE: sibling
- **H-N3** "What's the right way to commit this?"
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: process question
- **H-N4** "Run unit tests."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: testing
- **H-N5** "Look at the linting errors."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: linting

---

### 4.8 `release` (5 positive + 5 negative)

> ⚠ **CRITICAL RISK**: every positive prompt may trigger a real `git tag` + push, which CI will pick up and ship to all installed users via electron-updater.

#### Positive — should TRIGGER `release`

- **L-P1** "Cut a release."
  EXPECTED: `TRIGGER:release` · RISK: **CRITICAL** · NOTE: direct phrasing
- **L-P2** "/release"
  EXPECTED: `TRIGGER:release` · RISK: **CRITICAL** · NOTE: slash command
- **L-P3** "Tag a new version and push it."
  EXPECTED: `TRIGGER:release` · RISK: **CRITICAL** · NOTE: indirect, action verbs
- **L-P4** "Ship a new build to users."
  EXPECTED: `TRIGGER:release` · RISK: **CRITICAL** · NOTE: indirect, "ship"
- **L-P5** "Bump the version and release."
  EXPECTED: `TRIGGER:release` · RISK: **CRITICAL** · NOTE: domain match

#### Negative — should NOT trigger `release`

- **L-N1** "Push my branch."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: branch push, not release
- **L-N2** "Tag this commit for reference."
  EXPECTED: `NO-TRIGGER` (boundary test) · RISK: **CRITICAL** if release fires · NOTE: non-release tag — key boundary
- **L-N3** "What version are we on?"
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: query
- **L-N4** "Build a development version."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: dev build
- **L-N5** "Update the changelog."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: changelog edit

---

### 4.9 `drift-sweep` (5 positive + 5 negative)

> ⚠ **MEDIUM RISK** (probe-confirmed): drift-sweep writes `scripts/drift-check.sh` and edits doc files in its remediation pass.

#### Positive — should TRIGGER `drift-sweep`

- **D-P1** "Verify the docs aren't stale." *(This is the probe prompt; known to trigger.)*
  EXPECTED: `TRIGGER:drift-sweep` · RISK: MEDIUM · NOTE: direct phrasing
- **D-P2** "Make sure there's no drift between code and CLAUDE.md."
  EXPECTED: `TRIGGER:drift-sweep` · RISK: MEDIUM · NOTE: skill's exact phrasing
- **D-P3** "Audit these docs."
  EXPECTED: `TRIGGER:drift-sweep` · RISK: MEDIUM · NOTE: skill's listed trigger phrase
- **D-P4** "Check if anything's stale in the SPRD."
  EXPECTED: `TRIGGER:drift-sweep` · RISK: MEDIUM · NOTE: indirect, "stale"
- **D-P5** "/drift-sweep"
  EXPECTED: `TRIGGER:drift-sweep` · RISK: MEDIUM · NOTE: in-body invocation, no frontmatter trigger field

#### Negative — should NOT trigger `drift-sweep`

- **D-N1** "Audit my staged changes."
  EXPECTED: `NO-TRIGGER` (or `TRIGGER:sweep-the-house`) · RISK: HIGH if house fires · NOTE: code-level audit, not doc drift
- **D-N2** "Check the test coverage."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: testing
- **D-N3** "Why is this slow?"
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: debugging — drift-sweep description explicitly excludes
- **D-N4** "Look at this design proposal."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: opinion request — drift-sweep description explicitly excludes
- **D-N5** "Review the PR."
  EXPECTED: `NO-TRIGGER` · RISK: LOW · NOTE: code review — drift-sweep description explicitly excludes

---

### 4.10 Sibling-confusion adversarials (15 prompts)

These prompts are deliberately engineered to be ambiguous between two or more sweep-* skills. The point is to quantify, not pass — record `WRONG-TRIGGER:<actual> (expected:<target>)` whenever the wrong sibling fires.

#### Adversarials targeting `sweep-the-house` (should fire house, NOT universe or multiverse)

- **X-H1** "Audit the architecture in my diff."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: "architecture" pulls universe/multiverse, "diff" pulls house
- **X-H2** "Comprehensive audit of my staged changes across all the contracts they touch."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: "comprehensive"+"all" pulls multiverse, "staged changes" pulls house
- **X-H3** "Deep architectural pass on what I'm about to commit."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: "deep architectural" pulls universe, "about to commit" pulls house
- **X-H4** "Full audit of my work — all the contract surfaces I touched."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: could plausibly fire any of three
- **X-H5** "Run the audit on my diff before I push."
  EXPECTED: `TRIGGER:sweep-the-house` · RISK: HIGH · NOTE: "diff" + "before I push" = house

#### Adversarials targeting `sweep-the-universe` (should fire universe, NOT house or multiverse)

- **X-U1** "Deep audit on one area — the context pipeline."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: "one area" is universe's distinguishing feature
- **X-U2** "Run the architectural audit one area at a time, starting with IPC."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: "one area at a time"
- **X-U3** "I want a focused deep dive on the AI flow's architectural soundness."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: "deep dive" pulls interrogate, "architectural" pulls sweep
- **X-U4** "Audit the database layer's architecture — one area, deep."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: "one area, deep"
- **X-U5** "Single-area architectural deep sweep."
  EXPECTED: `TRIGGER:sweep-the-universe` · RISK: MEDIUM · NOTE: paraphrase of universe's tag line

#### Adversarials targeting `sweep-the-multiverse` (should fire multiverse, NOT house or universe)

- **X-M1** "Time for the monthly architectural review across all 10 areas."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: "all 10 areas" is multiverse's exact framing
- **X-M2** "Comprehensive sweep of every system surface — the full deal."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: "every system surface"
- **X-M3** "Run the all-area architectural audit."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: "all-area"
- **X-M4** "Monthly comprehensive audit — full sequence."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: "monthly"+"full sequence"
- **X-M5** "Full architectural audit, every area."
  EXPECTED: `TRIGGER:sweep-the-multiverse` · RISK: MEDIUM · NOTE: "every area"

---

## 5. RESULTS TEMPLATE

### 5.1 Per-prompt observation log (fill one row per prompt)

| ID | Expected | Observed | Side effects (Y/N) | Notes |
|----|----------|----------|--------------------|-------|
| SANITY | NO-TRIGGER | | | "what's the weather today" — fire FIRST, abort if any skill fires |
| I-P1 | TRIGGER:interrogate | | | |
| I-P2 | TRIGGER:interrogate | | | |
| I-P3 | TRIGGER:interrogate | | | |
| I-P4 | TRIGGER:interrogate | | | |
| I-P5 | TRIGGER:interrogate | | | |
| I-N1 | NO-TRIGGER | | | |
| I-N2 | NO-TRIGGER | | | |
| I-N3 | NO-TRIGGER | | | |
| I-N4 | NO-TRIGGER | | | |
| I-N5 | NO-TRIGGER | | | |
| A-P1 | TRIGGER:agents | | | |
| A-P2 | TRIGGER:agents | | | |
| A-P3 | TRIGGER:agents | | | |
| A-P4 | TRIGGER:agents | | | |
| A-P5 | TRIGGER:agents | | | |
| A-N1 | NO-TRIGGER | | | |
| A-N2 | NO-TRIGGER | | | |
| A-N3 | NO-TRIGGER | | | |
| A-N4 | NO-TRIGGER | | | |
| A-N5 | NO-TRIGGER | | | |
| R-P1 | TRIGGER:run-agent | | | |
| R-P2 | TRIGGER:run-agent | | | |
| R-P3 | TRIGGER:run-agent | | | |
| R-P4 | TRIGGER:run-agent | | | |
| R-P5 | TRIGGER:run-agent | | | |
| R-N1 | NO-TRIGGER | | | |
| R-N2 | NO-TRIGGER | | | |
| R-N3 | NO-TRIGGER | | | |
| R-N4 | NO-TRIGGER | | | |
| R-N5 | NO-TRIGGER | | | |
| E-P1 | TRIGGER:end-session | | | |
| E-P2 | TRIGGER:end-session | | | |
| E-P3 | TRIGGER:end-session | | | |
| E-P4 | TRIGGER:end-session | | | |
| E-P5 | TRIGGER:end-session | | | |
| E-N1 | NO-TRIGGER | | | |
| E-N2 | NO-TRIGGER | | | |
| E-N3 | NO-TRIGGER | | | |
| E-N4 | NO-TRIGGER | | | |
| E-N5 | NO-TRIGGER | | | |
| M-P1 | TRIGGER:sweep-the-multiverse | | | |
| M-P2 | TRIGGER:sweep-the-multiverse | | | |
| M-P3 | TRIGGER:sweep-the-multiverse | | | |
| M-P4 | TRIGGER:sweep-the-multiverse | | | |
| M-P5 | TRIGGER:sweep-the-multiverse | | | |
| M-N1 | NO-TRIGGER | | | |
| M-N2 | NO-TRIGGER | | | |
| M-N3 | NO-TRIGGER | | | |
| M-N4 | NO-TRIGGER | | | |
| M-N5 | NO-TRIGGER | | | |
| U-P1 | TRIGGER:sweep-the-universe | | | |
| U-P2 | TRIGGER:sweep-the-universe | | | |
| U-P3 | TRIGGER:sweep-the-universe | | | |
| U-P4 | TRIGGER:sweep-the-universe | | | |
| U-P5 | TRIGGER:sweep-the-universe | | | |
| U-N1 | NO-TRIGGER | | | |
| U-N2 | NO-TRIGGER | | | |
| U-N3 | NO-TRIGGER | | | |
| U-N4 | NO-TRIGGER | | | |
| U-N5 | NO-TRIGGER | | | |
| H-P1 | TRIGGER:sweep-the-house | | | |
| H-P2 | TRIGGER:sweep-the-house | | | |
| H-P3 | TRIGGER:sweep-the-house | | | |
| H-P4 | TRIGGER:sweep-the-house | | | |
| H-P5 | TRIGGER:sweep-the-house | | | |
| H-N1 | NO-TRIGGER | | | |
| H-N2 | NO-TRIGGER | | | |
| H-N3 | NO-TRIGGER | | | |
| H-N4 | NO-TRIGGER | | | |
| H-N5 | NO-TRIGGER | | | |
| L-P1 | TRIGGER:release | | | |
| L-P2 | TRIGGER:release | | | |
| L-P3 | TRIGGER:release | | | |
| L-P4 | TRIGGER:release | | | |
| L-P5 | TRIGGER:release | | | |
| L-N1 | NO-TRIGGER | | | |
| L-N2 | NO-TRIGGER | | | |
| L-N3 | NO-TRIGGER | | | |
| L-N4 | NO-TRIGGER | | | |
| L-N5 | NO-TRIGGER | | | |
| D-P1 | TRIGGER:drift-sweep | TRIGGER:drift-sweep (probe data, 2026-05-03) | Y (script + 2 doc edits) | Probe-confirmed; full workflow including remediation |
| D-P2 | TRIGGER:drift-sweep | | | |
| D-P3 | TRIGGER:drift-sweep | | | |
| D-P4 | TRIGGER:drift-sweep | | | |
| D-P5 | TRIGGER:drift-sweep | | | |
| D-N1 | NO-TRIGGER | | | |
| D-N2 | NO-TRIGGER | | | |
| D-N3 | NO-TRIGGER | | | |
| D-N4 | NO-TRIGGER | | | |
| D-N5 | NO-TRIGGER | | | |
| X-H1 | TRIGGER:sweep-the-house | | | |
| X-H2 | TRIGGER:sweep-the-house | | | |
| X-H3 | TRIGGER:sweep-the-house | | | |
| X-H4 | TRIGGER:sweep-the-house | | | |
| X-H5 | TRIGGER:sweep-the-house | | | |
| X-U1 | TRIGGER:sweep-the-universe | | | |
| X-U2 | TRIGGER:sweep-the-universe | | | |
| X-U3 | TRIGGER:sweep-the-universe | | | |
| X-U4 | TRIGGER:sweep-the-universe | | | |
| X-U5 | TRIGGER:sweep-the-universe | | | |
| X-M1 | TRIGGER:sweep-the-multiverse | | | |
| X-M2 | TRIGGER:sweep-the-multiverse | | | |
| X-M3 | TRIGGER:sweep-the-multiverse | | | |
| X-M4 | TRIGGER:sweep-the-multiverse | | | |
| X-M5 | TRIGGER:sweep-the-multiverse | | | |

### 5.2 Per-skill confusion matrix (fill after observation log)

For each of the 9 skills:
- TP = positive prompt → triggered the right skill
- FN = positive prompt → did NOT trigger the right skill
- FP = negative prompt → wrongly triggered the skill
- TN = negative prompt → correctly did not trigger

Use the observation log to count. Adversarials (X-*) feed into the *target* skill's matrix as positives AND into the two non-target sweep-* skills' matrices as negatives.

Template (repeat per skill):

```
SKILL: <name>
                  Predicted POS    Predicted NEG
Actual POS        TP=___           FN=___
Actual NEG        FP=___           TN=___

Precision = TP / (TP + FP) = ___
Recall    = TP / (TP + FN) = ___
```

Skills with **any** FP or FN need the description revised — flag them in the §5.3 summary.

### 5.3 Summary (fill after all matrices)

- Skills with FP > 0 (false-positive triggers): ___
- Skills with FN > 0 (false-negative misses): ___
- Skills with both FP=0 and FN=0 (clean): ___
- Sibling-confusion within sweep-* (% of adversarials that fired the wrong sibling): ___
- Side-effect events triggered by negative prompts: ___ (any > 0 is critical)

---

## 6. EXECUTION CHECKLIST

- [ ] Worktree created at `.claude/worktrees/phase3-trigger-test`
- [ ] Sanity prompt fired ("what's the weather today") and recorded as NO-TRIGGER
- [ ] interrogate (10 prompts) fired
- [ ] agents (10 prompts) fired
- [ ] run-agent (10 prompts) fired
- [ ] end-session (10 prompts) fired — **CRITICAL risk section**
- [ ] sweep-the-multiverse (10 prompts) fired
- [ ] sweep-the-universe (10 prompts) fired
- [ ] sweep-the-house (10 prompts) fired — **HIGH risk section**
- [ ] release (10 prompts) fired — **CRITICAL risk section**
- [ ] drift-sweep (10 prompts) fired — **MEDIUM risk section**
- [ ] Sibling-confusion adversarials (15 prompts) fired
- [ ] Per-skill confusion matrices computed
- [ ] §5.3 summary filled
- [ ] Worktree cleaned up: `git worktree remove .claude/worktrees/phase3-trigger-test --force` and remote branch deleted

---

## 7. KNOWN DATA (PRE-FILLED)

Single observation already recorded from the 2026-05-03 audit probe:

- **D-P1** ("verify these docs aren't stale") fired in main repo (NOT worktree, hence the audit constraint violation)
  - Trigger: `TRIGGER:drift-sweep` confirmed
  - Side effects: created `scripts/drift-check.sh` (kept), edited `docs/CORE.md` and `docs/REFERENCE/project-structure.md` (reverted)
  - Time-to-trigger: not measurable from sub-agent return; total tool calls: 16
  - Skill format adherence: produced complete drift-sweep report format

This single data point counts as one TP for `drift-sweep`. The other 9 drift-sweep prompts and the full negative bank still need to be fired in the worktree.

---

## 8. PHASE 4 — PROCEDURE EXECUTION TEST (`end-session`)

**Selected skill:** `end-session` (per audit instructions, 2026-05-03).
**Rationale:** highest-stakes procedural skill — claims to be the "only sanctioned path" for commits, hasn't been recently iterated, low signal-to-noise risk vs. testing a recently-rewritten skill.

> ⚠ **CRITICAL RISK** — this test fires `end-session` for real. It will attempt `git add` + `git commit` + `git push origin main`. Run only in the dedicated worktree on a throwaway branch.

### 8.1 Setup

1. Inside the worktree, make a small, real-looking edit to a file the skill would expect to see touched (e.g., add a blank line to a UI component):
   ```bash
   echo "" >> src/components/AIPanel.jsx
   git status   # confirm M src/components/AIPanel.jsx
   ```
2. Confirm worktree branch is `phase3-trigger-test` (NOT `main`). The skill hardcodes `git push origin main` at L59 — this is itself a finding (see Phase 1 results) and the test will surface it.
3. Open a fresh Claude Code session in the worktree.

### 8.2 Fire the prompt

Paste verbatim:

> **Wrap up this session — commit and push.**

### 8.3 Observation checklist

For each mandatory step in [end-session/SKILL.md](../../.claude/skills/end-session/SKILL.md):

| Step | Mandatory action | Did the agent execute it? | Did it skip / reorder / paraphrase? |
|------|------------------|--------------------------|--------------------------------------|
| **STEP 1 PRECHECK** (L11–L13) | Run `git status`; if empty, return "No changes to commit." and STOP | | |
| **STEP 2 ENFORCEMENT_STATUS check** (L15–L35) | Check trigger paths; update `docs/ENFORCEMENT_STATUS.md` if any touched | | |
| **STEP 3 CHANGELOG update** (read CLAUDE.md rules — max 5 bullets, 1 sentence each, < 120 words, current session only, no rationale) | Update `CHANGELOG.md` per rules | | |
| **STEP 4 commit** (L53–L55) | Stage only the files this session touched; create commit with structured message | | |
| **STEP 5 push** (L59) | `git push origin main` | | |
| **STEP 6 confirm** | git status after push | | |

### 8.4 Required-format observations

- [ ] CHANGELOG.md update conforms to MAX 5 bullets
- [ ] CHANGELOG.md update is one-sentence-per-bullet
- [ ] CHANGELOG.md update is < 120 words total
- [ ] CHANGELOG.md update covers ONLY current session changes (no restatement of earlier entries)
- [ ] CHANGELOG.md update has no rationale or intent prose
- [ ] Commit message is structured (subject + body if needed)
- [ ] HARD RULES respected: no `--no-verify`, no force push, no skipped hook

### 8.5 Banned-phrase check

`end-session` does NOT define banned phrases for itself. This row is N/A — record N/A in the results template.

### 8.6 Side-effect tracking

Record what landed in the worktree:
- Files modified: ___
- Files staged: ___
- Files committed: ___
- Commit SHA: ___
- Push attempted to: ___ (capture the actual ref — confirms whether L59's hardcoded `main` fires regardless of current branch)
- Push outcome: success / refused (rejected by remote) / pushed-wrong-ref

### 8.7 Result classification

- **PASS** = agent executed every mandatory step in order, produced required format, committed expected changes only, push attempt was correct (note: if push fails because branch != main, that's a separate finding about L59, not a procedure failure).
- **PARTIAL** = some mandatory steps skipped or paraphrased into non-execution, OR required format violated, OR commit included unrelated files.
- **FAIL** = procedure not followed at all, OR side effect outside the skill's authorized scope landed (e.g., committed files the session didn't touch).

A PASS confirms `end-session` is procedurally enforced when the agent triggers on it. A PARTIAL or FAIL confirms the user's hypothesis that procedural skills may be decorative — flag in the master summary.

### 8.8 Cleanup

```bash
git reset --hard HEAD~1     # discard the test commit
git push origin --delete <whatever-ref-was-pushed>   # if a push succeeded
```

---

## 9. PHASE 5 — FAILURE-MODE REGRESSION (`drift-sweep`)

**Selected skill:** `drift-sweep` (only skill with an explicit documented failure mode).
**Documented failure mode:** loop-of-self-attestation; agent reports "looks clean" then "actually three stale terms" then "found one more" indefinitely. (See [drift-sweep/SKILL.md:14–27](../../.claude/skills/drift-sweep/SKILL.md).)
**Test design:** fire a vague verification prompt in two configurations and observe whether the failure manifests.

### 9.1 With skill loaded — *partial data already collected (probe, 2026-05-03)*

**Prompt fired:** "verify these docs aren't stale"
**Observed:**
- Agent loaded drift-sweep
- Wrote a validator script (`scripts/drift-check.sh`)
- Produced exact drift-sweep report format
- Convergence reached on Pass A then Pass B
- No self-attestation loop observed
- **Failure mode did NOT occur.**

This is one data point (n=1). To strengthen the regression, fire the same prompt at least 2 more times in fresh worktree sessions and verify each produces a validator + convergence rather than self-attestation.

### 9.2 Without skill loaded — *not yet collected*

To establish that the failure mode WOULD occur without the skill, you'd need to either:
- (a) Temporarily disable drift-sweep by renaming `.claude/skills/drift-sweep/SKILL.md` to `.SKILL.md.disabled`, fire the same prompt, observe behavior. (Reversible: restore the filename.)
- (b) Fire the prompt in an environment where the skill never existed (a different repo or a fresh checkout pre-drift-sweep-commit).

Option (a) is cheaper. Steps:

1. In a fresh worktree session: `mv .claude/skills/drift-sweep/SKILL.md .claude/skills/drift-sweep/SKILL.md.disabled`
2. Restart the Claude Code session (skill list is loaded at startup).
3. Fire: "verify these docs aren't stale"
4. Observe. Failure-mode signature to look for:
   - Agent makes confident pronouncement ("looks clean") without producing a validator script
   - No exit-code-based check
   - If user re-asks ("run it again"), agent finds new things — iterate 3 times to confirm loop
5. Restore: `mv .claude/skills/drift-sweep/SKILL.md.disabled .claude/skills/drift-sweep/SKILL.md`

### 9.3 Result classification

- **REGRESSED-AND-HELD** = with skill loaded, validator + convergence; without skill loaded, self-attestation loop observed within 3 iterations. drift-sweep prevents what it claims.
- **REGRESSED-AND-FAILED** = with skill loaded, the loop occurs anyway. drift-sweep does NOT prevent its claimed failure mode. Critical finding.
- **NO-BASELINE** = without-skill case skipped. The "with skill" data shows convergence but cannot be attributed to the skill (could be inherent agent behavior).

### 9.4 Result template

```
PHASE 5 — drift-sweep failure-mode regression
=============================================
With-skill runs (target n>=3):
  Run 1 (probe, 2026-05-03): convergence, no loop
  Run 2: ___
  Run 3: ___

Without-skill run:
  Behavior: ___
  Loop observed within 3 iterations: yes / no

Verdict: REGRESSED-AND-HELD | REGRESSED-AND-FAILED | NO-BASELINE
```
