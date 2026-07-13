'use strict';

/**
 * canonical-stage-name — State Contract #5 / Surface Contract #1
 * ("one name per concept" / "one vocabulary").
 *
 * From docs/CORE.md State #5: "'Outline' is one tab and one stage and one
 * dropdown value, with one spelling, everywhere it appears. Vocabulary is
 * part of state, not a UI decoration."
 *
 * From docs/CORE.md Surface #1: "The canonical names from State Contract
 * clause 5 are the only names allowed in copy, labels, tabs, dropdowns,
 * modals, and tooltips."
 *
 * Flags string literals matching the pre-Pilot-B sermon stage / series
 * status vocabulary that should never appear in component logic.
 *
 * The post-Pilot-B canonical lifecycle is `SERMON_STATUS.InProgress`
 * (`'in_progress'`) and `SERMON_STATUS.Complete` (`'complete'`). Workspace
 * tab keys are `STAGE.{Study,Blueprint,Manuscript,Delivery}` (canonical
 * PascalCase, post-vocabulary-completion). Top-level view keys are
 * `VIEW.{Dashboard,Sermons,Calendar,CompletedSermons,Planning,
 * SeriesPlanner,Workspace}` (also PascalCase). The forbidden set below is
 * the lowercase pre-migration vocabulary.
 *
 * The rule exempts string literals nested under a `className` JSX
 * attribute — those are CSS class names (e.g., `nav-item.active`,
 * `step-pill-current`) and live in a separate namespace from
 * state/status/route vocabulary. CSS modifier `.active` is a legitimate
 * generic UI convention; flagging it would produce massive noise without
 * surfacing real drift.
 *
 * Allowed locations (full file exemptions):
 *   - electron/main.js (the v16/v17 migration deals with legacy values).
 *   - electron/persistence.cjs (the migration ladder + spine moved there in
 *     the Session-2 seam extraction, 2026-07-13 — same legacy-value need).
 *   - tests/** (fixtures may reference deprecated values).
 *   - src/core/contracts (the canonical types are defined here).
 */
// Forbidden lowercase aliases. Expanded post-vocabulary-completion to
// include `planning` (legacy series status, also the legacy view key for
// "All Series"), `active` (legacy series status), `study` (legacy
// workspace tab key), and `outline` (legacy workspace tab key — the tab is
// canonically `STAGE.Blueprint`).
const FORBIDDEN = new Set([
  'writing',
  'ready',
  'archived',
  'planning',
  'active',
  'study',
  'outline',
]);

// Walk parent chain looking for a JSXAttribute named `className`. Used to
// exempt CSS-class-context literals from the forbidden-set check.
function isInsideClassNameAttr(node) {
  let p = node.parent;
  while (p) {
    if (p.type === 'JSXAttribute') {
      const name = p.name && p.name.name;
      return name === 'className';
    }
    p = p.parent;
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'State Contract #5 / Surface Contract #1: canonical stage/status names — pre-Pilot-B aliases forbidden.',
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      deprecated:
        "State #5 / Surface #1 violation: '{{value}}' is a pre-Pilot-B stage/status alias. The canonical lifecycle is SERMON_STATUS.InProgress / SERMON_STATUS.Complete (src/core/contracts.ts).",
    },
  },
  create(context) {
    const filename = (context.getFilename ? context.getFilename() : context.filename || '').replace(/\\/g, '/');
    if (filename.endsWith('electron/main.js')) return {};
    if (filename.endsWith('electron/persistence.cjs')) return {};
    if (filename.includes('/tests/')) return {};
    if (filename.includes('src/core/contracts')) return {};

    function checkLiteral(node) {
      if (typeof node.value !== 'string') return;
      if (!FORBIDDEN.has(node.value)) return;
      // CSS-class-context exemption: `className={... ? "active" : ""}` and
      // similar literals inside the className attribute are CSS class
      // names, not state/status/route identifiers.
      if (isInsideClassNameAttr(node)) return;
      context.report({ node, messageId: 'deprecated', data: { value: node.value } });
    }
    return {
      Literal: checkLiteral,
      // Template literals with no expressions and a single quasi.
      TemplateLiteral(node) {
        if (node.expressions.length !== 0) return;
        if (node.quasis.length !== 1) return;
        const v = node.quasis[0].value && node.quasis[0].value.cooked;
        if (typeof v === 'string' && FORBIDDEN.has(v)) {
          if (isInsideClassNameAttr(node)) return;
          context.report({ node, messageId: 'deprecated', data: { value: v } });
        }
      },
    };
  },
};
