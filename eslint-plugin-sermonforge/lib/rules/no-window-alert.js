'use strict';

/**
 * no-window-alert — Mutation Contract #5 ("errors speak in one voice").
 *
 * From docs/CORE.md: "A persistent retryable failure is a banner. A
 * field-level failure is inline. The system never uses a raw browser alert.
 * There is one error vocabulary across the app."
 *
 * Flags `window.alert()`, bare `alert()`, `window.confirm()`, and
 * `confirm()` calls anywhere in the renderer. The canonical replacements
 * are `InlineError` (field-level) and the persistent banner pattern in
 * App.jsx for retryable failures.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Mutation Contract #5: never use raw browser alert/confirm — use InlineError or the persistent banner pattern.',
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      browserDialog:
        "Mutation Contract #5 violation: raw browser '{{name}}()' is forbidden — use InlineError for field-level errors and the persistent banner for retryable failures.",
    },
  },
  create(context) {
    function check(node, name) {
      context.report({ node, messageId: 'browserDialog', data: { name } });
    }
    return {
      CallExpression(node) {
        const c = node.callee;
        // bare alert(...) / confirm(...)
        if (c.type === 'Identifier' && (c.name === 'alert' || c.name === 'confirm')) {
          return check(node, c.name);
        }
        // window.alert(...) / window.confirm(...)
        if (
          c.type === 'MemberExpression' &&
          !c.computed &&
          c.object && c.object.type === 'Identifier' && c.object.name === 'window' &&
          c.property && c.property.type === 'Identifier' &&
          (c.property.name === 'alert' || c.property.name === 'confirm')
        ) {
          return check(node, `window.${c.property.name}`);
        }
      },
    };
  },
};
