'use strict';

/**
 * no-raw-button — Surface Contract #2 ("one CTA system").
 *
 * From docs/CORE.md: "Primary actions have one shape. Secondary actions
 * have one shape. Disabled or unbuilt features do not occupy primary
 * positions."
 *
 * Flags every `<button>` JSX element outside `src/components/primitives/`.
 * Until that directory exists (deferred to audit-triage Pilot C / Phase 4),
 * this rule fires across the codebase. The noise is intentional — Surface
 * Contract #2 is not yet enforced and we want the violation count visible.
 *
 * Do NOT silence with eslint-disable; let the failure count drive Pilot C.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Surface Contract #2: primary/secondary CTAs have one canonical shape — use components/primitives instead of <button>.',
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      rawButton:
        "Surface Contract #2 violation: raw <button> elements are forbidden — primary/secondary CTAs must use the canonical primitives in src/components/primitives/. (Pilot C is deferred; failures here are the visible reminder.)",
    },
  },
  create(context) {
    const filename = (context.getFilename ? context.getFilename() : context.filename || '').replace(/\\/g, '/');
    if (filename.includes('src/components/primitives/')) return {};
    return {
      JSXOpeningElement(node) {
        if (node.name && node.name.type === 'JSXIdentifier' && node.name.name === 'button') {
          context.report({ node, messageId: 'rawButton' });
        }
      },
    };
  },
};
