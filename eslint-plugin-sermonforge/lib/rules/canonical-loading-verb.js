'use strict';

/**
 * canonical-loading-verb — Surface Contract #3 ("one loading vocabulary").
 *
 * From docs/CORE.md: "A small canonical set of loading verbs ('Loading…',
 * 'Saving…', 'Thinking…') covers everything. Empty states share a layout
 * and tone."
 *
 * Flags string literals that look like loading copy (end with an ellipsis
 * character — either Unicode U+2026 '…' or three ASCII dots '...') unless
 * they are one of the three canonical verbs. The intent is to surface
 * "Creating…", "Drafting…", "Synthesizing…", "Reviewing…" etc. as
 * Surface #3 violations until Pilot D migrates them.
 *
 * This rule is intentionally noisy until Pilot D lands. Do NOT silence
 * with eslint-disable; the failure count is the deferred-Phase work's
 * visible reminder.
 */
const CANONICAL = new Set(['Loading…', 'Saving…', 'Thinking…']);
const RE_LOADING = /^[A-Z][\w/ ]{1,30}(?:\.\.\.|…)$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: "Surface Contract #3: loading verbs must be 'Loading…' / 'Saving…' / 'Thinking…' (the LoadingVerb union in src/core/contracts.ts).",
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      nonCanonical:
        "Surface Contract #3 violation: loading verb '{{value}}' is not one of the canonical 'Loading…' / 'Saving…' / 'Thinking…'. Use the LoadingVerb constants from src/core/contracts.ts. (Pilot D is deferred; failures here are the visible reminder.)",
    },
  },
  create(context) {
    const filename = (context.getFilename ? context.getFilename() : context.filename || '').replace(/\\/g, '/');
    // The contracts module owns the canonical set; tests are allowed to
    // reference deprecated verbs in fixtures.
    if (filename.includes('src/core/contracts')) return {};
    if (filename.includes('/tests/')) return {};
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const v = node.value.trim();
        if (!RE_LOADING.test(v)) return;
        if (CANONICAL.has(v)) return;
        context.report({ node, messageId: 'nonCanonical', data: { value: v } });
      },
    };
  },
};
