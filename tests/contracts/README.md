# Contract tests

Each test file in this directory maps 1:1 to a contract clause in
`docs/CORE.md`. Filenames follow the convention `<clause-id>-<short-name>.test.ts`
or `.test.tsx` for tests that need to render a React component.

## Test environment — Path B chosen

The Phase 5 spec preferred Path A (real Electron main process + in-memory
SQLite, full IPC round-trip). Path B is what this directory implements: the
spine boundary (`validateAndCommit` + `spineRead` from `electron/main.js`)
is reproduced as an in-memory test fixture in `_helpers/test-spine.ts`.
Renderer-side spine (`src/core/spine.ts`) calls the bridge transparently
because the fixture mounts itself on `globalThis.electronAPI.spine`.

### Why Path B

* `electron/main.js` boots a real Electron app — `app.whenReady()`, BrowserWindow
  setup, embedder host, AI handlers, sql.js WASM file resolution, dotenv
  loading, OneDrive warning. Spinning that up under Vitest is genuinely
  invasive: the test process needs Electron's main runtime, which the
  vitest CLI doesn't provide. Forcing it in would require a bespoke
  Electron-test runner (e.g. spectron / playwright) and substantial setup
  that this phase explicitly disclaims ("do not modify... IPC handlers").
* The contract-clause logic — the `validateAndCommit` switch — is what the
  tests actually exercise. The fidelity loss is the SQL layer, not the
  contract enforcement logic. The fixture mirrors the same `{ ok, code,
  clause, message }` envelopes and the same rejection citations.

### Fidelity tradeoff (explicit)

The fixture and the main-process implementation can drift. Drift surface:

* Adding a new mutation op or rejection citation requires updating both
  files. A unit test of contract-clause behavior that passes in the
  fixture but is broken in main.js would be invisible.
* The fixture uses plain `Map` stores; main.js uses sql.js. SQL semantics
  differences (constraint violations, transaction rollback) aren't
  exercised here.

Mitigations:

* `scripts/spine-integrity.js` enforces that no renderer code bypasses the
  spine in either direction.
* The structural reimplementation in `_helpers/test-spine.ts` is small —
  the contract-clause checks are the load-bearing part, and they're
  literal copies of the main.js logic.
* Path A can be revisited later as a higher-fidelity verification layer
  without reshaping these tests; the test bodies care about the
  rejection envelope shape, not the database backend.

## Running

```
npm test -- tests/contracts/
```

Tests use Vitest. RTL-based tests (`process-3`, `process-4`) carry a
`@vitest-environment jsdom` pragma; pure-Node tests (everything else) use
the project's default node environment.

## What's covered

| Clause | File | Layer |
|---|---|---|
| State #3 | `state-3-no-anonymous-atoms.test.ts` | renderer fast-fail + IPC re-validation |
| State #5 | `state-5-one-name-per-concept.test.ts` | source scan |
| Process #1 | `process-1-monotonic.test.ts` | main-side validateAndCommit |
| Process #2 | `process-2-evidence-gated.test.ts` | main-side, with legacy carve-out |
| Process #3 | `process-3-movement-visible.test.tsx` | RTL render + meta-test for marker presence |
| Process #4 | `process-4-pc-follows-text.test.tsx` | RTL render of new-sermon shell |
| Process #5 | `process-5-ai-augments.test.ts` | main-side validateAndCommit |
| Mutation #1 | `mutation-1-user-typing-wins.test.ts` | main-side validateAndCommit |
| Mutation #3 | `mutation-3-saves-are-events.test.ts` | spine.persistMutation |
| Surface #1 | `surface-1-one-vocabulary.test.ts` | source scan (shares helper with State #5) |
| Surface #4 | `surface-4-you-are-here.test.ts` | router-vs-sidebar set comparison |

## What's NOT covered (deferred)

* Contract clauses without a Phase 5 test file: State #1, #2, #4, #6;
  Mutation #2, #4, #5; Surface #2, #3, #5. Some are structurally enforced
  (State #1 by the spine itself; Mutation #2 by the ProposalPanel
  component pattern) and some are deferred to audit-triage Pilots C–E.
* SPRD phase mechanics (Process #4 progressive PC). The `process-4` test
  asserts only the structural shell ("PC absent != Study locked"); the
  per-phase mechanics will be tested when SPRD lands.
