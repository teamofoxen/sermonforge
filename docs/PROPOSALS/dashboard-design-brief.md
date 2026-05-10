# Dashboard Design Brief — for handoff

This is the SermonForge home screen. Pastor opens the app, lands here.
The dashboard is **a re-entry point, not a stats page** — its job is to get
the pastor back into work fast. No charts, no coverage badges, no analytics.

If you're reading this as the designer: the screen renders cleanly but
it feels stapled together. The pieces don't speak the same visual language.
This document gives you everything you need to fix that without breaking the
underlying code or the broader design system.

---

## 1. What the screen is doing (top → bottom)

1. **Verse band** (`DashboardVerseCarousel.jsx`) — rotating Scripture quote.
   Refreshes every 15s. White → parchment vertical gradient, 1px gold
   horizontal rule across the bottom edge.

2. **2×2 tile grid** (`Dashboard.jsx`) — the four actions:
   - **Build a sermon** (hero — gold left bar)
   - **Build a series**
   - **Where you left off** (in-progress sermons; empty if none)
   - **Explore SermonForge** (guided tour, sample sermon)

3. **Preacher quote** (`DashboardPreacherQuote.jsx`) — rotating quote from
   a historical preacher (Spurgeon, Edwards, Calvin, etc.) with a small
   stencil portrait. Refreshes every 15s.

---

## 2. What feels stapled — my read

These are the friction points worth fixing. Not every one needs to be solved;
showing them so you have my diagnosis to react to.

| # | Issue | Why it reads wrong |
|---|---|---|
| 1 | **Three competing surface colors stacked vertically** | Verse band gradient → white hero tile → parchment-warm secondary tiles → parchment page background → preacher quote. Five surface tones in one screen. |
| 2 | **Hero tile underweighted** | Hero is the same title size, same blurb size, same height as the three secondary tiles. The only "hero-ness" is a 4px gold left bar and a faint corner glow. By glance you can't tell which is the primary action. |
| 3 | **Forced equal-height grid** | `grid-auto-rows: 1fr` stretches every tile to the tallest one. The Resume Work tile (up to 5 rows) sets the height; the hero blurb is one line, leaving the hero with a big empty zone. |
| 4 | **Eyebrow color split** | Hero eyebrow is gold + dot. Other three eyebrows are ink-ghost (faded brown). Reads as "one is highlighted, three are dim" rather than as a clear hierarchy. |
| 5 | **Verse band feels disconnected** | The illuminated 1px gold rule under the verse reads as a hard separator. The grid below has its own padding, its own max-width, no visual tether back to the verse. |
| 6 | **Preacher quote is a third footprint** | Layout is different from everything above (portrait + centered text on a narrow column). It's elegant on its own but doesn't share rhythm with the grid. |
| 7 | **Inline styles in the JSX** | `Dashboard.jsx` has many `style={{...}}` blocks (Resume rows, Explore rows, badge labels). Mixed with CSS classes. Designer changes will be painful unless we move these into the stylesheet first. |
| 8 | **Two near-identical row treatments in different tiles** | "Resume" rows and "Explore" rows are the same pattern (parchment-warm pill, gold left bar, serif label) but live in different tiles with no visual cue that they're the same control type. |

---

## 3. Hard constraints — please don't change these without asking

The SermonForge design system is locked. The designer can rearrange, restructure
hierarchy, tighten spacing, refine the rhythm — but **don't introduce new
fonts or new palette colors**. Everything below is canonical.

### Color tokens (from `src/styles/global.css`)

```
--ink:           #1a1410   /* primary text, sidebar background */
--ink-mid:       #3d3229   /* secondary text */
--ink-soft:      #6b5c4e   /* tertiary text */
--ink-ghost:     #a8998a   /* faded labels, eyebrows */

--parchment:     #f7f3ec   /* page background */
--parchment-warm:#efe9de   /* secondary tile background */
--parchment-deep:#e4dace   /* borders, dividers */

--gold:          #b8860b   /* primary accent, CTAs */
--gold-bright:   #d4a017   /* hover state */
--gold-pale:     #f0e4b8   /* subtle washes */

--crimson:       #8b1a1a   /* alerts, "delivered without marking complete" */
--crimson-soft:  #c0392b
--sage:          #4a6741   /* planning stage */
--slate:         #2c3e50   /* outline stage */

--white:         #ffffff   /* primary tile background, cards */
```

### Typography (two voices, one humanist family)

| Voice | Family | When |
|---|---|---|
| Reading | **IBM Plex Serif** | Headlines, body, italic quotes, sermon prose, tile titles, blurbs |
| Structural | **JetBrains Mono** | Eyebrows, scripture refs, attribution names, dates, all caps labels |

Mono surfaces are **uppercase** with letter-spacing 0.14–0.18em. Serif surfaces
have letter-spacing -0.005em. **Italic Plex Serif** is reserved for quotes
and the Big Idea. Don't use Plex Sans here.

### Shadows

```
--shadow-soft: 0 2px 12px  rgba(26,20,16,0.08)   /* tiles at rest */
--shadow-med:  0 4px 24px  rgba(26,20,16,0.12)   /* tile hover */
--shadow-deep: 0 8px 40px  rgba(26,20,16,0.18)   /* modals */
```

### Radius

```
--radius:    4px   /* buttons, pills, small surfaces */
--radius-lg: 8px   /* tiles, cards */
```

---

## 4. Layout reference

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (260px, --ink bg, gold gradient right border)      │
│                                                              │
│   ┌───────────────────────────────────────────────────┐    │
│   │ Verse band (full width, min-h 160px)              │    │
│   │  · gradient white → parchment                     │    │
│   │  · gold 1px rule across the bottom                │    │
│   └───────────────────────────────────────────────────┘    │
│                                                              │
│   ┌────────────── dash-content ──────────────┐              │
│   │  max-width: 1280px, centered             │              │
│   │  padding: 28px 36px 48px                 │              │
│   │                                           │              │
│   │   ┌─────────────┐    ┌─────────────┐    │              │
│   │   │ Build       │    │ Build       │    │              │
│   │   │ a sermon    │    │ a series    │    │              │
│   │   │ (HERO)      │    │             │    │              │
│   │   └─────────────┘    └─────────────┘    │              │
│   │   ┌─────────────┐    ┌─────────────┐    │              │
│   │   │ Where you   │    │ Explore     │    │              │
│   │   │ left off    │    │ SermonForge │    │              │
│   │   │             │    │             │    │              │
│   │   └─────────────┘    └─────────────┘    │              │
│   │                                           │              │
│   │   gap: 20px between tiles                │              │
│   │   grid-auto-rows: 1fr (forced equal)     │              │
│   └──────────────────────────────────────────┘              │
│                                                              │
│   ┌──────── preacher quote, max-width 820px ────────┐       │
│   │  portrait (108×135) + centered quote + name     │       │
│   └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

Notes:
- The sidebar (260px) is not visible on the dashboard — the dashboard fills the
  content area edge-to-edge. (The brief originally also mentioned a 320px AI panel
  on the right; ARI 2026-05-09 deleted the AI panel entirely.)
- `dash-page-body` removes the default `page-body` padding so the verse band
  can sit flush against the topbar.

### Tile internals

Every tile (hero and secondary):
- `min-height: 160px`
- `padding: 18px 22px`
- `border: 1px solid var(--parchment-deep)`
- `border-radius: 8px`
- `box-shadow: var(--shadow-soft)` at rest, `--shadow-med` on hover
- `transform: translateY(-2px)` on hover

Hero only:
- `background: var(--white)`
- 4px gold gradient bar on the left edge (`::before`)
- 220px radial gold glow in the top-right corner at 6% opacity (`::after`)

Secondary:
- `background: var(--parchment-warm)` (the only difference)

---

## 5. Source files (everything that paints these pixels)

You'll want all four:

- `src/components/Dashboard.jsx` — the grid, the four tiles, in-progress logic
- `src/components/DashboardVerseCarousel.jsx` — the rotating verse band
- `src/components/DashboardPreacherQuote.jsx` — the bottom preacher quote
- `src/styles/global.css` — **lines 2407–2880** are the dashboard's CSS block (`.dash-*`, `.tile-*`, `.hdr-*`, `.preacher-stencil-*`, `.quote-*`)
- `src/styles/typography.css` — the two-voice type system

Inline styles to know about (these don't live in CSS yet — and probably should):
- `Dashboard.jsx:215–249` — Resume Work tile internal layout (gaps, max-height, scroll)
- `Dashboard.jsx:267–294` — Resume row pill styling
- `Dashboard.jsx:311–331` — Explore row pill styling

If you change the row pills, change them in both places — they share a pattern that isn't yet abstracted.

---

## 6. What the designer is free to change

**Free to change:**
- Tile sizing, hero weight (make the hero feel like the hero — bigger title, taller, full-width row, whatever reads right)
- Grid layout (2×2 isn't sacred — 1 hero + 3 stacked could work, or hero on top + 3-col below)
- Spacing, rhythm, padding inside tiles
- Border treatments, shadow weights
- Eyebrow vs no eyebrow per tile
- Whether the verse band stays at top, moves to a side, becomes a corner ribbon, etc.
- Preacher quote placement and treatment
- The Resume / Explore row pill design
- Hover/focus states

**Locked (will need explicit signoff to change):**
- Color palette (the 14 tokens above)
- Typography (Plex Serif + JetBrains Mono — no third font)
- The fact that this screen is re-entry, not stats — no charts, no coverage gauges, no badges

---

## 7. Best handoff format

Most useful, in order:

1. **An annotated screenshot or Figma frame** showing the new structure — tile sizes, spacing values, before/after
2. **A short list of CSS changes** — "make `.tile-hero` 2x wider, raise `.tile-title` to 24px on the hero, drop `grid-auto-rows: 1fr`" — I can implement directly
3. **A new design system addendum** if any new tokens are needed (hopefully none)

If your friend wants to mock it up in Figma, they can pull the fonts from
Google Fonts (IBM Plex Serif, JetBrains Mono — both free) and the colors
from §3 above.

---

## 8. To see it live

```
cd C:\Projects\SermonForge
npm install
npm start
```

Or just `npm run dev` for the browser-only Vite version (DB calls fail on
click but the visuals render exactly the same).

The dashboard is the default landing screen — no navigation needed.
