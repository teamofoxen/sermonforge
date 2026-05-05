import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { autoResize } from "../utils";
import { sendAIMessage } from "../utils/ai";
import { buildContext, describeContext, readPastoralContext } from "../utils/contextBuilder";
import { captureResponsePatterns } from "../utils/memory";
import { buildSystemPrompt, appendTaskDirective, getActiveRole, THEOLOGY_RESEARCH_PROMPT, INCORPORATE_REVISION_PROMPT } from "../prompts/sermon";
import { formatChunkForLLM, dedupSources } from "../utils/theologyCitation";
import { getReviewPrompt, buildCoherenceCheckPrompt } from "../utils/reviewPrompts";
import { getStepFieldConfig, getCurrentFieldData, buildIncorporatePrompt } from "../utils/incorporateHelpers";
import {
  getTheologyStatus,
  searchTheologyLibrary,
} from "../db/database";
import {
  serializeStructuredField,
  getPrimaryAnswer,
  applyFieldValueMap,
} from "../utils/studyFields";
import {
  parseAIJson,
  validateIncorporateMptMps,
  validateIncorporateStructuredField,
} from "../utils/aiSchema";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

// Keep the last N turns (user+assistant pairs) of conversation history when sending
// each new message. Avoids re-sending an ever-growing transcript that inflates token
// cost and latency while still giving the model enough recent context to stay coherent.
const MAX_HISTORY_TURNS = 6;

// Per-column human labels for the persistColumn-confirm flow.
const PERSIST_SAVE_LABELS = {
  last_tune_up: "Save as Last Tune-Up",
};
const PERSIST_SAVED_LABELS = {
  last_tune_up: "Saved as Last Tune-Up",
};

function trimHistory(messages, maxTurns = MAX_HISTORY_TURNS) {
  return messages.slice(-maxTurns * 2);
}

export default function AIPanel({ sermon, activeTab, activeStep, externalMessage, onLoadingChange, loading, onUpdate }) {
  const [messages, setMessages] = useState([]);
  const [theologyAvailable, setTheologyAvailable] = useState(false);
  const [theologySemantic, setTheologySemantic] = useState(false);
  const [theologyEnabled, setTheologyEnabled] = useState(false);
  const [inputText, setInputText] = useState("");
  const [incorporateLoading, setIncorporateLoading] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [persistFlash, setPersistFlash] = useState(null);
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
      .then(s => {
        setTheologyAvailable(s?.available || false);
        // semantic=true when theology_vec has embeddings AND the embedder loaded.
        // When false, hybrid search degrades to FTS-only; the toggle label below
        // surfaces this so the pastor isn't told they're getting semantic results
        // when they're really getting keyword-only results.
        setTheologySemantic(s?.semantic || false);
      })
      .catch((e) => console.error("[AIPanel] getTheologyStatus failed:", e));
  }, []);

  // When SermonWorkspace sets a new pendingMessage, send it into the conversation.
  // If the payload carries `persistColumn`, attach it to the assistant message
  // *after* a successful response so the pastor can confirm before write.
  // Mutation Contract #2: AI never overwrites a persisted column without an
  // explicit click. Aborts (sermon switch via A1) and silent failures return
  // "" — we deliberately do NOT attach persistColumn in that case so a phantom
  // save button can't appear on a placeholder message.
  useEffect(() => {
    if (!externalMessage) return;
    (async () => {
      const response = await sendMessage(
        externalMessage.prompt,
        externalMessage.systemPrompt,
        externalMessage.step,
        sermon?.id,
      );
      if (response && externalMessage.persistColumn) {
        const persistColumn = externalMessage.persistColumn;
        setMessages(prev => {
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === "assistant") {
              return prev.map((m, idx) => idx === i ? { ...m, persistColumn } : m);
            }
          }
          return prev;
        });
      }
    })();
  }, [externalMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSavePersist(index) {
    const msg = messages[index];
    if (!msg?.persistColumn || !msg?.content || !onUpdate) return;
    onUpdate({
      [msg.persistColumn]: JSON.stringify({
        content: msg.content,
        ts: new Date().toISOString(),
      }),
    });
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, persisted: true } : m));
    setPersistFlash({ column: msg.persistColumn });
  }

  // Auto-clear the persist-write flash banner after a short window so it
  // reads as a transient acknowledgement rather than persistent chrome.
  useEffect(() => {
    if (!persistFlash) return;
    const t = setTimeout(() => setPersistFlash(null), 4000);
    return () => clearTimeout(t);
  }, [persistFlash]);

  function handleDiscardPersist(index) {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, persisted: true } : m));
  }

  const sendMessage = useCallback(async (userText, systemPrompt, step, sermonId, meta = {}) => {
    if (!userText?.trim()) return "";
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
      const result = await sendAIMessage(history, finalSystemPrompt, step, sermonId);
      if (!result.ok) {
        if (result.kind === "aborted") return "";
        setMessages((prev) => [...prev, { role: "assistant", content: result.message, ...meta }]);
        return "";
      }
      const response = result.text;
      setMessages((prev) => [...prev, { role: "assistant", content: response, truncated: result.stop_reason === "max_tokens", ...meta }]);
      captureResponsePatterns(response, step);
      return response;
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "API call failed"}` },
      ]);
      return "";
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
          // Pastoral Context (tier 7) IS preserved when present, since
          // The Room and The Sermon's Work shape *how* the research is read
          // even in free-form mode. Source: Phase 4 Field 3
          // (implications.pastoral_context) per B4.2 reshape.
          const sourcesBlock = theologyChunks.join("\n\n");
          const passageLine = sermon?.passage ? `\nPASSAGE: ${sermon.passage}\n` : "";
          const pc = readPastoralContext(sermon);
          const pcLines = [
            pc.room        && `The Room: ${pc.room}`,
            pc.costAndGift && `The Sermon's Work: ${pc.costAndGift}`,
          ].filter(Boolean);
          const pcBlock = pcLines.length > 0
            ? `\nPASTORAL CONTEXT:\n${pcLines.join("\n")}\n`
            : "";
          userContent = `SOURCES:\n${sourcesBlock}${passageLine}${pcBlock}\nQUESTION:\n${text}`;
          systemPrompt = THEOLOGY_RESEARCH_PROMPT;
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
        const result = await sendAIMessage(history, systemPrompt, step, sermon?.id);
        // Deduplicate sources by author+work for the attribution display
        const sources = hits?.length ? dedupSources(hits) : [];
        if (!result.ok) {
          if (result.kind !== "aborted") {
            setMessages(prev => [...prev, { role: "assistant", content: result.message, sources }]);
          }
        } else {
          const response = result.text;
          setMessages(prev => [...prev, { role: "assistant", content: response, truncated: result.stop_reason === "max_tokens", sources }]);
          captureResponsePatterns(response, step);
        }
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
      const systemPrompt = INCORPORATE_REVISION_PROMPT;
      const result = await sendAIMessage([{ role: "user", content: prompt }], systemPrompt, reviewStep, sermon?.id);
      if (!result.ok) {
        if (result.kind === "aborted") return;
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't revise: ${result.message}` }]);
        return;
      }
      const response = result.text;

      const parsed = parseAIJson(response);
      if (!parsed.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't parse the revised content: ${parsed.reason} Try again or paste the feedback manually.` }]);
        return;
      }
      const validated = config.type === "mpt_mps"
        ? validateIncorporateMptMps(parsed.value)
        : validateIncorporateStructuredField(parsed.value, config.fieldDefs);
      if (!validated.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't use the revised content: ${validated.reason} Try again or paste the feedback manually.` }]);
        return;
      }
      setDiffData({ config, current, proposed: validated.value });
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Incorporate error: ${err.message}` }]);
    } finally {
      setIncorporateLoading(false);
    }
  }

  function handleAcceptDiff() {
    if (!diffData || !onUpdate) return;
    const { config, current, proposed } = diffData;
    if (config.type === "mpt_mps") {
      onUpdate({ mpt: proposed.mpt ?? sermon?.mpt ?? "", mps: proposed.mps ?? sermon?.mps ?? "" });
    } else {
      const next = applyFieldValueMap(current, proposed);
      onUpdate({ [config.column]: serializeStructuredField(next) });
    }
    setDiffData(null);
  }

  const tabLabels = { study: "Study", outline: "Outline", manuscript: "Manuscript", delivery: "Delivery" };
  const effectiveStep = activeStep || activeTab;
  const theologyMode = theologyEnabled && theologyAvailable;
  const activeRole = getActiveRole(effectiveStep, theologyMode);
  const historyTrimmed = messages.length > MAX_HISTORY_TURNS * 2;
  const turnCount = Math.min(MAX_HISTORY_TURNS, Math.ceil(messages.length / 2));

  return (
    <aside className="ai-panel" data-tour-id="ai-panel">
      <div className="ai-panel-header" data-tour-id="ai-panel-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="ai-panel-title">AI Assistant</div>
            <div className="ai-panel-subtitle">{tabLabels[activeTab] || "Workspace"}</div>
            <div
              className="ai-panel-role"
              title="The AI's posture for the current step"
              style={{ marginTop: "4px", fontSize: "11px", color: "var(--gold-pale)", fontStyle: "italic", letterSpacing: "0.02em" }}
            >
              Role: {activeRole}
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {messages.length > 0 && (
              <IconButton aria-label="Clear AI conversation" className="ai-clear-btn" onClick={clearHistory}>Clear</IconButton>
            )}
          </div>
        </div>
      </div>

      {persistFlash && (
        <div
          role="status"
          style={{
            background: "rgba(74,103,65,0.12)",
            borderBottom: "1px solid rgba(74,103,65,0.25)",
            color: "var(--sage)",
            padding: "6px 14px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span aria-hidden="true">●</span>
          <span><strong>{PERSIST_SAVED_LABELS[persistFlash.column] || `Saved to ${persistFlash.column}`}</strong> on this sermon.</span>
        </div>
      )}

      <div className="ai-panel-messages">
        {historyTrimmed && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-ghost)",
              fontStyle: "italic",
              textAlign: "center",
              padding: "4px 8px",
              borderBottom: "1px dashed var(--parchment-deep)",
              marginBottom: "4px",
            }}
            title={`Only the last ${MAX_HISTORY_TURNS} turns are sent to the AI; earlier turns remain on screen but are not part of the prompt.`}
          >
            Earlier turns are no longer being sent to the AI (history trimmed to last {MAX_HISTORY_TURNS} turns).
          </div>
        )}
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
              {msg.truncated && (
                <div style={{ fontSize: "12px", color: "#a07040", fontStyle: "italic", marginTop: "4px" }}>
                  Response cut off — the AI reached its output limit. Ask it to continue.
                </div>
              )}
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
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <CopyButton text={msg.content} />
                  {msg.isReview && onUpdate && (
                    <IncorporateButton
                      disabled={incorporateLoading || loading}
                      onClick={() => handleIncorporate(msg.content, msg.reviewStep)}
                    />
                  )}
                  {msg.persistColumn && onUpdate && !msg.persisted && (
                    <>
                      <PrimaryButton
                        size="sm"
                        style={{ fontSize: "11px" }}
                        onClick={() => handleSavePersist(i)}
                      >
                        {PERSIST_SAVE_LABELS[msg.persistColumn] || `Save to ${msg.persistColumn}`}
                      </PrimaryButton>
                      <SecondaryButton
                        size="sm"
                        style={{ fontSize: "11px" }}
                        onClick={() => handleDiscardPersist(i)}
                      >
                        Discard
                      </SecondaryButton>
                    </>
                  )}
                  {msg.persistColumn && msg.persisted && (
                    <span style={{ fontSize: "11px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
                      {PERSIST_SAVED_LABELS[msg.persistColumn] || "Saved"}
                    </span>
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
        <PrimaryButton
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
        </PrimaryButton>

        {/* Series Coherence Check — only shown when series big idea exists */}
        {sermon?.series?.big_idea && (
          <SecondaryButton
            style={{ width: "100%", marginBottom: "10px" }}
            onClick={handleSeriesCoherenceCheck}
            disabled={loading}
          >
            Check Series Alignment
          </SecondaryButton>
        )}

        {/* Theology library toggle. Label changes when sqlite-vec / embedder
            is unavailable so the pastor isn't told they're getting semantic
            results when they're actually FTS-only. */}
        {theologyAvailable && (
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--ink-soft)", marginBottom: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={theologyEnabled}
              onChange={e => setTheologyEnabled(e.target.checked)}
            />
            {theologySemantic ? "Search Theology Library" : "Search Theology Library (keyword only)"}
          </label>
        )}

        {/* "What I can see" — context snapshot the AI will receive on the next send */}
        <ContextSnapshotPanel
          open={showContextPanel}
          onToggle={() => setShowContextPanel(v => !v)}
          sermon={sermon}
          step={effectiveStep}
          theologyMode={theologyMode}
          turnCount={turnCount}
          historyTrimmed={historyTrimmed}
        />

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
          <IconButton
            aria-label="Send message"
            className="ai-send-btn"
            onClick={handleSendInput}
            disabled={loading || !inputText.trim()}
            title="Send"
          >
            →
          </IconButton>
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

// ── "What I can see" snapshot panel ────────────────────────────────────────────
function ContextSnapshotPanel({ open, onToggle, sermon, step, theologyMode, turnCount, historyTrimmed }) {
  const snapshot = open ? describeContext({ sermon, step, theologyMode }) : null;
  return (
    <div style={{ marginBottom: "8px", borderTop: "1px solid var(--parchment-deep)", paddingTop: "8px" }}>
      <IconButton
        aria-label={open ? "Hide AI context details" : "Show AI context details"}
        aria-expanded={open}
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 4px",
          fontSize: "11px",
          color: "var(--ink-soft)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--font-serif)",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: "10px" }}>{open ? "▾" : "▸"}</span>
        <span>What I can see</span>
        <span style={{ marginLeft: "auto", color: "var(--ink-ghost)" }}>
          {turnCount > 0 ? `${turnCount} turn${turnCount === 1 ? "" : "s"}` : "no history"}
          {historyTrimmed ? " · trimmed" : ""}
        </span>
      </IconButton>
      {open && snapshot && (
        <div style={{ padding: "6px 8px 4px 18px", fontSize: "11px", color: "var(--ink-soft)" }}>
          {snapshot.mode === "theology-research" && (
            <div style={{ color: "var(--ink-ghost)", marginBottom: "4px", fontStyle: "italic" }}>
              Theology research mode — sermon-workflow context is bypassed.
            </div>
          )}
          {snapshot.sections.length === 0 ? (
            <div style={{ color: "var(--ink-ghost)" }}>
              No sermon context yet. The AI will work from your prompt and pastor memory only.
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {snapshot.sections.map(s => (
                <li key={s.label} style={{ marginBottom: "3px" }}>
                  <span style={{ color: "var(--ink)" }}>{s.label}</span>
                  <span style={{ color: "var(--ink-ghost)" }}> — {s.fields.join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: "6px", color: "var(--ink-ghost)", fontSize: "10px" }}>
            Conversation history: last {turnCount} of {turnCount > 0 ? `${turnCount}+` : "0"} turns
            {historyTrimmed ? " (older turns dropped from prompt)" : ""}.
          </div>
        </div>
      )}
    </div>
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
    <IconButton
      aria-label="Copy AI response"
      onClick={handleCopy}
      className="ai-copy-btn"
      title="Copy response"
    >
      {copied ? "✓ Copied" : "Copy"}
    </IconButton>
  );
}

// ── Incorporate → helpers ──────────────────────────────────────────────────────

function IncorporateButton({ onClick, disabled }) {
  return (
    <IconButton
      aria-label="Incorporate AI feedback into the field"
      onClick={onClick}
      disabled={disabled}
      className="ai-copy-btn"
      title="Incorporate this feedback into the field"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      Incorporate →
    </IconButton>
  );
}

function DiffModal({ config, current, proposed, onAccept, onDiscard }) {
  // mpt_mps's `current` is flat {mpt, mps}; JSON-column configs carry the new
  // per-field per-question envelope shape — read the primary answer for the
  // diff comparison.
  const readCurrent = config.type === "mpt_mps"
    ? (key) => current?.[key] ?? ""
    : (key) => getPrimaryAnswer(current, key);
  const changed = config.fieldDefs.filter(f => {
    const oldVal = readCurrent(f.key).trim();
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
          <IconButton aria-label="Discard proposed revisions" onClick={onDiscard} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--ink-ghost)" }}>✕</IconButton>
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
                      {readCurrent(f.key) || <em style={{ opacity: 0.5 }}>empty</em>}
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
          <SecondaryButton onClick={onDiscard}>Discard</SecondaryButton>
          {changed.length > 0 && (
            <PrimaryButton onClick={onAccept}>Accept All</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
