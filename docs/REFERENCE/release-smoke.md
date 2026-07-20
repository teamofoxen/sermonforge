# Release Smoke Test

Run before tagging any release — `/release` Step 4 reads this file verbatim
and asks one yes/no question per numbered item. Auto-update ships the build
to every installed user in the background; treat each tag as a production
deploy. **If any step fails, do not tag.**

> **Automated gates (Session 5, 2026-07-13).** Pushing the tag runs a
> `gates` job on the EXACT tagged commit before either platform build can
> start: `npm ci` (immutable install), the full test suite, the
> production-SQLite integration + migration/recovery matrix
> (`tests/persistence/`), lint, spine integrity, and the Vite production
> build. The Windows job then packages with `--publish never`, runs the
> bounded packaged smoke (`node scripts/packaged-smoke.cjs` — the real
> unpacked app must launch, initialize/migrate its schema, load the preload
> bridge, render **real application DOM**, and exit cleanly, in an isolated
> userData), and only then publishes **the exact directory it smoked**
> (`--prepackaged`). Probing the window alone was not enough: the old check
> passed on a blank white screen. A `smoke-macos` job packages and LAUNCHES
> the app on both an Intel (`macos-15-intel`) and an Apple Silicon runner —
> the static architecture gate cannot prove the app starts, which is how a
> boot crash reached every Intel Mac for three releases. That automation is
> why the manual half below is a single check.

> **Nothing is public until it is verified (2026-07-20).** Both platform jobs
> upload into a DRAFT release. A `finalize-release` job then runs
> `node scripts/release-manifest.cjs --tag <tag>` — every expected artifact
> present and non-empty, feeds agreeing with the tag and with the real
> SHA-512 of the published bytes, the macOS ZIP updater payload present, the
> website's hardcoded filenames present — and only then flips the release
> public and checks the live download URLs. **The completion signal is the
> `finalize-release` job going green.** A release still showing as a draft
> has not shipped; that is the safe state, not an incident. Never publish a
> draft by hand — that is precisely the check you would be skipping.

> Local builds never auto-update: only CI stamps `sfReleaseChannel` into
> package.json, and `electron/updater.js` is inert without it. This is what
> makes local smoke builds testable at all — before the stamp (2026-07-16),
> the published release outranked the local 1.0.0 version pin and silently
> replaced the build under test within seconds of launch.

1. **Run the build** — `npm run build`, run the installer (never
   `npm run dev`, never the win-unpacked shortcut), and use the app for a
   few minutes: it launches, your sermons are there, you can type, and an
   edit survives a quit + relaunch. Works?

---

**Sized for today's distribution (pastor's ruling, 2026-07-18: one user,
testing on his own machine).** The full 14-item walkthrough is parked at
[`docs/ARCHIVE/release-smoke-full-checklist.md`](../ARCHIVE/release-smoke-full-checklist.md)
— move it back over this file when SermonForge ships to a wider audience.
