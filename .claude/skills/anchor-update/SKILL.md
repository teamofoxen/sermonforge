---
name: anchor-update
description: Safe persistence workflow for load-bearing strategic documents (proposals, specs, ADRs, charters, design notes, memory docs) that span multiple sessions and anchor downstream work. Triggers on requests to update, sync, or persist progress to anchor documentation — phrasings include "update the [DOC] doc," "sync [DOC]," "write our progress to [DOC]," "update the proposal," "update the ADR," "persist this to [DOC]," "update the anchor," "save this to [DOC]." Enforces scope declaration, per-section diff approval, no skill chaining mid-update, and immediate commit. Does NOT trigger for drift verification or consistency audits (use drift-sweep), stable reference material (READMEs, formal API specs, schema references not actively being designed), code edits, casual single-line tweaks ("fix this typo," "add a line about X"), or generated documentation like CHANGELOG entries from end-session.
---

# anchor-update

Safe persistence workflow for load-bearing strategic documents that anchor multi-session work — proposals, specs, ADRs, charters, design notes, memory docs.

These documents are **mid-flight by nature**. They are intentionally incomplete, evolve continually, and downstream work depends on them being coherent at each persisted state. Silent rewrites, batched edits, and audit-style sweeps corrupt the anchor layer and cascade into every sub-project that references it.

**Manual invocation:** the user can also invoke this skill explicitly by typing `/anchor-update`.

---

## THE FAILURE MODE THIS SKILL PREVENTS

Without this skill, an agent updating an anchor doc from session context will routinely:

1. **Silent rewrites** — Read the file, "fix" sections the user didn't mention, polish prose that wasn't in scope.
2. **Mistargeted audits** — Trigger drift-sweep or another sweep skill on a doc that is intentionally incomplete, then "fix" intentional gaps.
3. **Batched writes** — Persist all changes in one operation with no per-section diffs; user only sees the result after the fact.
4. **Dirty-tree drift** — Leave changes uncommitted, where another concurrent session may clobber them or stage unrelated work alongside.
5. **Cascade blindness** — Update one anchor without surfacing impact on related anchors that reference the changed sections.
6. **Stale-context guessing** — Improvise content because session context is thin, instead of asking.

Each failure compounds across sub-projects. Anchor docs are how sub-projects stay coherent over time; silent corruption at the anchor layer corrupts every downstream artifact that cites them.

This skill exists to make those failures impossible.

---

## ANCHOR REGISTRY

An **anchor doc** is a strategic, load-bearing document that:
- Persists across many sessions
- Gets updated continually as decisions land
- Is referenced by downstream work or by other anchors
- Is intentionally mid-flight (not a stable spec or reference)

The registry lives at `docs/ANCHORS.md` by convention. If the project uses a different location, ask once and remember.

**Registry format (one line per anchor):**

```
- path/to/anchor.md — one-line description of what this anchor governs
```

**On first run in a project — three valid outcomes:**

1. **Existing registry** → user points to a registry at the default or a custom path. Record the path and use it.
2. **Create the registry now** → user opts to create `docs/ANCHORS.md` populated with the listed paths. Propose the file content and wait for confirmation before creating.
3. **Defer the registry** → user declines to create a registry but confirms the current doc is an anchor. Proceed with the full workflow for this run; in Step 8, fall back to asking the user for an ad-hoc list of related anchors. Registry creation can be picked up in a future session.

The skill **does not** force registry creation as a precondition for first use.

**On subsequent runs:** Confirm the target is on the registry before proceeding. If it is not on the registry:
- Ask whether to treat it as an anchor (engage full procedure and add to registry), OR
- Decline and let the user use a lighter edit path (plain Read + Edit, no skill).

---

## MANDATORY WORKFLOW

### STEP 1 — CONFIRM TARGET IS AN ANCHOR

Read `docs/ANCHORS.md` (or the project's registry). State the result:

- ✅ **On registry** → proceed to Step 2.
- ❓ **Not on registry** → ask the user: "Is `<path>` an anchor doc? If yes, I'll add it to the registry and proceed; if no, use a plain edit instead."
- ❌ **Registry does not exist** → run the first-run flow above before proceeding.

Do not assume. Do not proceed past this step without an explicit answer.

---

### STEP 2 — SCOPE DECLARATION (before reading the file)

List every decision, change, or content addition made in this session that is relevant to the anchor doc. **Do this from session context, before opening the file.**

Format:

```
SCOPE FOR THIS UPDATE — <anchor doc path>
1. <decision/change> — <one-line context>
2. <decision/change> — <one-line context>
...
```

Wait for explicit user confirmation that the list is complete and accurate. This catches stale-context errors before they corrupt the doc.

If session context is insufficient to produce this list with confidence, **stop and ask the user to provide content directly** rather than guessing.

---

### STEP 3 — READ THEN CLASSIFY

Read the file. Categorize every section using its existing structure (top-level headings, then sub-headings if needed for granularity):

| Class | Meaning |
|-------|---------|
| **TOUCHED** | Section will be modified — explicitly covered by the scope list |
| **UNTOUCHED** | Section is not in scope and will not be edited in any way |
| **UNCERTAIN** | Section may be affected by the scope list but the agent cannot decide without user direction |

Surface the classification table before any editing. UNCERTAIN sections require explicit user direction before being reclassified as TOUCHED or UNTOUCHED.

Format:

```
CLASSIFICATION — <anchor doc path>
| Section | Class | Note |
|---------|-------|------|
| <heading> | TOUCHED | maps to scope item #2 |
| <heading> | UNTOUCHED | not in scope |
| <heading> | UNCERTAIN | scope item #3 may affect this — direction? |
```

---

### STEP 4 — DIFF-BEFORE-WRITE (per section)

For each TOUCHED section, in order:

1. Show the before/after diff (use Edit-style old/new blocks; make the change visible inline).
2. Wait for explicit approval ("yes," "approved," "go," etc.).
3. Apply the edit.
4. Move to the next section.

**No batched edits.** No "I'll show all the diffs at once and then write." One section, one diff, one approval, one write.

If the user requests revision on a diff, revise and re-show; do not move on until that section is approved or explicitly skipped.

---

### STEP 5 — NO SILENT IMPROVEMENTS

UNTOUCHED sections are not reformatted, polished, reordered, or "tidied up." Whitespace stays as-is. Heading levels stay as-is. Wording stays as-is. Bullet styles stay as-is.

If improvements come to mind during the update, write them down for a separate **POST-WRITE RECOMMENDATIONS** list at the end of the report. Do not apply them now.

---

### STEP 6 — NO SKILL CHAINING

Do not invoke `drift-sweep`, `sweep-the-house`, `sweep-the-multiverse`, `sweep-the-universe`, `interrogate`, or any audit/verification skill during this update.

Mid-flight anchors are not audit targets. Audit skills will flag intentional gaps as drift, and the agent will then "fix" them, corrupting the doc.

If the user explicitly asks for a verification pass after the commit lands, that is a separate session and a separate invocation.

---

### STEP 7 — COMMIT ON COMPLETION

After all approved diffs have been written:

1. Run `git status` and confirm only the anchor doc (and any registry update from Step 1) is staged.
2. Stage the file(s) by name. **Never `git add .`.**
3. Ask the user for a one-line commit summary, or propose one and wait for approval.
4. Commit.
5. Confirm by reporting the commit hash.

**Never leave the working tree dirty after a successful update.** Cross-session collision is a real risk; another session may also be editing.

If the project uses `end-session` to bundle commits, this skill still commits its own changes at completion — anchor updates are atomic and not deferred to a session-end batch.

---

### STEP 8 — CROSS-ANCHOR IMPACT CHECK

After the commit lands, search for references in other anchors to what changed in this update:

- The headings of TOUCHED sections
- New terms or names introduced
- Removed terms or names that may still be cited

**Search scope depends on the Step 1 outcome:**

- **Registry-backed** → use `grep` over the paths listed in the registry. This is the canonical lookup.
- **Ad-hoc (no registry, or user opted to skip it for this run)** → ask the user for a list of related anchors that may reference the changed sections, then `grep` over that list. This is best-effort; without a registry, there is no canonical inventory.

Produce a **downstream impact list**:

```
DOWNSTREAM ANCHORS THAT MAY NEED ATTENTION
- docs/PROPOSALS/foo.md — references "<term>" in section "<heading>"
- docs/SYSTEMS/bar.md — references "<term>" in section "<heading>"
(or "none")
```

**Do NOT auto-update downstream anchors.** Surface the list and let the user schedule follow-up — each downstream anchor is a separate `/anchor-update` invocation with its own scope and approval.

---

### STEP 9 — ESCALATE WHEN CONTEXT IS THIN

If at any point session context is insufficient to make a decision — **STOP and ask the user.** Examples:

- Scope list cannot be produced with confidence.
- A section is UNCERTAIN and the user has not directed it.
- A diff requires content the agent does not have.
- A term has changed meaning and the agent cannot tell which definition the doc should reflect now.

Do not guess from anchors-of-anchors or downstream artifacts. Ask.

---

## REPORT FORMAT

```
ANCHOR UPDATE REPORT
====================

ANCHOR: <path>
REGISTRY CHECK: on registry | added in this update | declined (not an anchor)

SCOPE:
1. <change> — <context>
2. <change> — <context>
...

CLASSIFICATION:
| Section | Class | Note |
|---------|-------|------|
| <heading> | TOUCHED | <reason> |
| <heading> | UNTOUCHED | not in scope |
| <heading> | UNCERTAIN → TOUCHED | per user direction |

PER-SECTION WRITES:
- <heading>: approved + applied
- <heading>: approved + applied
...

COMMIT: <hash> — "<summary>"

DOWNSTREAM ANCHORS THAT MAY NEED ATTENTION:
- <path> — references "<term>" in "<section>"
(or "none")

POST-WRITE RECOMMENDATIONS (deferred; not applied):
- <suggestion>
(or "none")
```

---

## HARD RULES

- No edits without per-section approval.
- No skill chaining mid-update — `drift-sweep`, `sweep-*`, `interrogate`, and any audit/verification skill are forbidden inside this workflow.
- No silent improvements to UNTOUCHED sections — not even whitespace.
- No batched writes — one section, one diff, one approval.
- No leaving the working tree dirty — commit before declaring success.
- No auto-updating downstream anchors — always surface and defer.
- No guessing — if session context is thin, stop and ask the user to provide content directly.
- Anchor confirmation is mandatory — registry use is optional but recommended. "I'm pretty sure this is an anchor" is not sufficient.
- Cross-session collision is a real risk; assume other sessions may also be editing the same files.

---

## CROSS-SESSION SAFETY — WORKTREES

This skill protects within a single session. It does **not** protect against another session writing to the same anchor doc concurrently.

For projects where multiple sessions may be active simultaneously (parallel sub-project work), use per-sub-project **git worktrees** so each session writes to its own `sub/<subproject>` branch:

```
git worktree add ../sermonforge-sfdi sub/sfdi
git worktree add ../sermonforge-sprd sub/sprd
```

Each session commits to its own `sub/<subproject>` branch and merges to main when stable. The skill protects within a session; worktrees protect across sessions. Mention this to the user when starting work on a sub-project that another session might also touch.

---

## SCOPE LIMITS — WHEN TO STAY QUIET

Do **not** trigger this skill for:

- **Drift or consistency audits** — use `drift-sweep` instead. Audits and updates serve opposite goals: audits assume the doc should be coherent and complete; this skill assumes it is mid-flight and may stay incomplete.
- **Stable reference material** — READMEs, formal API specs, schema references in `docs/REFERENCE/`, finalized standards. These are not mid-flight.
- **Code edits** — source files, tests, configs. This skill is for strategic prose docs.
- **Single-line typo or tweak requests** — "fix this typo," "add a line about X," "rename this heading." Procedural overhead is wasteful at this scale; just edit.
- **Generated documentation** — CHANGELOG entries from `end-session`, autogenerated API docs, lockfiles, anything produced by tooling.

If unsure whether the doc is an anchor, ask once: "Is this an anchor doc (load-bearing, mid-flight, referenced by downstream work)?" The user's answer is binding for this run.
