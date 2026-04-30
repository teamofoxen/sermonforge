---
name: run-agent
description: Execute one or more read-only investigation agents safely and return findings. Use when the user types /run-agent or says "Run Agent X" (or "Run Agents X and Y") after an /agents plan has been produced.
trigger: /run-agent
---

# run-agent

Execute one or more investigation agents safely and return findings.

This skill is the execution counterpart to `/agents`. It performs strictly scoped, read-only investigations and reports observable facts. It does not fix, refactor, or propose solutions.

When the user names multiple agents, dispatch them as parallel read-only sub-agents (one sub-agent per named investigation agent) and return one independently-formatted report per agent. Do not merge their findings.

## INPUT

One or more agent names + scope.

Typically supplied as:
- `Run Agent A`
- `Run Agent B only`
- `Run Agents A and B`
- `Run Agents A, B, and C in parallel`
- `/run-agent <name> — <scope>`

If no prior `/agents` plan exists in context, or any named agent is ambiguous, ask the user to clarify BEFORE proceeding.

## BEHAVIOR

- Follow each agent's scope exactly as defined in the `/agents` plan.
- Do NOT expand scope beyond what the agent specifies.
- Do NOT inspect files outside the agent's named targets.
- Do NOT fix anything.
- Do NOT propose solutions.
- When running multiple agents, each one's findings are reported in its own block. Do NOT merge or cross-reference findings between agents in this skill — that is the orchestration agent's job (if one exists in the plan) or the user's.
- Gather only observable facts: file contents, file sizes, directory listings, grep matches, config values.
- Cite evidence with `file:line` references where possible.
- If something cannot be determined from the allowed scope, list it under UNCERTAINTIES rather than guessing.

## DISPATCH

- One named agent → run it directly or as a single sub-agent.
- Multiple named agents → dispatch each as its own parallel sub-agent in a single tool-call batch. Each sub-agent receives only its own scope; none of them see the others' briefs.
- Dependent agents (e.g. an orchestration agent that consumes earlier findings) must be run after their dependencies, not in parallel with them.

## OUTPUT FORMAT

For each agent run in this invocation, emit one block using these exact section headers. When multiple agents are run, present the blocks back-to-back in the order requested, with no merging or comparative commentary between them.

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
- No merging of findings across agents within this skill — each agent's report stands alone
- No recommendations or next steps in the output
- STOP immediately after reporting
- Do not chain into another agent unless the user explicitly requests it
