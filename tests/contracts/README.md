# Contract tests

Test files in this directory map to contract clauses in `docs/CORE.md` (plus
structural parity/tripwire suites added by later initiatives). Filenames
follow `<clause-id>-<short-name>.test.ts`, or `.test.tsx` for tests that
render a React component.

## Two test layers (since the Session-2 seam extraction, 2026-07-13)

**Layer 1 — the in-memory fixture (this directory's component tests).**
`_helpers/test-spine.ts` reproduces the spine boundary (`validateAndCommit` +
`spineRead`) as a plain-`Map` fixture mounted on `globalThis.electronAPI.spine`.
Renderer code (`src/core/spine.ts`) calls it transparently. It exists for
SPEED: component tests mount the real React surfaces against it without any
database, and the whole suite stays in seconds. It is a mirror, and mirrors
can drift — see the parity tripwires below.

**Layer 2 — the production persistence seam (`tests/persistence/`).**
`electron/persistence.cjs` is the PRODUCTION mutation dispatcher, read
router, query helpers, search projection, and migration ladder — extracted
from `electron/main.js` (which now delegates to it) so it is directly
executable without booting Electron.
`tests/persistence/production-persistence.test.ts` runs that module against
real SQLite files (via `better-sqlite3-node`, an npm alias of the same
better-sqlite3 version that stays Node-loadable regardless of Electron ABI
rebuilds of the main copy). Create/read, structured mutation, series
attachment, soft-delete/restore, search projection, State-#3 rejections,
close/reopen durability, and the FULL migration ladder execute for real
there.

### What still isn't executed by any test

`electron/main.js` itself — the Electron lifecycle (app.whenReady, window
close/quit events) and the IPC handler registrations. Those are covered by
source-scan tripwires (`exit-seam-wiring.test.ts`, `db-userdata-path-permanent.test.ts`),
`node --check`, and the build-and-run workflow — not by test execution. Do
not read a green suite as Electron-lifecycle coverage.

## Drift control between the fixture and production

* `contracts-allowlist-sync.test.ts` — SERMON/SERIES/SECTION_COLUMNS set-equal
  across `contracts.ts` ⟷ `contracts.cjs` ⟷ the fixture.
* `contracts-mirror-parity.test.ts` — vocabulary/sequence parity across the
  same three mirrors.
* `mutation-kind-parity.test.ts` — `user_input` is the only mutation kind in
  fixture AND production dispatch (`electron/persistence.cjs`).
* `spine-read-op-parity.test.ts` — the read-op set is identical across
  main.js routing, production `spineRead`, and the fixture (set + switch).
  This is the tripwire that turns a missing fixture op into a FAILING test
  instead of routine stderr (the `get-all-tags` drift class).

## Running

```
npm test                      # everything
npm test -- tests/contracts/  # fixture-layer contract tests
npm test -- tests/persistence # production seam against real SQLite
```

Tests use Vitest. RTL-based tests carry a `@vitest-environment jsdom` pragma;
pure-Node tests use the default node environment.

## History

The original Phase-5 write-up chose "Path B" (fixture-only) because main.js
could not be required outside Electron; that constraint drove years of
mirror maintenance. The Session-2 extraction (2026-07-13) removed the
constraint for persistence itself — the production dispatcher and migration
ladder are now under direct test — while the fixture layer stays for fast
component tests. (That old write-up also referenced sql.js, live AI
handlers, and a `process-1-monotonic` test file; the driver is
better-sqlite3, AI was removed in ARI 2026-05-09, and the process-1 test was
deleted in the trail-deletion sweep Phase G.)
