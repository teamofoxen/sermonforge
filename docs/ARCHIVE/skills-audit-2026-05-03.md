# Skills Audit — Master Summary

**Date:** 2026-05-03
**Scope:** All `SKILL.md` files under `.claude/skills/` and `~/.claude/skills/` (9 skills, all project-local)
**Methodology:** drift-sweep (Phase 1, 2, 6 — all in detection-only mode)
**Constraint applied throughout:** "Detection only across all phases. No remediation until I review findings."

---

## 1. EXECUTIVE SUMMARY

**Mechanical health: clean.** All 10 validator scripts (9 per-skill + 1 cross-skill) exit 0. No broken file paths, no broken cross-references, no broken commands, no missing tool names. No `BLOCKER` findings.

**Documented-purpose deficit: pervasive.** 8 of 9 skills lack an explicit "this skill exists to prevent X" labeled section. Only `drift-sweep` has one. This is the audit's most consistent finding.

**Trigger surface: untested live; deferred.** A live runtime trigger probe (Phase 3 option C) demonstrated that sub-agents triggered on a skill execute the *full* workflow including remediation, not just the load. This made option-A live testing of all 105 prompts unsafe without sandboxing. Phases 3, 4, and 5 are deferred to a runnable harness artifact for later execution in a worktree. Phase 5 has partial probe data ("with skill loaded" demonstrated convergence; "without skill loaded" not yet collected).

**Counts:**
| Severity | Count | Source |
|----------|-------|--------|
| BLOCKER | 0 | — |
| WARN | 6 | Phase 1 (all stated-purpose / actionability) |
| INFO | 44 | Phase 1: 22 · Phase 2: 10 · Phase 6: 12 |
| Side effects landed mid-audit | 1 incident, 2 files | Phase 3 probe — see §7.1 |

---

## 2. INVENTORY

| # | Skill | Path | Lines | Bytes | Last Modified | Trigger |
|---|-------|------|------:|------:|---------------|---------|
| 1 | interrogate | [.claude/skills/interrogate/SKILL.md](../../.claude/skills/interrogate/SKILL.md) | 125 | 2483 | 2026-04-19 | `/interrogate` |
| 2 | agents | [.claude/skills/agents/SKILL.md](../../.claude/skills/agents/SKILL.md) | 83 | 2755 | 2026-04-29 | `/agents` |
| 3 | run-agent | [.claude/skills/run-agent/SKILL.md](../../.claude/skills/run-agent/SKILL.md) | 70 | 3148 | 2026-04-29 | `/run-agent` |
| 4 | end-session | [.claude/skills/end-session/SKILL.md](../../.claude/skills/end-session/SKILL.md) | 72 | 2505 | 2026-04-30 | `/end-session` |
| 5 | sweep-the-multiverse | [.claude/skills/sweep-the-multiverse/SKILL.md](../../.claude/skills/sweep-the-multiverse/SKILL.md) | 235 | 7724 | 2026-04-30 | `/sweep-the-multiverse` |
| 6 | sweep-the-universe | [.claude/skills/sweep-the-universe/SKILL.md](../../.claude/skills/sweep-the-universe/SKILL.md) | 135 | 5551 | 2026-04-30 | `/sweep-the-universe` |
| 7 | sweep-the-house | [.claude/skills/sweep-the-house/SKILL.md](../../.claude/skills/sweep-the-house/SKILL.md) | 101 | 4251 | 2026-05-01 | `/sweep-the-house` |
| 8 | release | [.claude/skills/release/SKILL.md](../../.claude/skills/release/SKILL.md) | 95 | 4762 | 2026-05-02 | `/release` |
| 9 | drift-sweep | [.claude/skills/drift-sweep/SKILL.md](../../.claude/skills/drift-sweep/SKILL.md) | 255 | 11026 | 2026-05-02 | *(no `trigger:` field; in-body `/drift-sweep`)* |

**Out of scope (excluded):** plugin-namespaced skills (`anthropic-skills:*`, `cowork-plugin-management:*`), built-in skills (`init`, `review`, `security-review`, `update-config`, `simplify`, `loop`, `schedule`, `claude-api`, `keybindings-help`, `fewer-permission-prompts`).

---

## 3. PER-SKILL CLASSIFICATION

| Skill | P1 (W/I) | P2 contributing | P6 (W/I) | **Verdict** |
|-------|----------|----------------|----------|-------------|
| interrogate | 1 / 2 | terminology, severity scale | 0 / 0 | **FLAGGED** |
| agents | 1 / 2 | RULES vs HARD RULES heading | 0 / 0 | **FLAGGED** |
| run-agent | 0 / 2 | RULES vs HARD RULES heading | 0 / 0 | CLEAN-WITH-NOTES |
| end-session | 1 / 3 | — | 0 / 0 | **FLAGGED** |
| sweep-the-multiverse | 1 / 2 | sibling overlap, severity tag | 0 / 3 | **FLAGGED** |
| sweep-the-universe | 2 / 2 | sibling overlap | 0 / 4 | **FLAGGED** (heaviest) |
| sweep-the-house | 0 / 4 | sibling overlap, /simplify out-of-tree | 0 / 0 | CLEAN-WITH-NOTES |
| release | 0 / 2 | /security-review out-of-tree | 0 / 2 | CLEAN-WITH-NOTES |
| drift-sweep | 0 / 3 | trigger field absence | 0 / 3 | CLEAN-WITH-NOTES |

- **CLEAN**: 0
- **CLEAN-WITH-NOTES**: 4 (run-agent, sweep-the-house, release, drift-sweep)
- **FLAGGED**: 5 (interrogate, agents, end-session, sweep-the-multiverse, sweep-the-universe)
- **CRITICAL**: 0

`drift-sweep` is the only skill that ships a documented failure mode and is also the only skill with partial runtime evidence of preventing what it claims to prevent (Phase 5).

---

## 4. PHASE-BY-PHASE RESULTS

### 4.1 Phase 1 — Static audit (per-skill, parallel)

9 sub-agents, one per skill, each producing a drift-sweep-format detection-only report. **All 9 validator scripts exit 0.**

Findings: **0 BLOCKER, 6 WARN, 22 INFO.**

WARN findings (defer list — see §8):
1. **interrogate** — criterion 5 — no labeled "this skill exists to prevent X" section
2. **agents** — criterion 5 — same
3. **end-session** — criterion 5 — same
4. **sweep-the-multiverse** — criterion 5 — same
5. **sweep-the-universe** — criterion 5 — same
6. **sweep-the-universe** — criterion 3 — L23 instructs "default to the next area in sequence" but no persisted state mechanism exists; agent cannot know "next" across runs (functional defect, not documentation gap)

Selection of notable INFO findings:
- **end-session L59** hardcodes `git push origin main`. Hardcoded branch will fail or push the wrong ref outside main.
- **end-session L53–55** "Stage only the files this session touched" — no enumeration mechanism specified.
- **end-session L11/L15–35** STEP 1 PRECHECK and STEP 2 ENFORCEMENT_STATUS are unannounced in the description.
- **sweep-the-universe L129** "Max 400 words" hard rule may be unachievable for areas with many contract clauses.
- **sweep-the-house L84–90** invokes `/simplify` as Part 2 — not previewed in description.
- **drift-sweep L1–4** missing `trigger:` frontmatter field (only skill in this state); 725-char description (unusually long).

Validator scripts written to [scripts/skills-audit/](../../scripts/skills-audit/):
`interrogate.sh`, `agents.sh`, `run-agent.sh`, `end-session.sh`, `sweep-the-multiverse.sh`, `sweep-the-universe.sh`, `sweep-the-house.sh`, `release.sh`, `drift-sweep.sh`. All re-runnable.

**Severity-tagging inconsistency observed across sub-agents:** the same finding pattern (no stated-purpose section) was tagged WARN by 5 sub-agents and INFO by 3 (run-agent, sweep-the-house, release). This is a sub-agent-prompt consistency issue, not a skill defect — flagged for the methodology.

### 4.2 Phase 2 — Cross-skill static audit

Single sub-agent, validator at [scripts/skills-audit/cross-skill.sh](../../scripts/skills-audit/cross-skill.sh). **Validator exit 0.**

Findings: **0 BLOCKER, 0 WARN, 10 INFO.**

Mechanical (validator-confirmed):
- **Zero trigger overlaps** across the 9 skills (every slash command and every quoted natural-language trigger phrase is unique).
- **Zero broken cross-references.** All in-skill refs resolve. CLAUDE.md's `/sweep-the-room` is intentional retirement notice.
- **Zero broken memory references.** All 50+ skill mentions across MEMORY.md and per-memory files resolve.

Semantic (agent-judged INFO):
1. Three sweep-* siblings overlap on "audit" with no in-skill disambiguation.
2. Two out-of-tree handoffs: `sweep-the-house` → `/simplify`, `release` → `/security-review`. Both reachable at runtime, invisible to project-local audit.
3. Severity-tag format diverges across skills.
4. Status vocabulary diverges: `STATUS:`, `VERDICT:`, `Status:` (CONVERGED), per-step gating only, no status.
5. Hard-rules section heading: `## HARD RULES` in 7 skills, `## RULES` in `agents` and `run-agent`.
6. Tone boilerplate: "Senior engineer" (interrogate) vs "Senior architect" (sweep-*).
7. Within `interrogate`: `FAILURE MODES` and `FAILURE SCENARIOS` for related concepts.
8. **Memory-entry gaps:** `sweep-the-multiverse`, `release`, the `agents`/`run-agent` pair, and `interrogate` lack memory entries despite being stable, frequently-invoked, with non-obvious usage rules.
9. `drift-sweep` has no `trigger:` frontmatter field.
10. `sweep-the-universe`'s loader display reads "sweep-the-universe: sweep-the-universe" in the runtime available-skills listing — appears to be a runtime/loader display artifact, not file-level drift.

### 4.3 Phase 3 — Runtime trigger testing

**Status: deferred to harness artifact.**

A probe (option C of the original methodology) was dispatched to test whether sub-agents could serve as trigger-test surrogates. The probe **succeeded** at triggering drift-sweep on a single prompt, but with two consequences that disqualified option A:

(a) The sub-agent made 16 tool calls before returning; per the user's pre-registered "AMBIGUOUS" criterion ("loads drift-sweep only after taking other actions first"), the trigger is classified as ambiguous, not unambiguous-success.

(b) **The sub-agent executed the full drift-sweep workflow including remediation.** It wrote a validator script, edited two doc files, and reached convergence — without any awareness of the audit's detection-only constraint, because that constraint was correctly omitted from the probe prompt to avoid biasing trigger behavior. This established that running option A (105 prompts × 9 skills) would have triggered chained workflows including `release` (tag + push, auto-deploys to all installed users), `end-session` (commit + push to main), and `sweep-the-house` (`/simplify` chain that can edit code).

**Decision (per user direction):** fall back to option B. Phase 3 lives as a runnable artifact at [scripts/skills-audit/phase3-runtime-harness.md](../../scripts/skills-audit/phase3-runtime-harness.md), to be executed in a clean worktree in fresh sessions.

The harness includes:
- 105 prompts (90 standard + 15 sibling-confusion adversarials for sweep-*)
- Per-prompt expected-behavior + side-effect risk classification
- Setup procedure (worktree creation)
- Observation protocol (TRIGGER / NO-TRIGGER / WRONG-TRIGGER / AMBIGUOUS / SAFETY-EVENT)
- Pre-registered sanity-check baseline ("what's the weather today")
- Per-skill confusion matrix template
- Cleanup procedure

One pre-filled data point: drift-sweep prompt **D-P1** ("verify these docs aren't stale") confirmed `TRIGGER:drift-sweep` from the probe.

### 4.4 Phase 4 — Procedure execution test (`end-session`)

**Status: deferred to harness artifact (§8 of [phase3-runtime-harness.md](../../scripts/skills-audit/phase3-runtime-harness.md)).**

Same runtime+side-effect issue as Phase 3. `end-session` is the highest-stakes procedural skill (commits + pushes); cannot be fired live without the same sandboxing concerns. The harness includes a complete procedure-observation checklist for executing the test in a worktree.

Hypothesis to test: per the user's selection rationale, `end-session`'s mandatory steps (PRECHECK, ENFORCEMENT_STATUS, CHANGELOG, commit, push) are followed when the agent triggers on it. A PASS confirms procedural enforcement; PARTIAL/FAIL would confirm "decorative skill" hypothesis for the rest.

### 4.5 Phase 5 — Failure-mode regression (`drift-sweep`)

**Status: partial probe data + deferred completion.**

Per audit constraint, only `drift-sweep` was scoped (it is the only skill with an explicit documented failure mode).

**With-skill-loaded (n=1, from probe):** drift-sweep was triggered on "verify these docs aren't stale" and produced a complete validator-then-convergence workflow. The documented failure mode (loop of self-attestation: "looks clean" → "actually three stale terms" → "found one more") **did not occur**. This is one data point.

**Without-skill-loaded:** not yet collected. Requires either (a) temporarily disabling drift-sweep via filename rename in a worktree, or (b) firing the prompt in a pre-drift-sweep checkout. Procedure documented in §9 of the harness.

Verdict: **inconclusive** until ≥3 with-skill runs and 1 without-skill run are collected. Probe data alone shows the skill produced what it claims; cannot yet show that absence of the skill produces failure (i.e., that the skill is causally responsible).

### 4.6 Phase 6 — Freshness check

9 sub-agents in parallel, one per skill. Each extracts every concrete reference (file paths, shell commands, tool names, version/API references, framework clause IDs) and verifies resolution. **All read-only.**

Findings: **0 BLOCKER, 0 WARN, 12 INFO.**

Selection:
- **sweep-the-multiverse** (3 INFO): paraphrase fidelity of CORE.md framework clauses (faithful but imprecise); skill maps only one State clause to CONTEXT PIPELINE while CORE.md has 6.
- **sweep-the-universe** (4 INFO): area scope under-specifies — `electron/ai/provider.js` (Anthropic SDK wrapper) not listed in AI FLOW; `sermonforge.db`/`theology.db` cited at repo root but canonical runtime location is `app.getPath("userData")`; INGESTION row vague; UI LAYER row names only 2 components but contract demands "all Surface clauses" (every navigable surface).
- **release** (2 INFO): hardcoded GitHub URL in step 7 report (will go stale silently if repo moves); `/security-review` invocation at L36 specifies last-tag..HEAD scope, but the security-review skill's native scope is branch-level (slight semantic mismatch).
- **drift-sweep** (3 INFO): worked-example references to `docs/API.md`, `tools/`, `bin/`, `.github/scripts/`, `.drift/` don't exist — but all are explicitly framed as illustrative (not claims of existence). `scripts/drift-check.sh` exists from today's probe (consistent with worked example).

Notable positive: **`end-session`** has 0 freshness findings despite naming many specific files in its STEP 2 ENFORCEMENT_STATUS check (`src/core/spine.ts`, `src/core/contracts.ts`, `eslint-plugin-sermonforge/`, `tests/contracts/`, `scripts/spine-integrity.js`, `docs/CORE.md`, `docs/ENFORCEMENT_STATUS.md`, `tests/contracts/_helpers/test-spine.ts`) — every one resolves cleanly.

---

## 5. RECURRING PATTERNS

1. **Stated-purpose deficit (8/9 skills).** Only drift-sweep declares its failure mode. Captured as 5 WARNs (interrogate, agents, end-session, sweep-the-multiverse, sweep-the-universe) and 3 INFOs (run-agent, sweep-the-house, release) — severity inconsistency is a sub-agent prompting issue, not a skill defect.

2. **Missing non-trigger exclusions (8/9 skills).** Only drift-sweep declares "Does NOT trigger for X." All other descriptions are positive-trigger only. The three sweep-* siblings particularly suffer from this — they overlap on "audit" with no disambiguation.

3. **Heading and vocabulary divergence.** `## HARD RULES` vs `## RULES`; `STATUS:` vs `VERDICT:` vs `Status:`; severity tags formatted differently across skills; tone boilerplate split (engineer/architect). All semantic, not blocking, but creates context-switch cost when reading multiple skills.

4. **Out-of-tree handoffs invisible to project-local audit.** `sweep-the-house → /simplify`, `release → /security-review`. Both reachable at runtime, but not in `.claude/skills/`. A project-local audit (like Phase 6) cannot verify them; this audit's cross-skill scan only knew the 9 in-tree skills.

5. **Memory-entry gaps for high-frequency skills.** `sweep-the-multiverse`, `release`, `agents`/`run-agent`, `interrogate` lack memory entries despite being stable and having non-obvious usage rules. Memory has entries for `drift-sweep`, `end-session`, `sweep-the-house`.

---

## 6. DELIVERABLES

All written to [scripts/skills-audit/](../../scripts/skills-audit/):

- `interrogate.sh` — Phase 1 mechanical validator
- `agents.sh` — Phase 1
- `run-agent.sh` — Phase 1
- `end-session.sh` — Phase 1
- `sweep-the-multiverse.sh` — Phase 1
- `sweep-the-universe.sh` — Phase 1
- `sweep-the-house.sh` — Phase 1
- `release.sh` — Phase 1
- `drift-sweep.sh` — Phase 1
- `cross-skill.sh` — Phase 2 cross-skill validator
- `phase3-runtime-harness.md` — Phase 3+4+5 deferred runtime test artifact
- `audit-master-summary.md` — this file

Plus, separately, [scripts/drift-check.sh](../../scripts/drift-check.sh) — created by the probe sub-agent during Phase 3, kept per user decision (the validator script is independent of the unauthorized doc edits, which were reverted).

---

## 7. META-FINDINGS

These describe behaviors of the skill ecosystem itself, surfaced by the audit and worth preserving separately from per-skill findings.

### 7.1 Sub-agents triggered on a skill execute the entire workflow, not just the load

The Phase 3 probe (single test: prompt "verify these docs aren't stale" with no other context) triggered drift-sweep and the sub-agent then proceeded through the **full** skill workflow including the remediation pass. It wrote a validator script (`scripts/drift-check.sh`) and edited two doc files (`docs/CORE.md`, `docs/REFERENCE/project-structure.md`).

Implications:
- **Trigger testing requires sandboxing.** Any prompt that fires a skill with side effects (`release` tags+pushes, `end-session` commits+pushes, `sweep-the-house` chains to `/simplify`, `drift-sweep` writes scripts and edits files) will execute those side effects. A clean worktree is the minimum protective layer; a per-prompt clean reset is stricter.
- **Detection-only constraints don't propagate from orchestrator to sub-agent.** The audit-level constraint "Detection only across all phases. No remediation until I review findings" applied to the orchestrator (this session). The probe sub-agent had no knowledge of it because injecting it into the sub-agent prompt would have biased the trigger test. Drift-sweep's own workflow includes remediation; the sub-agent followed the skill faithfully.
- **Future audits, tests, and trigger experiments must design for this.** Any audit that needs to test trigger behavior of a skill with side effects has to sandbox the side effects out (worktree, container, dry-run mode in skill itself). There is no way to "load only" a skill and observe trigger without execution.

### 7.2 Sub-agents may underreport their own actions — POSSIBLE BUT NOT DEMONSTRATED BY THIS AUDIT

The probe sub-agent's final report listed two file edits (`docs/CORE.md`, `docs/REFERENCE/project-structure.md`). After probe completion the working tree showed three modified files — those two plus `docs/PROPOSALS/study-field-definition-initiative.md`. The third file was initially flagged as a possible underreporting incident.

**Resolution (user-confirmed, 2026-05-03):** the SFDI file was pre-existing user WIP from a prior session that the initial git-status snapshot at session start failed to capture (it showed only `?? .claude/worktrees/`, no modified files). The probe sub-agent's report of two edits was complete and accurate. **The probe does not provide evidence of sub-agent underreporting.**

The finding remains theoretically possible — sub-agent reports are produced by an LLM and have no structural guarantee of completeness — but is **downgraded** from "established by SFDI evidence" to "possible failure mode, not demonstrated by this audit." Future audits should still treat working-tree state as authoritative over sub-agent self-reports as a defense-in-depth measure, but the probe itself cleared this concern.

The git-status snapshot gap is its own observation (the snapshot mechanism missed unstaged changes from a prior session) but not actionable here — it's a session-startup behavior, not a skill defect.

### 7.3 SFDI file modification — confirmed user WIP

`docs/PROPOSALS/study-field-definition-initiative.md` modifications confirmed as user work-in-progress from a prior session, ratifying Field 1 Background's inheritance ruling to option (b) and dating the decision `2026-05-03`. The LF line endings reflect the user's prior-session editor, not a sub-agent. **File preserved as-is per user direction.**

---

## 8. PENDING REMEDIATION — DEFERRED FOR LATER SESSION

Per user direction, these are not fixed in this audit. They are documented here for a future remediation session.

### 8.1 Static-finding WARNs (Phase 1) — 6 items

1. **interrogate** — add explicit "## THE FAILURE MODE THIS SKILL PREVENTS" (or equivalent labeled) section
2. **agents** — same
3. **end-session** — same
4. **sweep-the-multiverse** — same
5. **sweep-the-universe** — same
6. **sweep-the-universe L23** — replace "default to the next area in sequence" with either (a) an explicit persisted-state mechanism (file at `.claude/skills/sweep-the-universe/.state` tracking last-audited area), or (b) require user to specify the area each run (remove the "default to next" instruction)

### 8.2 Severity-tagging consistency — methodology issue

Across Phase 1 sub-agents, the same finding pattern (no stated-purpose section) was tagged WARN by 5 and INFO by 3. Future audits should provide explicit severity guidance for each criterion in the sub-agent prompt template, not rely on per-agent judgment.

### 8.3 Drift items found by probe — kept for proper review

The probe correctly identified that `CLAUDE_original.md` (deleted in commit `498e511`) is still referenced in:
- [docs/CORE.md](../CORE.md) lines 4–5
- [docs/REFERENCE/project-structure.md](../REFERENCE/project-structure.md) line 44

These are real drift. The probe's edits were reverted (per detection-only constraint); the drift remains and should be cleaned in a proper review session.

### 8.4 Phase 3, 4, 5 runtime data — deferred to harness execution

[phase3-runtime-harness.md](../../scripts/skills-audit/phase3-runtime-harness.md) contains 105 trigger prompts, the Phase 4 `end-session` procedure-execution test, and the Phase 5 drift-sweep failure-mode regression. To be executed in a worktree in fresh sessions.

### 8.5 Out-of-scope-but-noticed observations

These are not skill defects but were surfaced during the audit:
- **Memory entries to add:** `sweep-the-multiverse`, `release`, paired entry for `agents`/`run-agent`, `interrogate`. Each is stable, frequently-invoked, with non-obvious usage rules.
- **Severity vocabulary normalization** across the 4 different patterns (`STATUS:`, `VERDICT:`, `Status: CONVERGED`, per-step gating).
- **Hard-rules heading normalization** (`## HARD RULES` vs `## RULES`).
- **Cross-references and runtime-loader artifact:** `sweep-the-universe`'s loader display reads "sweep-the-universe: sweep-the-universe" in the runtime listing. Probably loader behavior, not file content. Worth confirming once.

---

## 9. WHAT WAS NOT MEASURED

Honest accounting of audit limitations:

- **Live runtime trigger surface (Phase 3).** Could not be measured live without sandboxing; probe established this. Deferred to harness.
- **Live procedure execution (Phase 4).** Same constraint. Deferred.
- **Phase 5 baseline (without skill loaded).** Not collected. Without it, Phase 5 cannot causally attribute drift-sweep's prevention claim — only its compliance claim.
- **Sub-agent skill loading vs cold-session skill loading.** The probe established sub-agents can trigger and execute skills. Whether their trigger surface is *identical* to a cold CC session's was not verified. The harness is designed for cold sessions, not sub-agents.
- **Plugin-namespaced and built-in skills.** Out of scope by user direction; not audited.
- **Implicit conventions (e.g., what tone is "correct" for SermonForge skills).** Not testable; deliberately excluded per drift-sweep's "judgment-only checks are out of scope" rule.

---

## 10. END OF AUDIT

**Recommended next action:** review §8 (pending remediation) and decide which items to schedule. The 6 WARNs are the highest-priority candidates because they're concrete, scoped, and mechanically straightforward to fix.

The runtime harness ([phase3-runtime-harness.md](../../scripts/skills-audit/phase3-runtime-harness.md)) is independent — it can be executed at any time in a worktree by any session.
