# Release Smoke Test

Run before tagging any release — `/release` Step 4 reads this file verbatim
and asks one yes/no question per numbered item. Auto-update ships the build
to every installed user in the background; treat each tag as a production
deploy. **If any step fails, do not tag.**

> **Automated gates (Session 5, 2026-07-13).** Pushing the tag now runs a
> `gates` job on the EXACT tagged commit before either platform build can
> start: `npm ci` (immutable install), the full test suite, the
> production-SQLite integration + migration/recovery matrix
> (`tests/persistence/`), lint, spine integrity, and the Vite production
> build. The Windows job then packages with `--publish never`, runs the
> bounded packaged smoke (`node scripts/packaged-smoke.cjs` — the real
> unpacked app must launch, initialize/migrate its schema, load the preload
> bridge, render the window, and exit cleanly, in an isolated userData), and
> only then publishes. The macOS job publishes after the same gates
> (signing + notarization run only there — no local environment can test
> them; the manual checklist below remains the human half).

Rewritten 2026-06-10 (UX overhaul T17): the previous checklist lived in
`docs/PROPOSALS/distribution.md` §12 and described surfaces deleted in the
invisible-system rebuild (tour, per-tab notebook, Manuscript tab).

Use the packaged build (installer or portable), never `npm run dev`, for
every item. Items marked **(Win + Mac)** must run on both platforms.

> Local builds never auto-update: only CI stamps `sfReleaseChannel` into
> package.json, and `electron/updater.js` is inert without it. This is what
> makes local smoke builds testable at all — before the stamp (2026-07-16),
> the published release outranked the local 1.0.0 version pin and silently
> replaced the build under test within seconds of launch. Item 10 is
> unaffected (it uses a CI-published previous release, which carries the stamp).

1. **First-run setup** — fresh install (or delete `userData/sf-esv.enc` and
   clear the `bti_telemetry_enabled` setting): the setup screen appears;
   the api.esv.org link opens the browser; saving a key works (and pasting
   one with a leading "Token " still validates); Skip works; the
   usage-reports choice persists across relaunch.
2. **Sample sermon** — Dashboard → "Open a sample sermon": lands inside the
   Manuscript (no sermon-start overlay), content visible. Type something,
   reopen the sample — the edit survived. "Start the sample fresh" resets it.
3. **New sermon + walk** — create a sermon (no title field by design; click
   Forge with no Book picked — an inline error answers instead of a dead
   button; pick a Book + chapter:verse, Forge), Begin through the start
   overlay, type into a field, use Back and Next, open the Map (header +
   counts + you-are-here), jump to a question — it scrolls to and flashes
   that question.
4. **Close-flush** — type a sentence and close the window within a second:
   relaunch shows the sentence. Repeat with quit (Alt-F4 / Cmd-Q).
5. **Notebook** — open the notebook drawer, type, switch notebook tabs
   (Study/Assembly/Manuscript), relaunch: all three contents survive.
6. **Finish + export** — walk to the last field → "Finish sermon →" opens
   the completion screen; Export to Word writes the docx under
   `Documents/SermonForge/exports/Manuscripts/` and opens it; Mark as
   preached moves the sermon to Preached Sermons; Reopen brings it back.
7. **Soft delete** — delete a sermon from All Sermons: the card swaps to a
   stub with Undo; Undo restores it. Delete again, relaunch: it stays gone
   from every list and from search.
8. **Search** — search a word typed into the sermon body (Body prose):
   the hit appears labeled "BODY · SERMON BODY".
9. **Menu (Win + Mac)** — the menu shows File/Edit/View/Help only; no
   Reload/DevTools in the packaged build; **on macOS, cut/copy/paste work
   in a text field** (Edit roles); Help → About shows the real version +
   the Crossway notice; Help → Email Support opens a mail draft.
10. **Updater (needs a prior release installed)** — install the PREVIOUS
    version, launch, wait for the download: the quiet sidebar line appears
    (no dialog steals focus); "Restart now" installs and relaunches with
    edits intact; alternatively dismiss, quit normally, relaunch — the new
    version is running. Help → Check for Updates answers in every state.
11. **Dark prepaint** — switch to dark mode, quit, relaunch: the window and
    the splash paint dark from the first frame (no light flash).
12. **Migration** — launch this build over a copy of a previous-version
    library: no migration errors in `app.log`, sermons intact, schema
    version reads 33 (or current), search works.
13. **Passage popup** — with a valid key: passage text + Crossway line
    render. With no key: the popup offers "Add ESV key" and saving a key
    in-place loads the passage without closing anything.
14. **Quit + relaunch clean** — after the full pass: no crash entries in
    `app.log` from the session.
