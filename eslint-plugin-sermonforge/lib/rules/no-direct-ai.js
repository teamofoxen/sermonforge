'use strict';

/**
 * no-direct-ai — AI Integrity Gate (ACCI Item D2).
 *
 * Two gates:
 *
 * Gate 1 — Anthropic SDK import.
 * `electron/ai/provider.js` is the sole allowed importer of @anthropic-ai/sdk.
 * Any other file importing it bypasses the provider abstraction and would
 * construct its own Anthropic client outside the IPC boundary.
 *
 * Gate 2 — Direct IPC sendAIMessage call.
 * `src/utils/ai.js` is the sole allowed caller of window.electronAPI.sendAIMessage.
 * Any component accessing it directly bypasses the layered system-prompt,
 * context-pipeline, audit-log tagging, and abort-controller added in Tier A–C.
 */

const RE_ANTHROPIC_SDK = /^@anthropic-ai\/sdk$/;
const RE_PROVIDER_PATH = /(?:^|\/)electron\/ai\/provider(?:\.js)?$/;
const RE_AI_UTIL_PATH  = /(?:^|\/)src\/utils\/ai(?:\.js)?$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'AI Integrity Gate: Anthropic SDK must only be imported in electron/ai/provider.js; window.electronAPI.sendAIMessage must only be called from src/utils/ai.js.',
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      sdkBypass:
        "AI Integrity violation: '@anthropic-ai/sdk' may only be imported in 'electron/ai/provider.js'.",
      ipcBypass:
        "AI Integrity violation: 'window.electronAPI.sendAIMessage' may only be called from 'src/utils/ai.js'. Import 'sendAIMessage' from that module instead.",
    },
  },
  create(context) {
    const filename = (context.getFilename ? context.getFilename() : context.filename || '').replace(/\\/g, '/');
    const isProvider = RE_PROVIDER_PATH.test(filename);
    const isAiUtil   = RE_AI_UTIL_PATH.test(filename);

    return {
      // Gate 1: Anthropic SDK import (ES modules)
      ImportDeclaration(node) {
        if (isProvider) return;
        const src = node.source && node.source.value;
        if (typeof src === 'string' && RE_ANTHROPIC_SDK.test(src)) {
          context.report({ node, messageId: 'sdkBypass' });
        }
      },

      // Gate 1 (CJS): provider.js uses require(), not import — needs a separate visitor from ImportDeclaration.
      CallExpression(node) {
        if (!isProvider && node.callee.name === 'require') {
          const arg = node.arguments[0];
          if (arg && arg.type === 'Literal' && typeof arg.value === 'string' && RE_ANTHROPIC_SDK.test(arg.value)) {
            context.report({ node, messageId: 'sdkBypass' });
          }
        }

        // Gate 2: window.electronAPI.sendAIMessage(...)
        if (!isAiUtil) {
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
        }
      },
    };
  },
};
