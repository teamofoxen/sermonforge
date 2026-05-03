---
name: drift-sweep
description: Evidence-based verification that a document, spec, glossary, config, API reference, README, or doc set is free of drift, stale references, naming mismatches, or inconsistencies. Triggers on requests to verify, audit, double-check, sweep, or confirm the consistency, freshness, or correctness of reference material — phrasings include "make sure there's no drift," "verify this is up to date," "check for inconsistencies," "run a pass," "is this clean," "audit these docs," "one more pass," "make sure nothing's stale." Does NOT trigger for code review, test coverage analysis, runtime debugging, performance audits, or general "look this over" requests where success cannot be expressed as a script exit code.
---

# drift-sweep

Evidence-based verification workflow for documentation, specs, glossaries, configs, and other reference artifacts.

**Manual invocation:** the user can also invoke this skill explicitly by typing `/drift-sweep`.

---

## THE FAILURE MODE THIS SKILL PREVENTS

```
Agent:  "Looks clean — no drift found."
User:   "Run it again."
Agent:  "Actually, three stale terms."
User:   "Run it again."
Agent:  "Found one more broken reference."
(repeats indefinitely)
```

Each pass invents its own criteria and samples a different slice of the material. The agent self-attests rather than verifies. There is no fixed point. The loop never converges.

This skill exists to make that loop impossible.

---

## THREE LAYERS — DO NOT COLLAPSE THEM

| Layer | Role |
|-------|------|
| **This skill** | The playbook — defines what counts as drift and how the workflow must run |
| **You (the agent)** | The operator — executes the playbook, writes and runs the script, reports results |
| **The validator script** | The actual checker — its exit code and raw output are the source of truth |

The agent does not *become* the validator by thinking carefully. A script that exits 0 is proof. Agent prose is not.

---

## MANDATORY WORKFLOW

### STEP 1 — DEFINE DRIFT CRITERIA (before reading any file)

Produce a written checklist of what counts as drift for this specific job and post it before proceeding.

Categories to consider (select applicable ones):
- Renamed field names or API terms still used under the old name
- Version numbers pointing to deprecated versions
- File or path references that no longer exist
- Internal doc links pointing to moved or deleted content
- Naming mismatches: term in doc ≠ term in code/schema/spec
- Outdated procedure steps referencing removed flows
- Removed features still described as present
- Incorrect status markers (e.g., "planned" items that have already shipped)

**Rule:** If the user has not specified criteria, ask before proceeding. Nothing outside the agreed checklist is in scope for this run. Adding items mid-pass is how passes never close.

---

### STEP 2 — WRITE THE VALIDATOR SCRIPT (before any reading pass)

Write a script — bash grep pipeline, Python, link checker, schema diff — that mechanically checks each criterion.

Save it in a project-appropriate location:
- Prefer an existing tooling directory (`scripts/`, `tools/`, `bin/`, `.github/scripts/`) if the repo already has one.
- If the repo has strict structure conventions and no obvious home, use a hidden `.drift/` directory at the repo root.
- Do not invent a new top-level directory in a repo whose layout is otherwise tightly scoped.
- If unsure, ask the user where to put it.

The script must:
- Check each criterion independently and label its output
- Print the criterion name and every match found
- Exit 0 only when zero matches exist for ALL criteria; non-zero otherwise
- Be re-runnable without manual setup

**Rule:** Do not proceed to Step 3 until the script exists and has been executed at least once.

---

### STEP 3 — DETECTION PASS (enumerate only — do not fix)

Run the validator script. Capture its full output verbatim.

Produce a numbered checklist of every flagged instance:
```
[ ] #1 — docs/API.md:14 — "/v1/sermons" — criterion: stale v1 path
[ ] #2 — docs/API.md:8  — "{token}" — criterion: renamed field
```

**Rule:** This pass enumerates only. Do not fix anything in this step. Do not annotate "this one is probably fine." Every match goes in the list. Judgment calls during detection are how items get dropped.

---

### STEP 4 — REMEDIATION PASS (fix the checklist, nothing else)

Work through the detection checklist item by item. Fix each one. Check it off.

**Rule:** If you discover something new while fixing, do NOT fix it now. Add it to a `DEFERRED FINDINGS` list for the next iteration. Mixing new discoveries into an active remediation pass is how the convergence predicate breaks.

---

### STEP 5 — RE-RUN VALIDATOR AND CHECK CONVERGENCE

After remediation, run the validator script again from scratch. This is **Pass A** — the post-remediation run.

Then evaluate state:

- **If Pass A exits 0 AND no deferred findings were recorded AND no script changes are pending →** convergence is reached on this single clean post-remediation pass. Re-running an unchanged script against unchanged material proves nothing; do not stage a ceremonial second run.

- **If Pass A exits non-zero (the script found something) →** add the new findings to the detection checklist and return to Step 3.

- **If Pass A exits 0 but deferred findings exist OR the script was hardened during this iteration →** promote every deferred finding into the next iteration's detection checklist, apply any script changes, then run **Pass B** (validator again from scratch). Convergence requires Pass B to also exit 0. If it does not, return to Step 3 with the new findings.

The point: a second pass is required only when something between A and B has changed (new criteria absorbed from deferred items, or a hardened script). Otherwise it is theater.

If pass N+1 catches something pass N missed, the gap belongs in the **validator script**, not in prose. Harden the script before the next remediation pass.

**Rule:** "Looks like it converged" is not the predicate. Convergence is one of the two specific states above, with raw exit codes recorded.

---

### STEP 6 — SNAPSHOT BETWEEN PASSES

Record state after each remediation pass so missed items can be diagnosed.

- Git repo: `git commit -m "drift-sweep: pass N"` after each remediation pass.
- No git: save validator output as `drift-check-pass-N.txt`.

---

## REPORT FORMAT

**No verdict is valid without all four components.** Missing any one component means the sweep is incomplete.

```
DRIFT-SWEEP REPORT
==================

CRITERIA CHECKLIST:
- [ ] criterion 1
- [ ] criterion 2
...

VALIDATOR SCRIPT: <path>
---
<full script content>
---

VALIDATOR OUTPUT (final run):
---
<raw terminal output — do not paraphrase>
Exit code: N
---

CONVERGENCE:
Pass A (post-remediation): exit <code>, <count> findings
Pass B (post-hardening, if run): exit <code>, <count> findings
Status: CONVERGED | NOT CONVERGED
Reason: <single clean post-remediation pass, no deferred or script changes>
        | <Pass A and Pass B both exit 0 after deferred items / script hardening absorbed>
        | <still finding drift after N iterations — see escalation>

DEFERRED FINDINGS:
- <item> — <file> — <why deferred>
(or "none")
```

**Banned phrases** in the verdict block: "looks clean," "no drift found," "all consistent," "verified," "appears correct," or any similar attestation not backed by the raw validator output above. Writing one of these phrases without the four-component report is a protocol violation, not a stylistic preference.

---

## WORKED EXAMPLE — CORRECT WORKFLOW

**Target:** `docs/API.md` — check for stale content after a v1→v2 migration.

**Step 1 — Criteria agreed with user:**
```
[ ] Any path using /v1/ (deprecated, replaced by /v2/)
[ ] Any reference to the old domain api.legacy.example.com
[ ] Any use of the field name `token` (renamed to `access_token`)
```

**Step 2 — Validator script (`scripts/drift-check.sh` — `scripts/` already existed in this repo):**
```bash
#!/usr/bin/env bash
FAIL=0
echo "=== /v1/ paths ==="
grep -rn "/v1/" docs/ && FAIL=1 || echo "none"
echo "=== legacy domain ==="
grep -rn "api.legacy.example.com" docs/ && FAIL=1 || echo "none"
echo "=== stale 'token' field (not access_token) ==="
grep -rn '\btoken\b' docs/ | grep -v "access_token" && FAIL=1 || echo "none"
exit $FAIL
```

**Step 3 — Detection pass output (verbatim):**
```
=== /v1/ paths ===
docs/API.md:14: POST /v1/sermons
docs/API.md:23: GET /v1/sermons/{id}
=== legacy domain ===
none
=== stale 'token' field ===
docs/API.md:8: Authorization: Bearer {token}
Exit code: 1
```

Detection checklist:
```
[ ] #1 — docs/API.md:14 — POST /v1/sermons — stale v1 path
[ ] #2 — docs/API.md:23 — GET /v1/sermons/{id} — stale v1 path
[ ] #3 — docs/API.md:8  — {token} — renamed field
```

**Step 4 — Remediation:** Fixed #1–#3. No new findings discovered during remediation, so DEFERRED FINDINGS = none. Committed: `drift-sweep: pass 1`.

**Step 5 — Pass A:**
```
=== /v1/ paths ===
none
=== legacy domain ===
none
=== stale 'token' field ===
none
Exit code: 0
```

Pass A: exit 0, 0 findings. No deferred items. No script changes pending. **CONVERGED on single clean post-remediation pass.** No Pass B required — the script is deterministic and nothing has changed since Pass A, so a re-run would prove nothing.

---

## HARD RULES

- Self-attestation without validator output is a protocol violation, not a stylistic choice.
- Detection and remediation are always separate passes. They may never be combined.
- Convergence is reached when either: (a) Pass A exits 0 with no deferred items and no script changes pending, or (b) Pass A and Pass B both exit 0 after deferred items / script changes are absorbed.
- Anything outside the criteria checklist is deferred, not fixed in this run.
- Deferred findings must be promoted into the next iteration's detection checklist. The deferred list is not a graveyard.
- If the script says clean and your reading says dirty, harden the script — don't override it with prose.
- If no validator script can be written (the check is entirely subjective), escalate to the user before proceeding. This skill does not apply to purely judgment-based checks.
- **5-iteration ceiling:** if convergence is not reached after 5 full detection→remediation→re-run cycles, STOP and escalate to the user. Continued passes without escalation indicate one of: criteria too broad, validator incorrectly written, or material in worse shape than scoped. Looping past 5 defeats the convergence predicate this skill exists to enforce.

---

## SCOPE LIMITS

Applies when success can be expressed as a script exit code. Does NOT apply to:
- Code review → use `/sweep-the-house`
- Test coverage analysis
- Runtime debugging or performance audits
- Architectural or design opinions
- General "look this over" requests without a measurable correctness criterion
