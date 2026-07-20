# Proposal: SermonForge Public Distribution

> **Status: OPERATIONAL — the pipeline this proposal designed is live.** First public
> release `v1.0.0` shipped 2026-05-07 (Windows NSIS installer + signed/notarized macOS
> DMG). Latest release: **`v1.2.1`, 2026-07-20**.
>
> **Two defects escaped this pipeline and are recorded here rather than tidied away.**
> (a) Every universal DMG from `v1.0.0` through `v1.2.0` carried an **arm64**
> `better_sqlite3.node` inside its **Intel** half, so the app crashed at boot on every
> Intel Mac. `v1.2.1` shipped the corrected binaries; `USE_HARD_LINKS=false` plus the
> `afterPack` architecture gate now make that class unshippable, and a macOS runtime
> smoke launches the packaged app on an Intel runner before a release can go public.
> (b) macOS auto-update **never worked in any release up to and including `v1.2.1`** —
> every published `latest-mac.yml` listed only the DMG, and `electron-updater` requires
> a ZIP. The ZIP updater payload was added 2026-07-20; the first release carrying it is
> the first one Macs can actually update to.
>
> GitHub Actions builds both installers on every stable `vX.Y.Z` tag, publishes them
> into a **draft** release, and makes that release public only after a completeness
> check passes. **Section 14 (Release Pipeline) is the current operational reference,
> and [`docs/REFERENCE/release-smoke.md`](../REFERENCE/release-smoke.md) is the current
> smoke-test source. Sections 1–13 are the original 2026-04-28 proposal, retained as
> rationale and history** — where an older section and Section 14 disagree, Section 14
> is current.
>
> **Owner:** Ross · **Originally drafted:** 2026-04-28
> **Motivation (original):** SermonForge has been a single-user app on one machine. This proposal
> covers everything needed to distribute it to other pastors: downloadable installers
> for Mac and Windows, automatic updates, optional ESV API key entry, and the
> feedback/error visibility loop that replaces "I can see the console."

---

## 1. Goals

- A pastor downloads SermonForge, runs it, optionally enters an ESV API key, and is done.
- Mac and Windows both supported.
- When Ross ships an update, users get it automatically without doing anything.
- When something breaks for a user, Ross finds out without depending on copy/paste.
- Ross's local dev workflow is completely unchanged.

## 2. Non-Goals

- Mac App Store or Windows Store distribution. Direct download only.
- Telemetry or usage analytics.
- Any form of backend, server, or cloud sync. Still local-first.
- theology.db bundled in v1. Ships separately once corpus is clean (see [`docs/ARCHIVE/theology-corpus.md`](../ARCHIVE/theology-corpus.md) — proposal orphaned post-ARI; corpus retained on disk per ARI D5).

---

## 3. Current State

*(Updated 2026-07-10 to operational reality; the original 2026-04-28 gaps this table
tracked are all closed. Section 14 is the detailed reference.)*

| Piece | Status |
|-------|--------|
| Windows installer build | **Done** — NSIS `.exe` built by CI on every `v*` tag (local `npm run build` still works for packaging checks) |
| Mac build | **Done** — universal DMG, signed (Developer ID) + notarized (`notarytool`), built by CI since `v1.0.0` (2026-05-07) |
| Auto-updates | **Done** — `electron-updater` wired up via `electron/updater.js`; `latest.yml` + `latest-mac.yml` feeds live |
| Setup screen | **Done** — `SetupScreen.jsx`; optional ESV key via `safeStorage` + BTI telemetry preference (post-ARI: Anthropic key removed) |
| GitHub repo | Exists at `github.com/teamofoxen/sermonforge` |
| Feedback → GitHub Issues | **Replaced** — the GitHub-posting path (and `GITHUB_FEEDBACK_TOKEN`) was removed in the public-launch hardening pass (2026-06-09); in-app feedback goes to the BTI Cloudflare Worker (see `bti-build-mvp.md` + `docs/REFERENCE/privacy.md`) |
| Crash log / auto error capture | **Done** — `electron/logger.js` (`app.log`); local-only (see `privacy.md` — log lines are not attached to anything outbound) |
| GitHub Actions (automated builds) | **Done** — `.github/workflows/build.yml`; `build-windows` + `build-macos` jobs on `v*` tags, publish to GitHub Releases |
| Apple Developer account | **Confirmed** — notarization live since `v1.0.0` |
| Windows code signing cert | Still deferred — installers ship unsigned; SmartScreen warning on first install is expected |
| NIV / The Message (API.Bible) | **Removed** — ESV-only; `BIBLE_API_KEY` fully purged |

---

## 4. The Four Problems

### 4.1 API key
*ARI Phase 8 (2026-05-09):* The Anthropic API key requirement was removed when AI was
removed from the product. The setup screen still exists for the optional ESV key + the
BTI telemetry preference. The original Anthropic-key text below is preserved as historical
context for the distribution decisions made during the AI era.

~~Ross's personal key is currently in `.env` and would ship to everyone. Users need to
supply their own key from console.anthropic.com.~~

~~**Fix:** First-run setup screen (`SetupScreen.jsx`). App checks for a stored key on
launch. If none found, shows the screen. User pastes their key. App saves it to OS
secure storage (Electron's `safeStorage`). Never shows again.~~

~~In dev mode (`ELECTRON_DEV=1`) the app reads `.env` as always. No change to local workflow.~~

### 4.2 Mac support
*(Done — shipped with `v1.0.0`, 2026-05-07: universal DMG, signed + notarized via CI. The
paragraph below is the original proposal.)*

~~`package.json` only configures a Windows NSIS build.~~ Mac needs its own targets and assets.

**Fix:** Add Mac targets to the `build` section of `package.json`. Requires:
- `build/icon.icns` (Mac icon format)
- `build/entitlements.mac.plist` (required for notarization)
- Apple Developer Program membership ($99/year) — necessary for notarization. Without
  it, Mac users hit a hard "cannot be opened" block.

### 4.3 Auto-updates
Users currently have no way to receive updates. Every fix stays broken until they
manually re-download.

**Fix:** `electron-updater` package. On launch, checks GitHub Releases for a newer
version. Downloads silently. Installs on next close. User does nothing.
Only activates in packaged builds — dev is unaffected.

### 4.4 Silent failures
On Ross's machine, errors appear in the console. On a user's machine, they disappear.

**Fix:** Two layers:
1. **Crash log file** — Electron writes errors to a log in the user's AppData folder.
   Bug reports from the feedback modal automatically attach the last 50 lines.
   No copy/paste required. No external service. Privacy-safe.
2. **Unhandled exception hook** — `process.on('uncaughtException')` in `main.js`
   writes to the same log before the process exits.

The feedback → GitHub Issues pipeline already handles delivery. This just gives it
something useful to attach.

---

## 5. The Dev/Prod Gatekeeper

A single file — `electron/config.js` — answers all environment questions:

- Am I in dev mode?
- Where does the API key come from? (`.env` vs. `safeStorage`)
- Where does data live? (dev paths vs. user's AppData)
- Should I check for updates?
- Should I open dev tools?

Every hardcoded assumption about "Ross's machine" gets replaced with a call to this
config. This is what keeps dev and prod from bleeding into each other as the app grows.

---

## 6. Distribution Point

**GitHub Releases** at `github.com/teamofoxen/sermonforge/releases`.

- Windows `.exe` installer and Mac `.dmg` attached to each release.
- `electron-updater` reads from this same location for update checks.
- theology.db ships as a separate release asset (future — see Section 7).

No cost. No third-party distribution service needed.

---

## 7. theology.db Distribution

`theology.db` is currently ~496MB — too large to bundle in the installer.

**Plan:**
- Ship v1 without the theology corpus. App works fully without it (corpus search is
  an enhancement, not a core feature).
- Once the corpus cleanup is complete (Phase 0/1 of [`docs/ARCHIVE/theology-corpus.md`](../ARCHIVE/theology-corpus.md)), attach a
  versioned `theology.db` as a GitHub Release asset.
- On first launch (or when a new corpus version exists), app downloads it in the
  background with a progress indicator. User does nothing on subsequent updates.

---

## 8. What Users Need to Do (the short list)

1. Download the installer from the GitHub Releases page.
2. Run it (Mac: drag to Applications; Windows: run the `.exe`).
3. On first launch, optionally paste an ESV API key (from api.esv.org) for in-app passage text. Skippable.
4. Done.

All future updates happen automatically.

---

## 9. Build Automation

GitHub Actions runs on GitHub's servers when Ross pushes a version tag (`v1.0.1` etc.).
It builds both Mac and Windows installers and attaches them to a GitHub Release.
Ross's machine is not involved in the build process.

File: `.github/workflows/build.yml` — **exists and is live** (this section proposed it;
Section 14 Step 2 documents the as-built jobs, which are the current reference).

Requires secrets stored in GitHub repo settings (not in code). *(As-built note: notarization
settled on the App Store Connect API-key path — `APPLE_API_KEY_BASE64` / `APPLE_API_KEY_ID` /
`APPLE_API_ISSUER` — rather than the Apple-ID + app-specific-password pair proposed below;
see Section 14 Step 2. The build-time `.env` write was removed 2026-07-01 — no bundled
secrets.)* Original proposal list:
- `APPLE_ID` — for notarization
- `APPLE_ID_PASSWORD` — app-specific password
- `APPLE_TEAM_ID` — from Apple Developer account
- `CSC_LINK` + `CSC_KEY_PASSWORD` — Mac signing cert (exported from Keychain)
- `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` — Windows cert (optional, deferred)
- `GITHUB_FEEDBACK_TOKEN` — written into a build-time `.env` by the workflow (retired 2026-07-01 with its consumer); `ESV_API_KEY` is deliberately excluded (users supply their own via the setup screen). (Pre-ARI: `ANTHROPIC_API_KEY` was also excluded — moot now that AI is removed.)

---

## 10. Three New Mental Categories (ongoing, not one-time)

These don't require code — just a shift in how to think when building:

1. **Silent failures** — if something breaks, you won't see it. The crash log + feedback
   loop is the fix. But also: test the empty state. Users open the app to nothing.

2. **The empty state** — every screen that assumes existing data needs to work on day one
   with zero sermons, zero series, zero content. Test this before each release.

3. **The update gap** — a bug that ships stays broken until the next update. "Good enough
   to ship" means more than it did when you were the only user.

---

## 11. Phasing

| Phase | Scope | Prerequisite |
|-------|-------|--------------|
| 0 | `electron/config.js` — dev/prod gatekeeper | Nothing ✅ |
| 1 | `SetupScreen.jsx` — first-run optional ESV key + telemetry preference | Phase 0 ✅ |
| 2 | Crash log + auto-attach to feedback | Phase 0 ✅ *(the auto-attach half was later removed — the log is local-only now; see privacy.md)* |
| 3 | `electron-updater` wired up | Phase 0 ✅ |
| 4 | Mac build config + icons + entitlements | ✅ shipped with `v1.0.0` (2026-05-07) |
| 5 | GitHub Actions build workflow | ✅ live (`.github/workflows/build.yml`) |
| 6 | First public release on GitHub Releases | ✅ `v1.0.0` 2026-05-07; latest `v1.1.0` 2026-07-01 |
| 7 | theology.db as separate download | Dormant — the corpus's AI consumer was removed (ARI, 2026-05-09); revisit only if retrieval returns ([theology-corpus.md](../ARCHIVE/theology-corpus.md), orphaned per ARI D5) |

---

## 12. Release Smoke Test

**Moved 2026-06-10:** the canonical checklist now lives at
[`docs/REFERENCE/release-smoke.md`](../REFERENCE/release-smoke.md) — the
previous version of this section described surfaces deleted in the
invisible-system rebuild (tour, per-tab notebook, Manuscript tab).
`/release` Step 4 reads that file verbatim. If any step fails, do not tag.

---

## 13. Open Questions

*(Statuses updated 2026-07-10.)*

- **Apple Developer account** — ✅ resolved: the account exists and notarization has been
  live since `v1.0.0` (2026-05-07).
- **Windows cert** — still deferred, as decided: installers ship unsigned and the
  SmartScreen warning on first install is expected for the current wave.
- **Update channel** — still a single channel (latest). Defer a stable/beta split until there
  are enough users to matter.
- **theology.db hosting** — dormant with Phase 7 (the corpus's consumer was removed in ARI);
  the 2GB-per-file GitHub Releases note stands if it ever revives.

---

## 14. Release Pipeline (end-to-end)

What happens between "I'm ready to ship" and "every user has the new version." Each step lists what runs, the file or system that owns it, and where to look first if it breaks.

### Step 1 — Cut the release (local, human-driven)

**Owned by:** [`.claude/skills/release/SKILL.md`](../../.claude/skills/release/SKILL.md)

Run `/release`. The skill enforces hard gates in order:

1. Working tree clean, on `main`, in sync with `origin/main`, no unpushed commits.
2. `npm test` exits 0.
3. Version proposal from `git log <last-tag>..HEAD` heuristics — user confirms or overrides.
4. `/security-review` over `git diff <last-tag>..HEAD` — HIGH = hard stop, MEDIUM = require ack.
5. Smoke test ([`docs/REFERENCE/release-smoke.md`](../REFERENCE/release-smoke.md)) — every item must be confirmed yes.
6. `git tag vX.Y.Z` (lightweight) + `git push origin vX.Y.Z`.

**Note:** `package.json` `version` is **not** bumped manually — CI rewrites it from the tag name.

**If it breaks here:** the skill prints which gate failed and stops. Fix locally, re-run `/release`. Do not bypass.

### Step 2 — CI fires on the tag

**Owned by:** [`.github/workflows/build.yml`](../../.github/workflows/build.yml) — trigger `on: push: tags: v*`

Three jobs run on GitHub-hosted runners. Ross's machine is not involved.

**`gates`** (`runs-on: ubuntu-latest`, added 2026-07-13) runs first; both platform builds `needs:`-depend on it, so nothing packages unless the exact tagged commit passes every gate:
1. Checkout, Node 24, `npm ci`.
2. `npm test` (full suite), then `npx vitest run tests/persistence/` explicitly — the production-SQLite integration + migration/recovery matrix, run by name so the release log shows it.
3. `npm run lint`, `npm run spine-integrity`, `npx vite build`.

**`build-windows`** (`runs-on: windows-latest`, after `gates`):
1. Checkout, Node 24.
2. Stamp version + release channel from the tag (one step): `npm version "$TAG_VERSION" --no-git-tag-version --allow-same-version` + `npm pkg set sfReleaseChannel=stable` — the channel stamp marks a CI-published build, the only kind whose updater activates (2026-07-16; a local `npm run build` carries no stamp).
3. `npm ci`.
4. ~~Write build-time `.env` with `GITHUB_FEEDBACK_TOKEN`~~ — removed 2026-07-01; the token's only consumer (the legacy GitHub-posting feedback handler) was deleted in public-launch hardening, and builds need no bundled secrets.
5. `npx vite build` → `dist/`.
6. `npx electron-builder --win --publish never` → packages the installer; nothing uploaded yet.
7. Packaged smoke: `node scripts/packaged-smoke.cjs release/win-unpacked` — the actual unpacked app must launch, initialize/migrate its schema, load the preload bridge, render the primary window, and exit cleanly, or the job stops here with nothing published.
8. `npx electron-builder --win --prepackaged release/win-unpacked --publish always` → uploads `SermonForge-Setup.exe`, `SermonForge-Setup.exe.blockmap`, and `latest.yml` into the **draft** release for this tag (auth: `secrets.GITHUB_TOKEN`). `--prepackaged` points electron-builder at the exact directory the smoke just exercised (2026-07-20): the previous second full `electron-builder --win` re-fetched prebuilt natives and rebuilt the installer *after* the smoke passed, so the published bytes were never provably the smoked bytes. The package → smoke → publish order, and the `--prepackaged` provenance, are asserted per-job by [`tests/contracts/release-pipeline.test.ts`](../../tests/contracts/release-pipeline.test.ts).

**`build-macos`** (`runs-on: macos-latest`, after `gates`):
1. Checkout, Node 24, the same version + `sfReleaseChannel` stamp as Windows, `npm ci` (no build-time `.env` — same removal as Windows step 4).
2. `iconutil -c icns brand/icons/sermonforge.iconset -o build/icon.icns` — generate `.icns` at build time from the iconset. Then `npx vite build` → `dist/`.
3. **Diagnostic step** (always runs): probes the `.p12` — password length, character categories, SHA-256 hash, OpenSSL decrypt test (with and without MAC verify). Lets you tell at a glance whether secret rotation broke the cert.
4. Decode App Store Connect API key from `secrets.APPLE_API_KEY_BASE64` to `~/private_keys/AuthKey.p8`; export `APPLE_API_KEY=$HOME/private_keys/AuthKey.p8`.
5. `npx electron-builder --mac --publish always` with `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` — and `USE_HARD_LINKS: "false"` (2026-07-20). Hard links were the mechanism behind the v1.0.0–v1.2.0 Intel-half corruption: electron-builder links `node_modules` files into the packaged x64 half, then the arm64 rebuild truncate-writes `better_sqlite3.node` in place (same filename both arches), silently rewriting the file inside the already-packaged x64 app — so every shipped DMG crashed at boot on Intel Macs while the build log stayed clean. Real copies make the halves independent. Hard timeout 30 min. Builds both arch halves, assembles the universal app, then the **arch gate** ([`scripts/mac-arch-gate.cjs`](../../scripts/mac-arch-gate.cjs), wired as `build.afterPack` in `package.json`) proves the assembled app **before signing**: every Mach-O `.node`/`.dylib` in `app-x64.asar.unpacked` is x86_64 and in `app-arm64.asar.unpacked` is arm64 (fat binaries pass **only if they actually carry that half's architecture** — the fat header is parsed, not trusted; foreign-arch-labeled multi-arch layouts like onnxruntime's are skipped, but a binary whose bytes disagree with the architecture its own path advertises fails), `better_sqlite3.node` exists in both halves, and the main executable is fat. Any finding throws, so nothing signs, notarizes, or publishes. Then signs (Developer ID Application), notarizes via `notarytool`, staples, and uploads `SermonForge-Setup.dmg` (+ `.blockmap`), **`SermonForge-Setup.zip` (+ `.blockmap`) — the updater payload**, and `latest-mac.yml` into the **draft** release. The DMG is what a human downloads; the ZIP is what `electron-updater` can actually apply (see Step 4). A separate job then LAUNCHES the packaged app on both architectures — see `smoke-macos` below.
6. **On failure or cancel:** a second diagnostic step reruns `notarytool submit --verbose` directly and uploads the raw log as artifact `notarytool-diagnostic` (7-day retention) — that's how you debug when `electron-notarize` swallows the cause.

**`smoke-macos`** (matrix: `macos-15-intel` = x64, `macos-latest` = arm64; after `gates`) — added 2026-07-20:
Packages the universal app **unsigned and unpublished**, requires the `[mac-arch-gate] PASS` marker, then LAUNCHES it with `scripts/packaged-smoke.cjs`: the app must start, initialize its schema through `better_sqlite3`, load the preload bridge, render real application DOM, and exit cleanly. On the Intel runner macOS executes the x64 slice and loads the x64 half's native module — exactly the combination that shipped broken in `v1.0.0`–`v1.2.0`, which no static check could have caught at runtime and no human noticed for 74 days. Runner architectures are taken from `actions/runner-images`: **`macos-latest` is arm64**, so Intel needs its own label. Because it needs no credential it also runs on `workflow_dispatch`. `finalize-release` depends on it, so a macOS build that does not start leaves the release an unpublished draft.

**Publish target** (both jobs): `github.com/teamofoxen/sermonforge/releases/v<X.Y.Z>` — configured in `package.json` `build.publish` (`provider: github`, `owner: teamofoxen`, `repo: sermonforge`).

**If it breaks here:**
- Tag pushed but no CI run → tag name doesn't match `v*` (e.g. `1.0.1` not `v1.0.1`).
- Both platform jobs show as skipped → the `gates` job failed; open its log for the failing step. Nothing packages until the tagged commit passes every gate.
- Windows job fails → typically `npm ci`, the packaged smoke (the `SF_SMOKE_RESULT` line in the step log names what failed; nothing was published), or the NSIS step. Windows cert is intentionally absent today; SmartScreen warning on first install is expected.
- Mac fails before signing → `.icns` path, vite build error, or the arch gate (`[mac-arch-gate] FAIL` in the step log names the offending binary and its architecture; the fix is in the packaging pipeline, never in the gate).
- Mac fails at signing → check the diagnostic step output: `.p12` hash, password length, OpenSSL probe. Likely `MAC_CSC_LINK` / `MAC_CSC_KEY_PASSWORD` rotation or OpenSSL 3 vs Apple Keychain `.p12` mismatch (regenerate with `-legacy`).
- Mac fails at notarization → check `notarytool-diagnostic` artifact. Usually `APPLE_API_KEY_BASE64`, `APPLE_API_KEY_ID`, or `APPLE_API_ISSUER` mismatch, or pending Apple Developer agreement returning HTTP 403.
- Diagnostic context: signing artifacts and credentials inventory in `project_mac_distribution.md` memory entry.

### Step 3 — Artifacts land at GitHub Releases

**Owned by:** GitHub Releases at `github.com/teamofoxen/sermonforge/releases`.

Each stable tag produces a release containing **eight** assets. The expected set is
DERIVED from the packaging contract in `package.json` by
[`scripts/release-manifest.cjs`](../../scripts/release-manifest.cjs) — not written down
as a number, because an *assumed* six-asset manifest is precisely what let the missing
macOS updater payload go unnoticed for four releases:

| Asset | Role |
|---|---|
| `SermonForge-Setup.exe` | Windows installer **and** updater payload |
| `SermonForge-Setup.exe.blockmap` | differential-update map |
| `latest.yml` | Windows update feed |
| `SermonForge-Setup.dmg` | macOS installer — what the website links to |
| `SermonForge-Setup.dmg.blockmap` | differential-update map |
| `SermonForge-Setup.zip` | **macOS updater payload** — what `electron-updater` applies |
| `SermonForge-Setup.zip.blockmap` | differential-update map |
| `latest-mac.yml` | macOS update feed |

Run `node scripts/release-manifest.cjs --print` to see the current derived set.

**Publication is draft-first (2026-07-20).** `build.publish.releaseType` is `draft`, so
both platform jobs upload into a release nobody can see. A `finalize-release` job that
`needs` both platform builds *and* the macOS runtime smoke then runs
`node scripts/release-manifest.cjs --tag <tag>`, which checks every derived artifact for
presence and non-zero size, the feed version against the tag, each feed entry's declared
size against the published asset, **the real SHA-512 of the downloaded bytes**, the
presence of a `.zip` in `latest-mac.yml`, and the filenames the website hardcodes. Only
if all of that passes does it flip the release public — the single draft→public
transition in the whole pipeline — and then verify the live
`releases/latest/download/...` URLs return 200.

This replaced a model in which the release was created already-published, so it went
public the moment the **first** platform uploaded. Every release had a window where the
website's hardcoded Mac download 404'd (even the clean `v1.2.1`: ~2 minutes; `v1.2.0`:
~27 hours). GitHub auto-aliases the most recent **published** release as
`releases/latest/`, so an incomplete release captured that alias too.

**If it breaks here:**
- **CI green but the release is empty, or missing one platform's assets** → the most
  likely cause is NOT a token error. `electron-publish`'s GitHub publisher refuses to
  touch a release that has been **published for more than two hours**, logs
  `skipped publishing`, and **exits successfully**. This is what happened on 2026-07-18
  (`v1.2.0`): a green macOS job uploaded nothing, and the release sat live and
  Mac-less for ~27 hours. Draft-first prevents it — drafts always accept uploads — so
  if you see this on a draft, check the job log for the real upload error instead.
  The historical recovery, for reference: `gh release edit <tag> --draft=true`, re-run
  the failed job, then let the finalizer publish it. Setting `EP_GH_IGNORE_TIME=true`
  also bypasses the two-hour refusal.
- **The finalizer failed** → read its log; it names every missing or disagreeing
  artifact. The release stays a draft and nothing reached a user. Fix the cause and
  re-run the failed job — do NOT publish the draft by hand, because that is the check
  you would be skipping.
- **A release is stuck as a draft** → that is the safe state, not an incident. Nothing
  is public until the finalizer says so.
- **Release exists and `releases/latest/download/...` 404s** → the finalizer's own URL
  check covers this; if it passed and a URL still 404s, the release was later
  unpublished or the asset was deleted by hand.
- **New tag uploaded but `releases/latest/` still points at the old one** → the newer
  release is still a draft (finalizer failed or was skipped) or was marked pre-release.

### Step 4 — Existing users auto-update

**Owned by:** [`electron/updater.js`](../../electron/updater.js) (uses `electron-updater`).

Activates only in packaged builds that carry the CI release-channel stamp — `isPackaged` (from `electron/config.js`) **and** `sfReleaseChannel: "stable"` in `package.json`, stamped by `build.yml` and never present in a local `npm run build` (2026-07-16). In dev, any unpackaged run, or an unstamped local build, the background check is a no-op (`app.log`: `[updater] disabled — local build`).

On launch, after a 3-second delay:
1. `autoUpdater.checkForUpdates()` polls the configured GitHub repo for `latest.yml` (Win) or `latest-mac.yml` (Mac).
2. If a newer version exists, downloads in the background (`autoDownload: true`). **On macOS the download is the ZIP, never the DMG.** `electron-updater`'s `MacUpdater` calls `findFile(files, "zip", ["pkg","dmg"])` and throws `ERR_UPDATER_ZIP_FILE_NOT_FOUND` if the feed lists no ZIP — which is why macOS auto-update could never complete in any release up to `v1.2.1`, whose feeds were dmg-only. The DMG remains the human installer; the ZIP exists solely so the updater has something it can apply.
3. On `update-downloaded`, main pushes `updater-status` to the renderer, and the sidebar ([`src/components/Sidebar.jsx`](../../src/components/Sidebar.jsx)) shows a quiet, dismissible line with a **Restart now** affordance — no dialog, nothing steals focus. (The renderer also pulls the status on mount, covering a download that finishes before React subscribes.)
4. **Restart now** routes through main's `before-quit` flush — debounced edits save first — then installs and relaunches. Otherwise (dismissed, or never clicked), `autoInstallOnAppQuit: true` applies the update on the next quit.

The manual path — Help → **Check for Updates…** — never stays silent, and (since 2026-07-20) never claims a step that has not happened. It branches on the updater's own `isUpdateAvailable` verdict rather than a version comparison, and on real recorded state: dev run, unstamped local build, **downloading**, downloaded-and-waiting, up to date, and check-failed each get a plain answer, parented to the main window. It previously announced *"A new version is downloading"* off a bare `latest !== current` compare — untrue during a rollback or draft window, and untrue on every Mac, where the download threw before a byte moved. Where a download may not complete, the copy names the manual route (`teamofoxen.com/sermonforge`) so the pastor is never left believing an install is guaranteed.

Updater state is recorded only by the event that proves it — `available`, `downloading`, `downloaded`, `error` — so no surface can report a step the updater has not reached.

All updater events log to `app.log` ([`electron/logger.js`](../../electron/logger.js)) — local-only; no part of it is attached to anything outbound (see Step 7).

**If it breaks here:**
- User reports they didn't get the update → check `app.log` for `[updater]` entries. Common causes: not on a packaged build, a local build without the `sfReleaseChannel` stamp (log shows `[updater] disabled — local build`; only CI-published builds auto-update, since 2026-07-16), feed malformed (rare), GitHub Releases unreachable, machine offline at every launch since the release.
- **Mac user sees `Update available` then `Update failed` in `app.log`** → the release's `latest-mac.yml` lists no `.zip`. Every release through `v1.2.1` was in this state. The finalizer now refuses to publish such a release; if you see it, the release predates 2026-07-20 and the user must install the current DMG by hand from the website.
- Log shows `[updater] disabled — SF_SMOKE run` → expected; the packaged release smoke deliberately runs with no updater, so the release gate carries no dependency on GitHub being reachable.
- Update downloads but never installs → check `app.log` for `[updater] Update downloaded: <version>`. The sidebar line is passive — install rides the next full quit (`autoInstallOnAppQuit`), so the usual cause is the app never actually quitting between sessions. If **Restart now** was clicked and nothing happened, the `before-quit` path blocked the quit; look for flush/close errors logged right after the click.

### Step 5 — New users download from the website

**Owned by:** `C:/Projects/ArmyFootball26/sermonforge/index.html` (separate repo, see `reference_sermonforge_website.md` memory).

Two `btn-download` anchors hardcoded to:
- `https://github.com/teamofoxen/sermonforge/releases/latest/download/SermonForge-Setup.exe`
- `https://github.com/teamofoxen/sermonforge/releases/latest/download/SermonForge-Setup.dmg`

These auto-resolve to the current latest release. **Cutting a release does not require editing the page.** Edit it only when copy / layout / screenshots change. Direct push to `main` (no PR) per `feedback_teamofoxen_direct_push.md`.

**If it breaks here:**
- Button 404s → the release is in draft, or the asset filename changed (electron-builder config drift).
- Mac button missing entirely → page edit reverted. Re-add the anchor using the two URLs listed immediately above in this Step — they are the spec. (This used to point at Sections 4.2 and 8, neither of which contains a button spec.)
- Filenames must match `package.json` `build.win.artifactName` / `build.mac.artifactName`; `tests/contracts/release-pipeline.test.ts` pins both, and the release finalizer re-checks the live URLs, so a rename fails the release instead of silently 404ing every download button.

### Step 6 — First run on the user's machine

**Owned by:** [`src/components/SetupScreen.jsx`](../../src/components/SetupScreen.jsx) + [`electron/keystore.js`](../../electron/keystore.js).

On first launch (no stored keys):
1. SetupScreen prompts for an optional ESV API key (`api.esv.org`) — skippable.
2. Q9 telemetry consent toggle (BTI Phase 1, see `bti-build-mvp.md`).
3. Keys persist to OS keychain via `safeStorage` — **no plaintext fallback**; if the keystore refuses, the key is not stored at all and the screen says so in platform-neutral wording, offering **Continue without the key** so the pastor is not trapped on the screen (previously the only exit was clearing the key field, which nothing told him). Skip never clobbers an already-stored key.
4. The screen stops appearing once the telemetry-consent settings row exists — see the gate note below.

Subsequent launches read from `safeStorage` (prod) or `.env` (dev — `ELECTRON_DEV=1`). Dev/prod gatekeeping in [`electron/config.js`](../../electron/config.js).

**If it breaks here:**
- SetupScreen never appears → the gate is the **settings row alone**: `app-get-key-status` runs `SELECT value FROM settings WHERE key = 'bti_telemetry_enabled'` and returns `{configured: Boolean(row)}`. The ESV key file is **never consulted**. (This document previously said either the key file or the setting would skip the screen; that was wrong, and would mislead anyone debugging a reset database whose key file survived.) To make the screen reappear, clear that settings row.
- ESV passages don't render in workspace → key was rejected at save time, or `safeStorage` returned encrypted bytes the OS can no longer decrypt (machine restored, user profile changed).

### Step 7 — Closing the loop

**Owned by:** [`electron/logger.js`](../../electron/logger.js) (`app.log`) + the BTI telemetry/feedback channel (`electron/telemetry/`).

When something breaks for a user:
1. Errors land in `app.log` under `userData/logs` (`logs-dev` in dev). The log is local-only — no part of it is attached to anything outbound (see [`docs/REFERENCE/privacy.md`](../REFERENCE/privacy.md)). **Help → Open Log Folder** takes the pastor there; **Help → Open Data Folder** opens `userData/data`, which does NOT contain the log, so do not send anyone there for it.
2. `process.on('uncaughtException')` writes to the same log before exit; a `crash` telemetry event (short error message, ≤500 chars, never log lines or sermon content) reaches the developer unless the pastor opted out.
3. **Deliberate feedback is not crash telemetry, and the UI now says which happened.** `sendImmediate` reports `{ok, queued, reason}` and both surfaces render the truth via [`src/utils/feedbackOutcome.js`](../../src/utils/feedbackOutcome.js): *sent*, *queued* (offline — stored locally, sends later), *off* (telemetry disabled — the note was **not** kept; the copy gives the support email), *failed*. Until 2026-07-20 both surfaces printed "Sent. Thank you" unconditionally, so an opted-out pastor's bug reports were destroyed while the app thanked him for them.
4. Anything queued for retry is drained across sessions by [`electron/telemetry/queueSweep.js`](../../electron/telemetry/queueSweep.js) — consent re-checked before every send, bounded to 20 files and 30 days, malformed records quarantined beside the queue. Before this, queue files were per-session and only the current session's file was ever read, so anything queued at exit was stranded forever.

**Before the app boots**, none of the above exists. A pastor whose installer or app will not start reaches the developer through the **Report a problem** link on `teamofoxen.com/sermonforge` (the repository issue tracker). That route was added 2026-07-20: the page previously had no contact of any kind, which is why the Intel boot crash went unreported for 74 days and was found only by an out-of-band field report.
3. User clicks a feedback flag in-app (workspace writing surface or planner topbar) or "Send feedback…" in the sidebar → the note goes to the developer-run BTI Cloudflare Worker. (The original GitHub-Issues path via `GITHUB_FEEDBACK_TOKEN` was removed in public-launch hardening, 2026-06-09.)

This closes the pipeline: ship → install → run → break → the signal surfaces without depending on the user copying a console.

---

### Quick reference — where each layer lives

| Layer | File / system |
|---|---|
| Release ceremony | `.claude/skills/release/SKILL.md` |
| Build orchestration | `.github/workflows/build.yml` |
| Builder config | `package.json` `build.*` block |
| Publish target config | `package.json` `build.publish` |
| Auto-update client | `electron/updater.js` |
| Update feed files | `latest.yml`, `latest-mac.yml` (uploaded by CI) |
| Distribution endpoint | `github.com/teamofoxen/sermonforge/releases` |
| Marketing download page | `C:/Projects/ArmyFootball26/sermonforge/index.html` (separate repo) |
| First-run setup | `src/components/SetupScreen.jsx` |
| Key storage | `electron/keystore.js` (`safeStorage`) |
| Dev/prod gatekeeper | `electron/config.js` |
| Crash log | `electron/logger.js` (`app.log`) |
| Feedback transport | BTI Phase 1 — see `bti-build-mvp.md` |
