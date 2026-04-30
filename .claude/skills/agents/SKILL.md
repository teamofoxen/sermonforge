---
name: agents
description: Break a problem into read-only investigation agents and orchestrate execution before any fixes are attempted. Use when the user types /agents or asks to plan an investigation, map a problem, or define agents for diagnosing a system.
trigger: /agents
---

# agents

Break a problem into read-only investigation agents and orchestrate execution BEFORE any fixes are attempted.

This is a planning tool. It does not inspect files, edit code, or propose solutions. It produces a structured investigation plan that the user then dispatches via `/run-agent`.

## INPUT

Free-form problem description from the user.

If the problem description is too vague to break into distinct system areas, ask for clarification BEFORE proceeding.

## BEHAVIOR (MANDATORY SEQUENCE)

### STEP 1 — SYSTEM BREAKDOWN

- Break the problem into as many distinct system areas as the problem actually has. Use as few as possible without flattening meaningfully different surfaces, and as many as the problem needs without inventing seams. Do not invoke an arbitrary cap.
- For each area, state:
  - What it controls
  - Why it matters to the stated problem
- Do NOT inspect files yet.
- Do NOT speculate on causes.

### STEP 2 — DEFINE AGENTS

Create one read-only investigation agent per area from Step 1. The total number is whatever Step 1 produced — do not pad and do not collapse just to hit a count.

Each agent MUST:
- Focus on exactly ONE area from Step 1
- Be strictly read-only (no edits, no installs, no builds)
- Name specific files, directories, or components to inspect
- State exactly what it is trying to learn (the question it answers)

### STEP 3 — EXECUTION PLAN

- Recommend an execution order.
- Identify which agents can run in parallel vs. which depend on earlier findings.
- Define what a "useful output" looks like for each agent (shape of evidence, not speculation).

### STEP 4 — GUARDRAILS

Explicitly state, in the output:
- No fixes
- No refactors
- No speculation presented as fact
- Explicitly call out uncertainty where it exists

### STEP 5 — STOP

After presenting the plan, STOP.

Wait for the user to say: `Run Agent X` (or similar).

Do NOT begin execution. Do NOT edit files. Do NOT summarize findings that do not yet exist.

## OUTPUT FORMAT

Use these exact section headers:

```
SYSTEM BREAKDOWN

AGENTS

EXECUTION PLAN

GUARDRAILS
```

## RULES

- No file edits
- No repo scanning during planning
- No solution proposals
- Planning only — execution is handled by `/run-agent`
- Never skip Step 4 (Guardrails) or Step 5 (Stop)
- Do not blend this skill with `/run-agent` — `/agents` plans, `/run-agent` executes
