---
name: run-agent
description: Execute exactly ONE read-only investigation agent safely and return findings. Use when the user types /run-agent or says "Run Agent X" after an /agents plan has been produced.
trigger: /run-agent
---

# run-agent

Execute exactly ONE investigation agent safely and return findings.

This skill is the execution counterpart to `/agents`. It performs a strictly scoped, read-only investigation and reports observable facts. It does not fix, refactor, or propose solutions.

## INPUT

Agent name + scope.

Typically supplied as:
- `Run Agent A`
- `Run Agent B only`
- `/run-agent <name> — <scope>`

If no prior `/agents` plan exists in context, or the named agent is ambiguous, ask the user to clarify BEFORE proceeding.

## BEHAVIOR

- Follow the agent scope exactly as defined in the `/agents` plan.
- Do NOT expand scope beyond what the agent specifies.
- Do NOT inspect files outside the agent's named targets.
- Do NOT fix anything.
- Do NOT propose solutions.
- Do NOT blend findings from other agents.
- Gather only observable facts: file contents, file sizes, directory listings, grep matches, config values.
- Cite evidence with `file:line` references where possible.
- If something cannot be determined from the allowed scope, list it under UNCERTAINTIES rather than guessing.

## OUTPUT FORMAT

Use these exact section headers:

```
AGENT: <name>

FINDINGS:
- file:line references where possible
- concrete observations only
- no guesses

UNCERTAINTIES:
- explicitly list unknowns, gaps, or claims that could not be verified within scope
```

## RULES

- No edits
- No refactors
- No installs, no builds, no test runs unless the agent scope explicitly requires it
- No cross-agent blending — one agent per invocation
- No recommendations or next steps in the output
- STOP immediately after reporting
- Do not chain into another agent unless the user explicitly requests it
