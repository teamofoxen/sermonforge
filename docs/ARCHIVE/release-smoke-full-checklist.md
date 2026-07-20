# Release Smoke Test — full 14-item checklist (PARKED 2026-07-18)

Parked by the pastor's ruling, 2026-07-18: at today's distribution — one
user, testing on his own machine — the release smoke is a single
"run the build and check it works" step in
[`docs/REFERENCE/release-smoke.md`](../REFERENCE/release-smoke.md).
`/release` Step 4 reads that file, so it now asks one question.

**When SermonForge ships to a wider audience, reinstate this checklist**
by moving the items below back into `docs/REFERENCE/release-smoke.md` —
the skill picks them up automatically. Re-verify each item against the
current app first; surfaces drift while a checklist sits parked. (The
items below were last true at the v1.2.0 surface, schema v33.)

---

Use the packaged build (installer or portable), never `npm run dev`, for
every item. Items marked **(Win + Mac)** must run on both platforms.

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
    (This item needs a CI-published previous release — local builds never
    auto-update since the `sfReleaseChannel` stamp, 2026-07-16.)
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
