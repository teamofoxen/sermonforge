import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Surface Contract #4 (docs/CORE.md):
//   "'You are here' is always answerable. Every top-level destination has a
//   canonical sidebar entry and a canonical active-state. No nameless
//   wandering."
//
// Test approach: parse the App.jsx router (the `currentView === "..."`
// switches that decide which top-level view is shown) and the Sidebar's
// NAV_ITEMS list. The set of ROUTER destinations must be a subset of the
// set of canonical destinations the user can reach from the sidebar; any
// router destination missing from the sidebar is "nameless wandering" —
// the user can land there but no canonical "you are here" will activate.
//
// `series-planner` and `workspace` are deep destinations entered from a
// different surface (clicking a series card / sermon card). They are not
// expected to have sidebar entries — the position-in-series chip and
// breadcrumbs in the workspace topbar provide their "you are here". The
// test allows them via the EXPECTED_DEEP set.

const ROOT = path.resolve(__dirname, "..", "..");

// Deep routes reached from a different surface than the sidebar:
//   • SeriesPlanner — entered by clicking a series card
//   • Workspace — entered by clicking a sermon card; topbar provides "you are here"
//
// (Pilot B.2 renamed `archive` → `CompletedSermons` and added a canonical
// sidebar entry. The vocabulary-completion pilot then migrated all view keys
// to the PascalCase canonical names defined by `VIEW` in
// `src/core/contracts.ts`.)
const EXPECTED_DEEP = new Set(["SeriesPlanner", "Workspace"]);

// Both forms — literal strings and `VIEW.<Name>` enum references — count as
// destinations. Post-vocabulary-completion the router and sidebar use enum
// references almost exclusively (`VIEW.Dashboard`); legacy literal strings
// remain matched for resilience to incomplete future migrations.
function parseRouterDestinations(): Set<string> {
  const app = fs.readFileSync(path.join(ROOT, "src", "App.jsx"), "utf8");
  const set = new Set<string>();
  for (const m of app.matchAll(/currentView === ["']([\w-]+)["']/g)) set.add(m[1]);
  for (const m of app.matchAll(/currentView === VIEW\.(\w+)/g)) set.add(m[1]);
  return set;
}

function parseSidebarDestinations(): Set<string> {
  const sidebar = fs.readFileSync(path.join(ROOT, "src", "components", "Sidebar.jsx"), "utf8");
  const set = new Set<string>();
  // `id: "<destination>"` and `id: VIEW.<Destination>` inside NAV_ITEMS entries.
  for (const m of sidebar.matchAll(/\bid:\s*["']([\w-]+)["']/g)) set.add(m[1]);
  for (const m of sidebar.matchAll(/\bid:\s*VIEW\.(\w+)/g)) set.add(m[1]);
  // Inline `handleNavigate(...)` and `onNavigate(...)` calls — both literal and enum refs.
  for (const m of sidebar.matchAll(/(?:handleNavigate|onNavigate)\(["']([\w-]+)["']\)/g)) set.add(m[1]);
  for (const m of sidebar.matchAll(/(?:handleNavigate|onNavigate)\(VIEW\.(\w+)\)/g)) set.add(m[1]);
  return set;
}

describe("Surface Contract #4: 'you are here' is always answerable", () => {
  it("every top-level router destination has a canonical sidebar entry (or is an explicit deep route)", () => {
    const router = parseRouterDestinations();
    const sidebar = parseSidebarDestinations();

    const orphans: string[] = [];
    for (const dest of router) {
      if (sidebar.has(dest)) continue;
      if (EXPECTED_DEEP.has(dest)) continue;
      orphans.push(dest);
    }

    if (orphans.length > 0) {
      throw new Error(
        `Surface Contract #4 violation: top-level destinations not registered in the Sidebar:\n${orphans
          .map((o) => `  - ${o}`)
          .join("\n")}\n\n` +
          `Add a canonical sidebar entry, or — if intentionally a deep route — list it in EXPECTED_DEEP in this test.`,
      );
    }
    expect(orphans).toEqual([]);
  });

  it("the router exposes at least the four canonical top-level destinations", () => {
    const router = parseRouterDestinations();
    expect(router.has("Dashboard")).toBe(true);
    expect(router.has("Planning")).toBe(true);
    expect(router.has("Calendar")).toBe(true);
    expect(router.has("Sermons")).toBe(true);
  });
});
