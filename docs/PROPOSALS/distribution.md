# Proposal: SermonForge Public Distribution

> **Status:** Draft — 2026-04-28
> **Owner:** Ross
> **Motivation:** SermonForge has been a single-user app on one machine. This proposal
> covers everything needed to distribute it to other pastors: downloadable installers
> for Mac and Windows, automatic updates, user-supplied Claude API keys, and the
> feedback/error visibility loop that replaces "I can see the console."

---

## 1. Goals

- A pastor downloads SermonForge, runs it, enters their API key once, and is done.
- Mac and Windows both supported.
- When Ross ships an update, users get it automatically without doing anything.
- When something breaks for a user, Ross finds out without depending on copy/paste.
- Ross's local dev workflow is completely unchanged.

## 2. Non-Goals

- Mac App Store or Windows Store distribution. Direct download only.
- Telemetry or usage analytics.
- Any form of backend, server, or cloud sync. Still local-first.
- theology.db bundled in v1. Ships separately once corpus is clean (see `theology-corpus.md`).

---

## 3. Current State

| Piece | Status |
|-------|--------|
| Windows installer build | Working (`npm run build` → NSIS `.exe`) |
| Mac build | Not configured |
| Auto-updates | Not wired up |
| API key setup screen | Not built — `.env` is the only mechanism |
| GitHub repo | Exists at `github.com/teamofoxen/sermonforge` |
| Feedback → GitHub Issues | **Working** — `GITHUB_FEEDBACK_TOKEN` in `.env`, posts structured issues |
| Crash log / auto error capture | Not built |
| GitHub Actions (automated builds) | Not set up |
| Apple Developer account | Not confirmed |
| Windows code signing cert | Deferred — optional for first wave |

---

## 4. The Four Problems

### 4.1 API key
Ross's personal key is currently in `.env` and would ship to everyone. Users need to
supply their own key from console.anthropic.com.

**Fix:** First-run setup screen (`SetupScreen.jsx`). App checks for a stored key on
launch. If none found, shows the screen. User pastes their key. App saves it to OS
secure storage (Electron's `safeStorage`). Never shows again.

In dev mode (`ELECTRON_DEV=1`) the app reads `.env` as always. No change to local workflow.

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
- Once the corpus cleanup is complete (Phase 0/1 of `theology-corpus.md`), attach a
  versioned `theology.db` as a GitHub Release asset.
- On first launch (or when a new corpus version exists), app downloads it in the
  background with a progress indicator. User does nothing on subsequent updates.

---

## 8. What Users Need to Do (the short list)

1. Download the installer from the GitHub Releases page.
2. Run it (Mac: drag to Applications; Windows: run the `.exe`).
3. On first launch, enter their Claude API key from console.anthropic.com.
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
- `GITHUB_FEEDBACK_TOKEN` + `BIBLE_API_KEY` + `ESV_API_KEY` — written into a build-time `.env` by the workflow; `ANTHROPIC_API_KEY` is deliberately excluded (users supply their own via setup screen)

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
| 1 | `SetupScreen.jsx` — first-run API key entry | Phase 0 ✅ |
| 2 | Crash log + auto-attach to feedback | Phase 0 ✅ |
| 3 | `electron-updater` wired up | Phase 0 ✅ |
| 4 | Mac build config + icons + entitlements | Apple Developer account confirmed |
| 5 | GitHub Actions build workflow | Phases 3 + 4 complete |
| 6 | First public release on GitHub Releases | Phase 5 complete |
| 7 | theology.db as separate download | theology-corpus.md Phase 1 complete |

---

## 12. Open Questions

- **Apple Developer account** — does Ross have one, or does it need to be created?
  Blocks Phase 4 entirely.
- **Windows cert** — skip for v1 and warn users to click through SmartScreen? Almost
  certainly yes for first wave (trusted pastors who know Ross).
- **Update channel** — one channel (latest) or stable/beta split? Defer until there
  are enough users to matter.
- **theology.db hosting** — GitHub Releases supports up to 2GB per file. Sufficient
  for current corpus. Revisit if it grows past that.
