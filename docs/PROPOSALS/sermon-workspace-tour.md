# Sermon Workspace Tour — Implementation Spec

> **Post-ARI status (2026-05-09):** ARI Phase 7 deleted the Delivery tab and its
> tour stop, so the current shipping tour is **11 stops, ending at Manuscript**
> (Stop 12 below is retired). The AI-philosophy stop was already retired in the
> 2026-05-08 plain-prose reframe. References to deleted files (`DeliveryTab.jsx`,
> `AIPanel.jsx`) and the deleted IPC channel `db-loadTourSermon` (rolled into the
> `"spine"` channel as `load-tour-sermon` / `remove-tour-sermon` ops) are
> historical. Engine, mock sermon, per-field anchors, and 11-stop locked content
> still ship.

> Status: design locked, implementation shipped (engine 2026-04-28; SFDI
> reconciliation 2026-05-05; throughline-first reframe 2026-05-05;
> plain-prose reframe 2026-05-08; Stop 12 retirement 2026-05-09 with ARI Phase 7).
> The Series Planner tour is a separate, later effort — do not entangle the two.

> **Plain-prose reframe (2026-05-08):** The locked content below is the
> 12-stop plain-prose narrative. Each stop is one short imperative
> sentence naming the move at that surface. The pre-reframe 17-stop
> throughline-anchored tour is retired — it carried too much cognitive
> load and leaned on insider language (throughline, cumulative
> thought-unit table, named outcomes, lens cluster, outside-in). The new
> tour walks the workspace surface by surface: workspace shell → study
> rail → Observe → Interpret → Redemptive Thread → Implications → Sermon
> Spine (MPT/MPS) → Outline → Functional Elements → Frame → Manuscript →
> Delivery. Substrate stable: tour engine (2026-04-28), mock sermon,
> per-field anchors, ThroughlineRail, and SFDI Phase 1/2/3/4 + SADI Step
> 5 field shapes are all locked and shipping. The mock sermon the tour
> walks is "The Hope That Does Not Disappoint" — Romans 5:1-5 (sermon ID
> `tour-romans-sermon-01`).

---

## What we're building

A guided spotlight tour of the Sermon Workspace. Triggered from the Dashboard
("Take the guided tour" inside the Explore SermonForge tile). The tour opens
a tour-only sample sermon — "The Hope That Does Not Disappoint" (Romans 5:1-5,
sermon ID `tour-romans-sermon-01`) — and walks through 11 stops (12 originally; Stop 12 retired with ARI Phase 7). Each stop =
a spotlight on a real element + a callout card with one short sentence
naming the move at that surface. User clicks "Next" to advance; can leave
anytime.

The tour sermon is hidden from the Dashboard and Series Planner. It is seeded
on first tour launch (idempotent), opened directly by ID when the tour starts,
and excluded from every list query via an `id NOT LIKE 'tour-%'` filter so it
never appears as ordinary user content.

This is the second of two planned tours. The Series Planner tour is a separate,
later effort — do not entangle the two.

---

## Key decisions already made

- **Format:** guided spotlight tour. User-paced via Next button. Not auto-playing.
  Not a video. Not connected to a Series Planner tour.
- **Entry:** dashboard buttons in the page header — "Tour Sermon Workspace" and
  (later) "Tour Sermon Planner". The legacy "See Demo" button and the entire
  demo-mode annotation system have been removed; the tour replaces them.
- **Tour data:** the tour ships with its own sample sermon ("The Hope That
  Does Not Disappoint", Romans 5:1-5). It uses a `tour-` ID prefix and is
  filtered out of every list query so it never appears on the dashboard. The
  `load-tour-sermon` handler is delete-then-insert, so each tour launch wipes
  any prior tour data and inserts a fresh copy — sample sermon updates take
  effect on every click; auto-sweeps stale `tour-sotm-*` rows from the prior
  Matthew 5 mock.
- **Visual language:** dark ink callout card (`var(--ink)` background) with a
  2px gold top border, IBM Plex Serif heading, IBM Plex Serif body. Spotlight is
  a soft radial-gradient vignette (not a hard mask), with a subtle gold glow on
  the highlighted element. Step counter at the top of the card, gold "Next"
  button, understated "Leave tour" link.
- **Voice:** pastoral, plain, direct. No marketing-speak, no insider terms,
  no sequential connectors ("first / next / then"). One imperative sentence
  per stop. Callout text is locked — copy verbatim.

---

## Codebase touchpoints

- `src/components/Dashboard.jsx` — "Tour Sermon Workspace" button launches
  the tour
- `src/components/SermonWorkspace.jsx` — top-level workspace; tab
  orchestration; tour drives tab switches via `desiredUi`
- `src/components/StudyTab.jsx` — exegesis phases, MPT/MPS, outline,
  functional elements steps; consumes `desiredUi.studyStep` /
  `desiredUi.studySubPhase`
- `src/components/ThroughlineRail.jsx` — vertical rail down the left of
  the Study tab tracking the four sub-phases and field nodes; anchored at
  `data-tour-id="throughline-rail"` for stop 2 and per-phase
  `data-tour-id="rail-phase-{1..4}"` on each `tl-segment` for stops 3-6
  (the phase tour stops point at the rail, not the worksheet, so the
  spotlight lands on a small named node instead of the full-height
  worksheet body)
- `src/components/FrameTab.jsx` — Step 5 (Sermon Frame: Intro +
  Conclusion); anchored at `data-tour-id="frame-worksheet"` for stop 10
- `src/components/ManuscriptTab.jsx` — Manuscript tab (terminal stage
  post-ARI); the Flow Coach / Ear Check / Tune-Up surfaces are now
  read-only structured prompts in `src/components/ManuscriptReview.jsx`,
  not surfaced in the tour
- `src/tour/workspaceTourStops.js` — the 11-stop array (Stop 12 Delivery
  retired with ARI Phase 7); `TourContext` drives prerequisite-aligned
  UI state for each stop
- `electron/tourData.js` + the spine ops `load-tour-sermon` /
  `remove-tour-sermon` — tour sermon seeding (delete-then-insert per
  launch); list-query filters (`id NOT LIKE 'tour-%'`) keep the sample
  out of normal lists
- `src/styles/global.css` — design system tokens (use only these; no new
  colors, no new fonts)

---

## The stops (locked content — 11 currently shipping, Stop 12 retired)

> Heading is bold. Body is one imperative sentence. Copy verbatim.

### Stop 1 — Workspace shell
**The Sermon Workspace.** This is where you build one sermon, start to finish.

### Stop 2 — Study rail
**Your Study at a Glance.** Watch your study come together here.

### Stop 3 — Observe
**Observe.** Anchor your sermon in the text.

### Stop 4 — Interpret
**Interpret.** Surface the meaning of the text.

### Stop 5 — Redemptive Thread
**Redemptive Thread.** Show how the text points to Christ.

### Stop 6 — Implications
**Implications.** Show what the text asks of us.

### Stop 7 — Sermon Spine (MPT/MPS)
**Sermon Spine.** Develop the spine of your outline.

### Stop 8 — Outline
**Outline.** Shape the sermon into points.

### Stop 9 — Functional Elements
**Functional Elements.** Support your points with explanations from the text, applications, and illustrations.

### Stop 10 — Frame
**Frame.** Write your intro and conclusion.

### Stop 11 — Manuscript
**Manuscript.** Write your sermon.

> Stop 12 (Delivery) was retired by ARI Phase 7 (2026-05-09) when the
> Delivery tab was deleted. Manuscript is now the terminal sermon-prep
> stage; export-to-Word lives at the bottom of the Manuscript tab.

---

## Plain-prose reframe — what changed (2026-05-08)

The 17-stop throughline-anchored tour was correct on the discipline but
overwhelming as a tour. Long bodies, insider terms (*throughline*,
*cumulative thought-unit table*, *named outcomes*, *lens cluster*,
*outside-in*, *the marinate-output*), and sequential connectors carried
the design's logic into the pastor-facing copy. The 12-stop plain-prose
tour above is the simplification. Five shape-changing decisions:

1. **One sentence per stop.** Bodies dropped from 4-7 sentences to a
   single imperative sentence. The spotlight + title carry the naming
   work; the body says only what move you make at that surface.
2. **No sequential connectors.** "First / next / then / after that /
   finally" pulled from every body. The stop sequence carries order
   implicitly.
3. **Insider terms removed.** Throughline, named outcomes, cumulative
   thought-unit table, lens cluster, outside-in, marinate-output, etc.
   The discipline still holds — those terms still describe how the
   workspace works internally — but they don't surface in the tour copy.
   The throughline rail keeps a dedicated stop (Stop 2) under a plain
   pastor-facing title ("Your Study at a Glance"); the four-named-outcomes
   recap stop is retired since each phase stop now carries the rail in its
   peripheral spotlight.
4. **Stops collapsed to one-per-spotlight.** Phase 1's two stops
   (outside-in + lens cluster) collapse to one Observe stop. Frame's two
   stops (Intro + Conclusion) collapse to one Frame stop (same anchor
   `frame-worksheet`). The AI-philosophy stop, the four-named-outcomes
   recap stop, and the closing "That's the workspace" stop are retired
   entirely.
5. **MPT/MPS retitled.** "Step 2 — MPT → MPS" → "Sermon Spine." The
   pastor-facing label names what the artifact *is* — the spine of the
   outline — rather than the abbreviation pair.

Stop count locked at 12. Substrate (engine, mock sermon, per-field
anchors, prerequisite-driven tab/step alignment) unchanged.

---

## Implementation questions (engine-level — already resolved)

These were settled when the engine shipped 2026-04-28:

1. **Spotlight anchoring** — `data-tour-id` attributes on real DOM elements. Decoupled, simple to extend. SpotlightWorksheet emits per-field anchors via `fieldKeyToTourId`.
2. **Tab/step navigation** — prerequisite-driven. Each stop declares `prerequisites: { tab, drawerOpen, studyStep, studySubPhase, ... }`; `TourContext` exposes `desiredUi`; consumer surfaces (SermonWorkspace, StudyTab) align state when the tour is active.
3. **Persistence** — `sf_tour_workspace_seen` localStorage flag, set on `complete`, cleared on `leave`. Replayable from the dashboard at any time.
4. **Tour-sermon lifecycle** — seeded lazily by `db-loadTourSermon` on first dashboard click; delete-then-insert on every load (sample is for exploration, not persistent work); auto-sweeps stale `tour-*` rows.

---

## Out of scope for this spec

- Series Planner tour (separate, later)
- Delivery tab tour beyond the single overview stop (the Delivery screen
  still needs UX work; deeper coverage waits)
- Manuscript audit tools (Flow Coach / Ear Check / Tune-Up) called out
  in tour copy; pastor encounters them in the Manuscript tab itself
- Four-named-outcomes recap stop (retired in plain-prose reframe; each
  phase stop carries the rail in its peripheral spotlight)
- Spotlight-pan-during-stop animation (current engine: one anchor per
  stop)
