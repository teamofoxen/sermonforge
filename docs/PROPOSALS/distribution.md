# Proposal: SermonForge Public Distribution

> **Status:** Draft — 2026-04-28
> **Owner:** Ross
> **Motivation:** SermonForge has been a single-user app on one machine. This proposal
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

| Piece | Status |
|-------|--------|
| Windows installer build | Working (`npm run build` → NSIS `.exe`) |
| Mac build | Not configured |
| Auto-updates | **Done** — `electron-updater` wired up via `electron/updater.js` |
| Setup screen | **Done** — `SetupScreen.jsx`; optional ESV key via `safeStorage` + BTI telemetry preference (post-ARI: Anthropic key removed) |
| GitHub repo | Exists at `github.com/teamofoxen/sermonforge` |
| Feedback → GitHub Issues | **Working** — `GITHUB_FEEDBACK_TOKEN` in `.env`, posts structured issues |
| Crash log / auto error capture | **Done** — `electron/logger.js`; last 50 lines attached to feedback |
| GitHub Actions (automated builds) | Not set up |
| Apple Developer account | Not confirmed |
| Windows code signing cert | Deferred — optional for first wave |
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
`package.json` only configures a Windows NSIS build. Mac needs its own targets and assets.

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

File: `.github/workflows/build.yml` (to be created).

Requires secrets stored in GitHub repo settings (not in code):
- `APPLE_ID` — for notarization
- `APPLE_ID_PASSWORD` — app-specific password
- `APPLE_TEAM_ID` — from Apple Developer account
- `CSC_LINK` + `CSC_KEY_PASSWORD` — Mac signing cert (exported from Keychain)
- `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` — Windows cert (optional, deferred)
- `GITHUB_FEEDBACK_TOKEN` — written into a build-time `.env` by the workflow; `ESV_API_KEY` is deliberately excluded (users supply their own via the setup screen). (Pre-ARI: `ANTHROPIC_API_KEY` was also excluded — moot now that AI is removed.)

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
| 2 | Crash log + auto-attach to feedback | Phase 0 ✅ |
| 3 | `electron-updater` wired up | Phase 0 ✅ |
| 4 | Mac build config + icons + entitlements | Apple Developer account confirmed |
| 5 | GitHub Actions build workflow | Phases 3 + 4 complete |
| 6 | First public release on GitHub Releases | Phase 5 complete |
| 7 | theology.db as separate download | [theology-corpus.md](../ARCHIVE/theology-corpus.md) Phase 1 complete |

---

## 12. Release Smoke Test

Run before tagging any release. Auto-updater ships this build to every user in the background — treat each tag as a production deploy.

1. **Setup screen** — fresh install (or delete `userData/sf-esv.enc` + clear the `bti_telemetry_enabled` setting): screen appears, ESV save / skip both work, telemetry preference persists.
2. **Tour load** — Dashboard → "Take the tour": tour sermon seeds, opens, spotlight runs end-to-end.
3. **Notebook persistence** — open any sermon, type into the per-tab Notebook, switch tabs, return: content survives. Quit + relaunch confirms disk write.
4. **Export** — export a sermon to docx (Manuscript tab → Export to Word): file lands in `Documents/SermonForge/exports/Manuscripts/`.
5. **Quit + relaunch** — confirm DB persisted, no migration errors, no crash log entries from the session.

If any step fails, do not tag.

---

## 13. Open Questions

- **Apple Developer account** — does Ross have one, or does it need to be created?
  Blocks Phase 4 entirely.
- **Windows cert** — skip for v1 and warn users to click through SmartScreen? Almost
  certainly yes for first wave (trusted pastors who know Ross).
- **Update channel** — one channel (latest) or stable/beta split? Defer until there
  are enough users to matter.
- **theology.db hosting** — GitHub Releases supports up to 2GB per file. Sufficient
  for current corpus. Revisit if it grows past that.

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
5. Smoke test (Section 12 above) — every item must be confirmed yes.
6. `git tag vX.Y.Z` (lightweight) + `git push origin vX.Y.Z`.

**Note:** `package.json` `version` is **not** bumped manually — CI rewrites it from the tag name.

**If it breaks here:** the skill prints which gate failed and stops. Fix locally, re-run `/release`. Do not bypass.

### Step 2 — CI fires on the tag

**Owned by:** [`.github/workflows/build.yml`](../../.github/workflows/build.yml) — trigger `on: push: tags: v*`

Two parallel jobs run on GitHub-hosted runners. Ross's machine is not involved.

**`build-windows`** (`runs-on: windows-latest`):
1. Checkout, Node 20, `npm install`.
2. Sync `package.json` version: `npm version "$TAG_VERSION" --no-git-tag-version --allow-same-version`.
3. Write build-time `.env` with `GITHUB_FEEDBACK_TOKEN` (from `secrets.FEEDBACK_TOKEN`).
4. `npx vite build` → `dist/`.
5. `npx electron-builder --win --publish always` → uploads `SermonForge-Setup.exe`, `SermonForge-Setup.exe.blockmap`, and `latest.yml` to the GitHub Release for this tag (auth: `secrets.GITHUB_TOKEN`).

**`build-macos`** (`runs-on: macos-latest`):
1. Checkout, Node 20, `npm install`, version sync, build-time `.env` (same as Windows).
2. `iconutil -c icns brand/icons/sermonforge.iconset -o build/icon.icns` — generate `.icns` at build time from the iconset.
3. **Diagnostic step** (always runs): probes the `.p12` — password length, character categories, SHA-256 hash, OpenSSL decrypt test (with and without MAC verify). Lets you tell at a glance whether secret rotation broke the cert.
4. Decode App Store Connect API key from `secrets.APPLE_API_KEY_BASE64` to `~/private_keys/AuthKey.p8`; export `APPLE_API_KEY=$HOME/private_keys/AuthKey.p8`.
5. `npx electron-builder --mac --publish always` with `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`. Hard timeout 30 min. Builds, signs (Developer ID Application), notarizes via `notarytool`, staples, uploads `SermonForge-Setup.dmg` + `latest-mac.yml` to the GitHub Release.
6. **On failure or cancel:** a second diagnostic step reruns `notarytool submit --verbose` directly and uploads the raw log as artifact `notarytool-diagnostic` (7-day retention) — that's how you debug when `electron-notarize` swallows the cause.

**Publish target** (both jobs): `github.com/teamofoxen/sermonforge/releases/v<X.Y.Z>` — configured in `package.json` `build.publish` (`provider: github`, `owner: teamofoxen`, `repo: sermonforge`).

**If it breaks here:**
- Tag pushed but no CI run → tag name doesn't match `v*` (e.g. `1.0.1` not `v1.0.1`).
- Windows job fails → typically `npm install` or NSIS step. Windows cert is intentionally absent today; SmartScreen warning on first install is expected.
- Mac fails before signing → `.icns` path, vite build error.
- Mac fails at signing → check the diagnostic step output: `.p12` hash, password length, OpenSSL probe. Likely `MAC_CSC_LINK` / `MAC_CSC_KEY_PASSWORD` rotation or OpenSSL 3 vs Apple Keychain `.p12` mismatch (regenerate with `-legacy`).
- Mac fails at notarization → check `notarytool-diagnostic` artifact. Usually `APPLE_API_KEY_BASE64`, `APPLE_API_KEY_ID`, or `APPLE_API_ISSUER` mismatch, or pending Apple Developer agreement returning HTTP 403.
- Diagnostic context: signing artifacts and credentials inventory in `project_mac_distribution.md` memory entry.

### Step 3 — Artifacts land at GitHub Releases

**Owned by:** GitHub Releases at `github.com/teamofoxen/sermonforge/releases`.

Each tag produces a release containing:
- `SermonForge-Setup.exe` + `.blockmap` (Windows installer)
- `SermonForge-Setup.dmg` (Mac universal, signed + notarized)
- `latest.yml` (Windows auto-update feed)
- `latest-mac.yml` (Mac auto-update feed)

GitHub auto-aliases the most recent **published** release as `releases/latest/`. The `releases/latest/download/<filename>` URL pattern resolves to whichever release currently holds that alias.

**If it breaks here:**
- CI succeeded but release is empty → `--publish always` got a token error; re-check `secrets.GITHUB_TOKEN` permissions.
- Release exists but `releases/latest/download/...` 404s → the release is still in draft state. Publish it.
- New tag uploaded but `releases/latest/` still points to the old one → newer release was marked as pre-release. Toggle off.

### Step 4 — Existing users auto-update

**Owned by:** [`electron/updater.js`](../../electron/updater.js) (uses `electron-updater`).

Activates only in packaged builds (`isPackaged` check from `electron/config.js`). In dev or any unpackaged run, it's a no-op.

On launch, after a 3-second delay:
1. `autoUpdater.checkForUpdates()` polls the configured GitHub repo for `latest.yml` (Win) or `latest-mac.yml` (Mac).
2. If a newer version exists, downloads in the background (`autoDownload: true`).
3. On `update-downloaded`, shows a dialog: **Restart Now / Later**.
4. If user picks Later (or never sees the dialog), `autoInstallOnAppQuit: true` applies the update on next quit.

All updater events log to `app.log` ([`electron/logger.js`](../../electron/logger.js)) — last 50 lines auto-attach to feedback bug reports.

**If it breaks here:**
- User reports they didn't get the update → check `app.log` for `[updater]` entries. Common causes: not on a packaged build, `latest.yml` malformed (rare), GitHub Releases unreachable, machine offline at every launch since the release.
- Update downloads but never installs → `quitAndInstall` was blocked; check for "Restart Now" dialog log and whether the user clicked Later then never quit.

### Step 5 — New users download from the website

**Owned by:** `C:/Projects/ArmyFootball26/sermonforge/index.html` (separate repo, see `reference_sermonforge_website.md` memory).

Two `btn-download` anchors hardcoded to:
- `https://github.com/teamofoxen/sermonforge/releases/latest/download/SermonForge-Setup.exe`
- `https://github.com/teamofoxen/sermonforge/releases/latest/download/SermonForge-Setup.dmg`

These auto-resolve to the current latest release. **Cutting a release does not require editing the page.** Edit it only when copy / layout / screenshots change. Direct push to `main` (no PR) per `feedback_teamofoxen_direct_push.md`.

**If it breaks here:**
- Button 404s → the release is in draft, or the asset filename changed (electron-builder config drift).
- Mac button missing entirely → page edit reverted; re-add per the spec in this document's Section 4.2 + Section 8.

### Step 6 — First run on the user's machine

**Owned by:** [`src/components/SetupScreen.jsx`](../../src/components/SetupScreen.jsx) + [`electron/keystore.js`](../../electron/keystore.js).

On first launch (no stored keys):
1. SetupScreen prompts for an optional ESV API key (`api.esv.org`) — skippable.
2. Q9 telemetry consent toggle (BTI Phase 1, see `bti-build-mvp.md`).
3. Keys persist to OS keychain via `safeStorage`. Screen never shows again.

Subsequent launches read from `safeStorage` (prod) or `.env` (dev — `ELECTRON_DEV=1`). Dev/prod gatekeeping in [`electron/config.js`](../../electron/config.js).

**If it breaks here:**
- SetupScreen never appears → check `userData/sf-esv.enc` and `bti_telemetry_enabled` settings; either presence skips the screen.
- ESV passages don't render in workspace → key was rejected at save time, or `safeStorage` returned encrypted bytes the OS can no longer decrypt (machine restored, user profile changed).

### Step 7 — Closing the loop

**Owned by:** [`electron/logger.js`](../../electron/logger.js) (`app.log`) + the feedback transport.

When something breaks for a user:
1. Errors land in `app.log` (writable user-data path).
2. `process.on('uncaughtException')` writes to the same log before exit.
3. User clicks a feedback flag in-app → modal opens → submission auto-attaches the last 50 log lines → posts a structured GitHub Issue via `GITHUB_FEEDBACK_TOKEN`.

This closes the pipeline: ship → install → run → break → bug surfaces in your inbox without depending on the user copying a console.

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
