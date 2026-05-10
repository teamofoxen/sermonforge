'use strict';

/**
 * no-direct-ai — AI Integrity Gate (originally ACCI Item D2; rewritten in
 * ARI Phase 8, 2026-05-09).
 *
 * SermonForge contains no AI surfaces. This rule is the lint-layer tripwire
 * for that invariant: any import of @anthropic-ai/sdk or any reintroduction
 * of window.electronAPI.sendAIMessage is rejected at editor/CI time.
 *
 * No exceptions. Pre-ARI, the rule allowed `electron/ai/provider.js` (SDK)
 * and `src/utils/ai.js` (sendAIMessage); both files are now deleted, and the
 * rule's allowlist was removed alongside them. If a future change needs AI
 * back, the contract layer (Process #5 in docs/CORE.md) is the place to
 * reopen the question — not the lint config.
 */

const RE_ANTHROPIC_SDK = /^@anthropic-ai\/sdk$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'AI Integrity Gate: SermonForge contains no AI. @anthropic-ai/sdk imports and window.electronAPI.sendAIMessage calls are forbidden.',
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      sdkBypass:
        "AI Integrity violation: '@anthropic-ai/sdk' may not be imported. SermonForge contains no AI (ARI, 2026-05-09).",
      ipcBypass:
        "AI Integrity violation: 'window.electronAPI.sendAIMessage' may not be called. The IPC channel was removed in ARI Phase 8.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const src = node.source && node.source.value;
        if (typeof src === 'string' && RE_ANTHROPIC_SDK.test(src)) {
          context.report({ node, messageId: 'sdkBypass' });
        }
      },
      CallExpression(node) {
        if (node.callee.name === 'require') {
          const arg = node.arguments[0];
          if (arg && arg.type === 'Literal' && typeof arg.value === 'string' && RE_ANTHROPIC_SDK.test(arg.value)) {
            context.report({ node, messageId: 'sdkBypass' });
          }
          return;
        }

        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.name === 'sendAIMessage' &&
          callee.object.type === 'MemberExpression' &&
          !callee.object.computed &&
          callee.object.property.name === 'electronAPI' &&
          callee.object.object.name === 'window'
        ) {
          context.report({ node, messageId: 'ipcBypass' });
        }
      },
    };
  },
};
