'use strict';

/**
 * no-direct-ai — AI Integrity Gate (originally ACCI Item D2; rewritten in
 * ARI Phase 8, 2026-05-09).
 *
 * SermonForge contains no AI surfaces. This rule is the lint-layer tripwire
 * for that invariant. It rejects, at editor/CI time:
 *   - any import/require of an @anthropic-ai/* SDK (sdk, bedrock-sdk, …),
 *   - any `.sendAIMessage(...)` call (the method lived only on the removed AI
 *     bridge, so any reappearance is a reintroduction),
 *   - any attempt to re-open the removed "ai-message" IPC channel via
 *     ipcRenderer.invoke / ipcMain.handle.
 *
 * No exceptions. Pre-ARI, the rule allowed `electron/ai/provider.js` (SDK)
 * and `src/utils/ai.js` (sendAIMessage); both files are now deleted, and the
 * rule's allowlist was removed alongside them. If a future change needs AI
 * back, the contract layer (Process #5 in docs/CORE.md) is the place to
 * reopen the question — not the lint config.
 *
 * (Broadened in the Series Planner revival audit remediation, 2026-06-21 —
 * the prior rule matched only `@anthropic-ai/sdk` exactly and
 * `window.electronAPI.sendAIMessage`, so a subpath SDK, an aliased bridge, or
 * a hand-rolled channel slipped through.)
 */

// Any @anthropic-ai/* SDK, not just the bare `@anthropic-ai/sdk`.
const RE_ANTHROPIC_SDK = /^@anthropic-ai\//;
// The removed AI IPC channel name (ARI Phase 8).
const AI_CHANNEL = 'ai-message';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'AI Integrity Gate: SermonForge contains no AI. @anthropic-ai/* imports, sendAIMessage calls, and the "ai-message" IPC channel are forbidden.',
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      sdkBypass:
        "AI Integrity violation: '@anthropic-ai/*' may not be imported. SermonForge contains no AI (ARI, 2026-05-09).",
      ipcBypass:
        "AI Integrity violation: 'sendAIMessage' may not be called. The IPC channel was removed in ARI Phase 8.",
      channelBypass:
        "AI Integrity violation: the 'ai-message' IPC channel may not be re-opened (ipcRenderer.invoke / ipcMain.handle). It was removed in ARI Phase 8.",
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
        if (callee.type !== 'MemberExpression' || callee.computed) return;

        // Any `.sendAIMessage(...)` call, on any object.
        if (callee.property.name === 'sendAIMessage') {
          context.report({ node, messageId: 'ipcBypass' });
          return;
        }

        // ipcRenderer.invoke("ai-message", …) / ipcMain.handle("ai-message", …).
        if (
          (callee.property.name === 'invoke' || callee.property.name === 'handle') &&
          node.arguments[0] &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === AI_CHANNEL
        ) {
          context.report({ node, messageId: 'channelBypass' });
        }
      },
    };
  },
};
