# SermonForge Beta — Setup Note

A short walkthrough for installing the app and giving feedback. Pair this with the longer letter (`docs/PROPOSALS/bti-tester-summary.md`) and the privacy reference (`docs/REFERENCE/privacy.md`).

---

## Before you install

Two things to read first:

1. The cohort letter (`bti-tester-summary.md`). What you're signing up for, in plain terms.
2. The privacy doc (`privacy.md`). What the app sends, what it doesn't, and the toggle that controls it.

If anything in those documents doesn't sit right, please tell me before you install.

---

## Download

I'll send you a download link by email — one for Mac, one for Windows.

- **Mac.** A signed and notarized DMG. Open it, drag SermonForge into your Applications folder. First launch may take an extra second while macOS finishes verifying — that's normal.
- **Windows.** A signed installer (`.exe`). Double-click it and follow the prompts.

A note for both platforms: **don't run SermonForge from a folder that's syncing to OneDrive, iCloud, or Dropbox.** The app keeps your sermons in a local SQLite database, and cloud sync can corrupt it. The default install location is fine.

Updates arrive automatically. You won't need to re-download anything.

---

## First launch — the setup screen

The first time you open SermonForge, you'll see a one-time setup screen.

**ESV API key** — recommended, not required. Powers the passage view in the workspace. Free to get from `api.esv.org` (sign in, request a key, paste it in). If you skip it, the passage column stays empty; everything else works.

There is no other API key to set up. SermonForge does not call any third-party AI service. Crossway (for ESV passages) is the only outbound network credential the app uses, and only when you load a passage.

**Telemetry and feedback toggle** — default on. This is the toggle described in the privacy doc. With it on, the app sends a small set of usage events and any flags or feedback you choose to send. Sermon content is never captured. With it off, nothing leaves your device.

**For the cohort, please leave the toggle on unless something feels off.** It's the channel that lets your flags and feedback reach me. If you turn it off and want it back on later, message me — until a Settings panel ships in a later version, the only way to flip it back is via me.

Click "Save and Open SermonForge" (or "Skip and Open SermonForge" if you didn't enter an ESV key) and you're in.

---

## The first few minutes in the app

A short tour runs the first time you open the workspace. It walks you through the main tabs — Study, Blueprint, Manuscript — and the per-tab notebook surface. Take it once; it's about three minutes.

After the tour, open a sermon (or create one from the Dashboard) and start preparing the way you normally would. Don't try to use every feature at once. Use the tabs you'd reach for in your normal week. The signal I want is what your actual prep looks like with this in it, not a careful test pass.

---

## Where the feedback surfaces live

Two affordances are built into the production app. You don't have to remember them — they'll be visible when they're useful.

**The flag button.** A small icon at the top of the Study tab and the Blueprint tab. Click it when something feels off in the moment — a question put a word in your mouth, the flow nudged you somewhere you wouldn't have gone, a field felt heavier than it should. A short popover opens: a one-line note input and Send / Send blank.

You can send blank. The click itself is signal. Use it freely.

**Send feedback…** A menu item in the sidebar that opens a longer form. Pick a dimension, write a few lines, send. The dimensions are:

- Structural overreach
- Workflow-fit
- Question quality
- Trust
- Friction and surprise
- Onboarding and first-run
- Reliability and weirdness
- Performance and feel
- Voice and frame
- What surprised you

Use whichever fits. "What surprised you" is the catch-all if nothing else matches. Good for the things that don't fit a flag.

Both surfaces queue locally if you're offline and ship when you're back online.

---

## What to do if something looks broken

Just flag it and move on. You don't need to file a bug report or include reproduction steps. Crashes are captured automatically.

If the app won't open at all and you can't even reach a flag button, email me directly.

---

## What to do if you want out

Tell me. No explanation needed. You can either keep the app and stop sending feedback (turn the telemetry toggle off in a future Settings panel, or message me to flip it), or uninstall it. Either is fine.

---

## A reminder of what I'm asking

The hardest feedback — *"I went back to my old workflow"*, *"the question put a word in my mouth"*, *"I keep meaning to open it and forgetting"* — is the most valuable. The encouragement is kind, but it won't change a decision. The hard things will.

That's the whole reason for the program. Thank you for being part of it.

---

*— Ross*

*Questions before you start? Email me.*
