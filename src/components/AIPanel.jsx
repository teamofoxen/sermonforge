import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { autoResize } from "../utils";
import { sendAIMessage } from "../utils/ai";
import { buildContext } from "../utils/contextBuilder";
import { captureResponsePatterns } from "../utils/memory";
import { buildSystemPrompt, appendTaskDirective } from "../prompts/sermon";
import { formatChunkForLLM, dedupSources } from "../utils/theologyCitation";
import { getReviewPrompt, buildCoherenceCheckPrompt } from "../utils/reviewPrompts";
import { getStepFieldConfig, getCurrentFieldData, buildIncorporatePrompt } from "../utils/incorporateHelpers";
import {
  getTheologyStatus,
  searchTheologyLibrary,
} from "../db/database";
import {
  serializeStructuredField,
} from "../utils/studyFields";

// Keep the last N turns (user+assistant pairs) of conversation history when sending
// each new message. Avoids re-sending an ever-growing transcript that inflates token
// cost and latency while still giving the model enough recent context to stay coherent.
const MAX_HISTORY_TURNS = 6;

function trimHistory(messages, maxTurns = MAX_HISTORY_TURNS) {
  return messages.slice(-maxTurns * 2);
}

export default function AIPanel({ sermon, activeTab, activeStep, externalMessage, onLoadingChange, loading, onUpdate }) {
  const [messages, setMessages] = useState([]);
  const [theologyAvailable, setTheologyAvailable] = useState(false);
  const [theologyEnabled, setTheologyEnabled] = useState(false);
  const [inputText, setInputText] = useState("");
  const [incorporateLoading, setIncorporateLoading] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const messagesEndRef = useRef(null);
  const latestAssistantRef = useRef(null);
  const prevCountRef = useRef(0);
  // messagesRef keeps sendMessage closures from going stale when called from the
  // externalMessage effect — always reflects the current conversation history.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = messages.length;

    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];

    // New assistant message arrived — scroll its top into view so the pastor
    // reads from the beginning instead of landing at the bottom.
    if (messages.length > prevCount && lastMsg.role === "assistant") {
      // Use requestAnimationFrame so the DOM has rendered the new message.
      requestAnimationFrame(() => {
        if (latestAssistantRef.current) {
          latestAssistantRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      return;
    }

    // For user messages and loading indicator, scroll to the bottom as before.
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  useEffect(() => {
    getTheologyStatus()
      .then(s => setTheologyAvailable(s.available || false))
      .catch((e) => console.error("[AIPanel] getTheologyStatus failed:", e));
  }, []);

  // When SermonWorkspace sets a new pendingMessage, send it into the conversation.
  useEffect(() => {
    if (externalMessage) {
      sendMessage(externalMessage.prompt, externalMessage.systemPrompt, externalMessage.step, sermon?.id);
    }
  }, [externalMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async (userText, systemPrompt, step, sermonId, meta = {}) => {
    if (!userText?.trim()) return;
    const userMsg = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    onLoadingChange?.(true);
    try {
      const history = trimHistory([...messagesRef.current, userMsg]).map((m) => ({ role: m.role, content: m.content }));
      // Always build the full adaptive system prompt as the base. When an external
      // systemPrompt is provided (chip, review, coherence check), append it as a
      // TASK directive so adaptive hints are never bypassed. The base is an array of
      // content blocks with cache_control on the static portion.
      const base = buildSystemPrompt(step, sermonId);
      const finalSystemPrompt = appendTaskDirective(base, systemPrompt);
      const response = await sendAIMessage(history, finalSystemPrompt, step, sermonId);
      setMessages((prev) => [...prev, { role: "assistant", content: response || "Something went wrong. Please try again.", ...meta }]);
      if (response) captureResponsePatterns(response, step);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "API call failed"}` },
      ]);
    } finally {
      onLoadingChange?.(false);
    }
  }, [onLoadingChange]);

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendInput();
    }
  }

  async function handleSendInput() {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText("");

    const step = activeStep || activeTab;

    if (theologyEnabled && theologyAvailable) {
      onLoadingChange?.(true);
      try {
        const hits = await searchTheologyLibrary(text, 8);
        const theologyChunks = hits?.map(formatChunkForLLM) || [];

        let userContent;
        let systemPrompt;

        if (theologyChunks.length > 0) {
          // When sources are found, bypass all sermon workflow context. The full
          // system prompt's MESSAGE CONTEXT RULES are designed for sermon prep
          // stages and actively conflict with free-form theology research —
          // they cause refusals when MPT/MPS are absent and bury the source
          // chunks under unrelated context tiers.
          // Instead: a stripped-down research prompt + sources-only message.
          const sourcesBlock = theologyChunks.join("\n\n");
          const passageLine = sermon?.passage ? `\nPASSAGE: ${sermon.passage}\n` : "";
          userContent = `SOURCES:\n${sourcesBlock}${passageLine}\nQUESTION:\n${text}`;
          systemPrompt = `You are a theology research assistant for a pastor. Answer the question using the sources provided.

- Ground your answer in the provided sources.
- Include at least one direct quotation with its full source attribution as given in brackets (format: [Author — Work, Locator, p. N]). Preserve the locator and page reference verbatim.
- If multiple sources speak to the question, reference more than one.
- Be concise and direct.
- If the sources do not directly address the question, say so clearly rather than substituting general knowledge.`;
        } else {
          // No hits — fall back to standard context-based path.
          const context = buildContext({ sermon, step });
          userContent = context
            ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n${text}`
            : text;
          systemPrompt = buildSystemPrompt(step, sermon?.id);
        }

        const userMsg = { role: "user", content: userContent };
        setMessages(prev => [...prev, userMsg]);
        const history = trimHistory([...messagesRef.current, userMsg]).map(m => ({ role: m.role, content: m.content }));
        const response = await sendAIMessage(history, systemPrompt, step, sermon?.id);
        // Deduplicate sources by author+work for the attribution display
        const sources = hits?.length ? dedupSources(hits) : [];
        setMessages(prev => [...prev, { role: "assistant", content: response || "Something went wrong. Please try again.", sources }]);
        if (response) captureResponsePatterns(response, step);
      } catch (err) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
      } finally {
        onLoadingChange?.(false);
      }
    } else {
      const context = buildContext({ sermon, step });
      // Pass null as systemPrompt — sendMessage will build the full adaptive base from step
      // alone. Passing a pre-built prompt here would cause it to be appended as a TASK
      // directive, doubling the system prompt (H-1 fix).
      const content = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n${text}`
        : text;
      sendMessage(content, null, step, sermon?.id);
    }
  }

  function clearHistory() { setMessages([]); }

  function handleSeriesCoherenceCheck() {
    const check = buildCoherenceCheckPrompt(sermon);
    if (!check) return;
    sendMessage(check.prompt, check.system, activeStep || activeTab, sermon?.id);
  }

  async function handleIncorporate(reviewContent, reviewStep) {
    const config = getStepFieldConfig(reviewStep);
    if (!config || !onUpdate) return;

    setIncorporateLoading(true);
    try {
      const current = getCurrentFieldData(config, sermon);
      const prompt = buildIncorporatePrompt(config, current, reviewContent);
      const systemPrompt = `You are revising sermon preparation content based on AI review feedback. Return only a raw JSON object — no markdown fences, no commentary. Include every original key in your response, even unchanged ones. Preserve the pastor's voice. Apply only changes directly supported by the review feedback.`;
      const response = await sendAIMessage([{ role: "user", content: prompt }], systemPrompt, reviewStep, sermon?.id);

      // Strip any markdown code fences the model may have added
      const cleaned = response?.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      let proposed;
      try { proposed = JSON.parse(cleaned); } catch { proposed = null; }

      if (!proposed || typeof proposed !== "object") {
        setMessages(prev => [...prev, { role: "assistant", content: "Couldn't parse the revised content. Try again or paste the feedback manually." }]);
        return;
      }
      setDiffData({ config, current, proposed });
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Incorporate error: ${err.message}` }]);
    } finally {
      setIncorporateLoading(false);
    }
  }

  function handleAcceptDiff() {
    if (!diffData || !onUpdate) return;
    const { config, proposed } = diffData;
    if (config.type === "mpt_mps") {
      onUpdate({ mpt: proposed.mpt ?? sermon?.mpt ?? "", mps: proposed.mps ?? sermon?.mps ?? "" });
    } else {
      onUpdate({ [config.column]: serializeStructuredField(proposed) });
    }
    setDiffData(null);
  }

  const tabLabels = { study: "Study", outline: "Outline", manuscript: "Manuscript", delivery: "Delivery" };

  return (
    <aside className="ai-panel" data-tour-id="ai-panel">
      <div className="ai-panel-header" data-tour-id="ai-panel-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="ai-panel-title">AI Assistant</div>
            <div className="ai-panel-subtitle">{tabLabels[activeTab] || "Workspace"}</div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {messages.length > 0 && (
              <button className="ai-clear-btn" onClick={clearHistory}>Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="ai-panel-messages">
        {messages.length === 0 && !loading && (
          <div className="ai-message empty-state">
            Ask anything about your passage, or use the quick actions below.
          </div>
        )}
        {messages.map((msg, i) => {
          // Attach ref to the last assistant message so we can scroll its top into view.
          const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
          return (
            <div
              key={i}
              ref={isLastAssistant ? latestAssistantRef : undefined}
              className={`ai-message ${msg.role}`}
              style={{ whiteSpace: msg.role === "assistant" ? undefined : "pre-wrap", position: "relative" }}
            >
              {msg.role === "assistant"
                ? <div className="ai-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                : msg.content}
              {msg.role === "assistant" && msg.sources?.length > 0 && (
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--parchment-deep)", fontSize: "11px", color: "var(--ink-ghost)" }}>
                  <span style={{ fontWeight: 600 }}>Sources consulted: </span>
                  {msg.sources.map((s, si) => (
                    <span key={si}>
                      {si > 0 ? " · " : ""}
                      {s.author} — <em>{s.work}</em>
                      {s.locator ? `, ${s.locator}` : ""}
                      {s.ccel_page_start
                        ? (s.ccel_page_end && s.ccel_page_end !== s.ccel_page_start
                            ? `, pp. ${s.ccel_page_start}–${s.ccel_page_end}`
                            : `, p. ${s.ccel_page_start}`)
                        : ""}
                    </span>
                  ))}
                </div>
              )}
              {msg.role === "assistant" && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <CopyButton text={msg.content} />
                  {msg.isReview && onUpdate && (
                    <IncorporateButton
                      disabled={incorporateLoading || loading}
                      onClick={() => handleIncorporate(msg.content, msg.reviewStep)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="ai-loading">
            <div className="ai-loading-dot" />
            <div className="ai-loading-dot" />
            <div className="ai-loading-dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-panel-footer">
        {/* Review My Work */}
        <button
          className="btn-primary"
          style={{ width: "100%", marginBottom: "10px" }}
          onClick={() => {
            const { prompt, system } = getReviewPrompt(activeTab, sermon, activeStep);
            const step = activeStep || activeTab;
            const reviewMeta = getStepFieldConfig(step) ? { isReview: true, reviewStep: step } : {};
            sendMessage(prompt, system, step, sermon?.id, reviewMeta);
          }}
          disabled={loading}
        >
          Review My Work
        </button>

        {/* Series Coherence Check — only shown when series big idea exists */}
        {sermon?.series?.big_idea && (
          <button
            className="btn-ghost"
            style={{ width: "100%", marginBottom: "10px" }}
            onClick={handleSeriesCoherenceCheck}
            disabled={loading}
          >
            Check Series Alignment
          </button>
        )}

        {/* Theology library toggle */}
        {theologyAvailable && (
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--ink-soft)", marginBottom: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={theologyEnabled}
              onChange={e => setTheologyEnabled(e.target.checked)}
            />
            Search Theology Library
          </label>
        )}

        {/* Free-form chat input */}
        <div className="ai-input-row">
          <textarea
            className="ai-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={loading}
          />
          <button
            className="ai-send-btn"
            onClick={handleSendInput}
            disabled={loading || !inputText.trim()}
            title="Send"
          >
            →
          </button>
        </div>
      </div>

      {incorporateLoading && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: "var(--radius)", fontSize: "13px", color: "var(--ink-soft)" }}>
          Generating revision…
        </div>
      )}

      {diffData && (
        <DiffModal
          config={diffData.config}
          current={diffData.current}
          proposed={diffData.proposed}
          onAccept={handleAcceptDiff}
          onDiscard={() => setDiffData(null)}
        />
      )}
    </aside>
  );
}

// ── Copy Button ────────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="ai-copy-btn"
      title="Copy response"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ── Incorporate → helpers ──────────────────────────────────────────────────────

function IncorporateButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="ai-copy-btn"
      title="Incorporate this feedback into the field"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      Incorporate →
    </button>
  );
}

function DiffModal({ config, current, proposed, onAccept, onDiscard }) {
  const changed = config.fieldDefs.filter(f => {
    const oldVal = (current[f.key] || "").trim();
    const newVal = (proposed[f.key] || "").trim();
    return oldVal !== newVal;
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div style={{
        background: "var(--white)", borderRadius: "var(--radius)", width: "min(680px, 100%)",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--parchment-deep)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>Proposed revisions — {config.label}</span>
          <button onClick={onDiscard} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--ink-ghost)" }}>✕</button>
        </div>

        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
          {changed.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: "13px" }}>No changes proposed — the AI found nothing to revise.</p>
          ) : (
            changed.map(f => (
              <div key={f.key} style={{ marginBottom: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: "12px", color: "var(--ink-soft)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--ink-ghost)", marginBottom: "3px" }}>BEFORE</div>
                    <div style={{ background: "var(--parchment)", borderRadius: "4px", padding: "8px 10px", fontSize: "13px", color: "var(--ink-soft)", whiteSpace: "pre-wrap", minHeight: "40px" }}>
                      {current[f.key] || <em style={{ opacity: 0.5 }}>empty</em>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--ink-ghost)", marginBottom: "3px" }}>AFTER</div>
                    <div style={{ background: "#f0faf0", border: "1px solid #b6ddb6", borderRadius: "4px", padding: "8px 10px", fontSize: "13px", color: "var(--ink)", whiteSpace: "pre-wrap", minHeight: "40px" }}>
                      {proposed[f.key] || <em style={{ opacity: 0.5 }}>empty</em>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--parchment-deep)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button className="btn-ghost" onClick={onDiscard}>Discard</button>
          {changed.length > 0 && (
            <button className="btn-primary" onClick={onAccept}>Accept All</button>
          )}
        </div>
      </div>
    </div>
  );
}
