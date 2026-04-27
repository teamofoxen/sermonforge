/**
 * Central wrapper for all Claude API calls in the renderer.
 *
 * Components must import sendAIMessage from here — never call
 * window.electronAPI.sendAIMessage directly. This keeps the
 * IPC surface name in one place and makes the call pattern
 * easy to audit or intercept in future.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} systemPrompt
 * @param {string} [step]      — active step/tab identifier; written to the audit log
 * @param {string} [sermonId]  — active sermon id; written to the audit log
 * @returns {Promise<string>} Claude's response text, or empty string on error
 */
export async function sendAIMessage(messages, systemPrompt, step, sermonId) {
  // Input validation
  if (!Array.isArray(messages)) {
    console.error('[AI] sendAIMessage: messages must be an array', { messages });
    return '';
  }
  if (typeof systemPrompt !== 'string' && !Array.isArray(systemPrompt)) {
    console.error('[AI] sendAIMessage: systemPrompt must be a string or content-block array', { systemPrompt });
    return '';
  }

  const isDev = import.meta.env.DEV;
  const start = isDev ? performance.now() : null;
  if (isDev) console.log('[AI] request start', { messageCount: messages.length });

  try {
    const response = await window.electronAPI.sendAIMessage(messages, systemPrompt, step, sermonId);

    if (isDev) {
      const ms = Math.round(performance.now() - start);
      console.log(`[AI] request complete (${ms}ms)`);
    }

    if (response == null) {
      console.error('[AI] sendAIMessage: received null/undefined response from IPC');
      return '';
    }

    return response;
  } catch (err) {
    const context = { messageCount: messages.length, firstRole: messages[0]?.role };
    console.error('[AI] sendAIMessage: IPC call failed', context, err);
    return '';
  }
}
