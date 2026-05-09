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
 * @param {string} [sermonId]  — active sermon id; written to the audit log AND
 *                               keys the abort registry (renderer-side only —
 *                               the IPC handler in main process still completes;
 *                               we just discard the response). Calls without a
 *                               sermonId are not abortable in the current pass.
 * @param {string} [surface]   — BTI surface slug ("ai-panel" | "study-tab" |
 *                               "outline-tab" | "delivery-tab" | "series-planner").
 *                               Drives the per-surface lastAiCall registry the
 *                               FeedbackFlag reads, and the ai-press telemetry event.
 * @returns {Promise<
 *   { ok: true, text: string }
 *   | { ok: false, kind: "auth"|"rate_limit"|"network"|"server"|"timeout"|"format"|"empty"|"unknown"|"aborted", message: string }
 * >}
 *
 * The eight failure kinds match the A4 taxonomy. "aborted" is an internal-only
 * 9th kind set when the active sermon switches mid-flight; UI sites should
 * generally skip rendering anything for it (it represents user intent, not
 * failure).
 */

import { setLastAiCall } from "./lastAiCallRegistry";

// In-flight registry. Map<sermonId, Set<AbortController>>. SermonWorkspace
// calls abortInFlightForSermon(prevSermonId) when the active sermon changes
// so a stale response cannot land on the new sermon.
const inFlight = new Map();

export function abortInFlightForSermon(sermonId) {
  if (sermonId == null) return;
  const set = inFlight.get(sermonId);
  if (!set) return;
  for (const ctrl of set) ctrl.abort();
  inFlight.delete(sermonId);
}

export async function sendAIMessage(messages, systemPrompt, step, sermonId, surface) {
  // Input validation
  if (!Array.isArray(messages)) {
    console.error('[AI] sendAIMessage: messages must be an array', { messages });
    return { ok: false, kind: 'unknown', message: 'Internal error: messages was not an array.' };
  }
  if (typeof systemPrompt !== 'string' && !Array.isArray(systemPrompt)) {
    console.error('[AI] sendAIMessage: systemPrompt must be a string or content-block array', { systemPrompt });
    return { ok: false, kind: 'unknown', message: 'Internal error: systemPrompt had the wrong type.' };
  }

  const isDev = import.meta.env.DEV;
  const start = isDev ? performance.now() : null;
  if (isDev) console.log('[AI] request start', { messageCount: messages.length });

  let controller = null;
  if (sermonId != null) {
    controller = new AbortController();
    let set = inFlight.get(sermonId);
    if (!set) {
      set = new Set();
      inFlight.set(sermonId, set);
    }
    set.add(controller);
  }

  try {
    const ipcPromise = window.electronAPI.sendAIMessage(messages, systemPrompt, step, sermonId);

    const response = controller
      ? await Promise.race([
          ipcPromise,
          new Promise((_, reject) => {
            const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
            if (controller.signal.aborted) onAbort();
            else controller.signal.addEventListener('abort', onAbort, { once: true });
          }),
        ])
      : await ipcPromise;

    if (isDev) {
      const ms = Math.round(performance.now() - start);
      console.log(`[AI] request complete (${ms}ms)`);
    }

    if (response == null) {
      console.error('[AI] sendAIMessage: received null/undefined response from IPC');
      return { ok: false, kind: 'unknown', message: 'AI request returned no response.' };
    }

    // The IPC handler resolves with an envelope. Defensive: if a legacy/test
    // stub returns a bare string, wrap it so callers get a uniform shape.
    if (typeof response === 'string') {
      recordAiPress(surface, step, sermonId, messages, response);
      return { ok: true, text: response };
    }
    if (response && response.ok && typeof response.text === 'string') {
      recordAiPress(surface, step, sermonId, messages, response.text);
    }
    return response;
  } catch (err) {
    if (err?.name === 'AbortError') {
      if (isDev) console.log('[AI] request aborted (sermon switch)');
      return { ok: false, kind: 'aborted', message: '' };
    }
    const context = { messageCount: messages.length, firstRole: messages[0]?.role };
    console.error('[AI] sendAIMessage: IPC call failed', context, err);
    return { ok: false, kind: 'unknown', message: `AI request failed: ${err?.message || 'unknown error'}` };
  } finally {
    if (controller) {
      const set = inFlight.get(sermonId);
      if (set) {
        set.delete(controller);
        if (set.size === 0) inFlight.delete(sermonId);
      }
    }
  }
}

// Capture lastAiCall for the surface (for the FeedbackFlag) and emit an
// ai-press telemetry event. Both are best-effort — never throw.
function recordAiPress(surface, step, sermonId, messages, output) {
  if (!surface) return;
  try {
    const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
    const input = typeof lastUser?.content === 'string' ? lastUser.content : '';
    setLastAiCall(surface, { input, output: typeof output === 'string' ? output : '' });
  } catch (_) {}
  try {
    window.electronAPI?.telemetryEmit?.('ai-press', { surface, step: step ?? null, sermonId: sermonId ?? null });
  } catch (_) {}
}
