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
 * status vocabulary that should never appear in component logic. The
 * post-Pilot-B canonical lifecycle is two states: SERMON_STATUS.InProgress
 * ('in_progress') and SERMON_STATUS.Complete ('complete'). The values
 * forbidden here are the pre-collapse aliases.
 *
 * Allowed locations:
 *   - electron/main.js (the v16/v17 migration deals with legacy values).
 *   - tests/** (fixtures may reference deprecated values).
 *   - src/core/contracts (the canonical types are defined here).
 */
// Pre-Pilot-B aliases that are exclusively stage/status vocabulary. The
// names 'planning', 'study', 'outline', and 'active' also have legitimate
// non-status uses (URL-safe view keys, tab keys, column names, CSS class
// names); flagging those as Surface/State drift would produce false
// positives. Audit-triage Pilot B.2/E will revisit 'study' and 'outline'
// once workspace tab keys migrate to canonical PascalCase.
const FORBIDDEN = new Set([
  'writing',
  'ready',
  'archived',
]);

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
    if (filename.includes('/tests/')) return {};
    if (filename.includes('src/core/contracts')) return {};

    function checkLiteral(node) {
      if (typeof node.value !== 'string') return;
      if (!FORBIDDEN.has(node.value)) return;
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
          context.report({ node, messageId: 'deprecated', data: { value: v } });
        }
      },
    };
  },
};
