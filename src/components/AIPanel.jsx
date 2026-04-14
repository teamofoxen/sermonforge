import { useState, useRef, useEffect, useCallback } from "react";
import { useDemo } from "../contexts/DemoContext";
import ContextPreview from "./ContextPreview";
import ReactMarkdown from "react-markdown";
import { getOutline, autoResize } from "../utils";
import { STEPS, PHASES } from "../constants/steps";
import { CONTEXT_SECTIONS } from "../constants/contextSchema";
import { sendAIMessage } from "../utils/ai";
import { buildContext, buildAdaptiveHints } from "../utils/contextBuilder";
import { getMemory, updateMemory, extractPhrasePatterns } from "../utils/memory";
import {
  getLibraryStatus,
  searchLibrary,
  getLibraryManuscripts,
  getTheologyStatus,
  searchTheologyLibrary,
} from "../db/database";

export default function AIPanel({ sermon, activeTab, activeStep, externalMessage, onLoadingChange, loading }) {
  const { demoMode } = useDemo();
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [messages, setMessages] = useState([]);
  const [libraryCount, setLibraryCount] = useState(0);
  const [theologyAvailable, setTheologyAvailable] = useState(false);
  const [theologyEnabled, setTheologyEnabled] = useState(false);
  const [inputText, setInputText] = useState("");
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
    getLibraryStatus()
      .then(s => setLibraryCount(s.count || 0))
      .catch((e) => console.error("[AIPanel] getLibraryStatus failed:", e));
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

  const sendMessage = useCallback(async (userText, systemPrompt, step, sermonId) => {
    if (!userText?.trim()) return;
    const userMsg = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    onLoadingChange?.(true);
    try {
      const history = [...messagesRef.current, userMsg].map((m) => ({ role: m.role, content: m.content }));
      // Always build the full adaptive system prompt as the base. When an external
      // systemPrompt is provided (chip, review, coherence check), append it as a
      // TASK directive so adaptive hints are never bypassed.
      const base = buildSystemPrompt(step, sermonId);
      const finalSystemPrompt = systemPrompt
        ? `${base}\n\nThe following task takes priority over all adaptive guidance above.\n\nTASK:\n${systemPrompt}`
        : base;
      const response = await sendAIMessage(history, finalSystemPrompt);
      setMessages((prev) => [...prev, { role: "assistant", content: response || "Something went wrong. Please try again." }]);
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
        const theologyChunks = hits?.map(h => `[${h.author} — ${h.work}]\n${h.text_chunk}`) || [];

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
- Include at least one direct quotation with its source attribution (format: [Author — Work]).
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
        const history = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
        const response = await sendAIMessage(history, systemPrompt);
        // Deduplicate sources by author+work for the attribution display
        const sources = hits?.length
          ? [...new Map(hits.map(h => [`${h.author}|||${h.work}`, { author: h.author, work: h.work }])).values()]
          : [];
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

  async function handleLibrarySearch() {
    if (!sermon || loading) return;

    // Library context is suppressed by resolveIncludes at all steps except "manuscript".
    // Running the full search at those steps would fetch and rank manuscripts only for them
    // to be silently discarded by buildContext. Fall back to a plain sendMessage so the
    // user still gets a useful response based on the standard context for that step.
    const LIBRARY_GATED_STEPS = new Set([
      PHASES.OBSERVE, PHASES.INTERPRET, PHASES.REDEMPTIVE_THREAD, PHASES.IMPLICATIONS,
      STEPS.MPT_MPS, STEPS.OUTLINE, STEPS.FUNCTIONAL_ELEMENTS,
    ]);
    if (LIBRARY_GATED_STEPS.has(activeStep)) {
      const step = activeStep;
      const context = buildContext({ sermon, step });
      const promptActionMap = {
        [PHASES.OBSERVE]:           "What structural observations or textual features have I highlighted in related passages before?",
        [PHASES.INTERPRET]:         "How have I interpreted similar texts or themes before? What theological conclusions did I draw?",
        [PHASES.REDEMPTIVE_THREAD]: "How have I traced the redemptive thread through similar passages or themes before?",
        [PHASES.IMPLICATIONS]:      "What application directions and implications have I used for similar themes or passages?",
        [STEPS.MPT_MPS]:            "How have I formulated MPTs and MPSs for similar passages before?",
        [STEPS.OUTLINE]:            "What outline patterns have worked well for similar passages or themes?",
        [STEPS.FUNCTIONAL_ELEMENTS]: "How have I developed explanation, application, and illustration for similar passages?",
      };
      const promptAction = promptActionMap[step] || "What insights from my previous work should inform this new sermon?";
      const content = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n${promptAction}`
        : promptAction;
      sendMessage(content, buildSystemPrompt(step, sermon?.id), step, sermon?.id);
      return;
    }

    const passage = sermon.passage || "";
    // Extract just the book name for a reliable FTS anchor
    // e.g. "Galatians 1:1-5" → "Galatians", "1 Corinthians 13:1" → "1 Corinthians"
    const bookName = passage ? passage.split(/\s+\d+[:\-]/)[0].trim() : "";
    const mps = sermon.mps || "";
    const mpt = sermon.mpt || "";

    if (!bookName && !mps && !mpt) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Add a passage to this sermon first — the library search needs something to go on.",
      }]);
      return;
    }

    // Build a richer query: book name + MPS/MPT + early observation keywords
    const parts = [bookName, mps, mpt].filter(Boolean);
    if (activeTab === "study" && sermon.observations) {
      // observations may be structured JSON or plain text; extract readable content
      let obsText = sermon.observations;
      if (sermon.observations.trim().startsWith("{")) {
        try {
          obsText = Object.values(JSON.parse(sermon.observations) || {}).filter(v => typeof v === "string").join(" ");
        } catch { /* malformed JSON — fall through to raw string */ }
      }
      if (obsText) parts.push(obsText.substring(0, 200));
    }
    const searchQuery = parts.join(" ");

    // At this point only "manuscript" (and "outline" without an activeStep set) reaches here,
    // since all other library-gated steps returned early above.
    let promptAction = activeTab === "manuscript"
      ? "What rhetorical moves, transitions, or compelling phrases from my past work could I adapt here?"
      : "What insights from my previous work should inform this new sermon?";

    onLoadingChange?.(true);
    try {
      const hits = await searchLibrary(searchQuery, 6, "ai");

      if (!hits || hits.length === 0) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `No relevant sermons found in your library for "${passage || searchQuery}". Try importing your library from the sidebar first.`,
        }]);
        return;
      }

      const ids = hits.map(h => h.id);
      const manuscripts = await getLibraryManuscripts(ids, true, 500);

      const libraryChunks = manuscripts.map(m => `**${m.title}** (${m.passage})\n${m.manuscript_text}`);
      const step = activeStep || activeTab;
      const context = buildContext({ sermon, step, libraryChunks });
      const userMsg = {
        role: "user",
        content: context
          ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n${promptAction}`
          : promptAction,
      };

      setMessages(prev => [...prev, userMsg]);
      const history = [...messagesRef.current, userMsg].map(m => ({ role: m.role, content: m.content }));
      const response = await sendAIMessage(history, buildSystemPrompt(step, sermon?.id));
      setMessages(prev => [...prev, { role: "assistant", content: response || "Something went wrong. Please try again." }]);
      if (response) captureResponsePatterns(response, step);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Library search error: ${err.message}` }]);
    } finally {
      onLoadingChange?.(false);
    }
  }

  function clearHistory() { setMessages([]); }

  function handleSeriesCoherenceCheck() {
    const mpt           = sermon?.mpt;
    const outline       = getOutline(sermon);
    const seriesBigIdea = sermon?.series?.big_idea;
    const sectionBigIdea = sermon?.section?.big_idea;

    const parts = [];
    if (mpt)               parts.push(`MPT: "${mpt}"`);
    if (outline.length > 0) parts.push(`Outline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}`);
    parts.push(`Series big idea: "${seriesBigIdea}"`);
    if (sectionBigIdea)    parts.push(`Section big idea: "${sectionBigIdea}"`);

    const prompt =
      parts.join("\n\n") +
      "\n\nEvaluate series alignment:\n" +
      "1. Where is the alignment between this sermon and the series framework strong?\n" +
      "2. Where does this sermon diverge from the series framework?\n" +
      "3. Is that divergence textually necessary and helpful, or distracting?";

    sendMessage(prompt,
      "Review whether this sermon fits its series without losing its textual integrity. " +
      "Be direct and specific. Divergence is not always a problem — say so when it is warranted by the text.",
      activeStep || activeTab, sermon?.id
    );
  }

  const tabLabels = { study: "Study", outline: "Outline", manuscript: "Manuscript", delivery: "Delivery" };
  const suggestions = getSuggestions(activeTab, sermon, libraryCount, activeStep);

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="ai-panel-title">AI Assistant</div>
            <div className="ai-panel-subtitle">{tabLabels[activeTab] || "Workspace"}</div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {demoMode && (
              <button
                onClick={() => setShowContextPreview(v => !v)}
                style={{
                  background: showContextPreview ? "var(--gold-pale)" : "none",
                  border: showContextPreview ? "1px solid var(--gold)" : "1px solid var(--parchment-deep)",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  color: showContextPreview ? "var(--gold)" : "var(--ink-ghost)",
                  fontSize: "11px", padding: "3px 8px",
                  fontFamily: "'Crimson Pro', serif",
                }}
                title="Show what was assembled and sent to the AI"
              >
                {showContextPreview ? "Hide Context" : "Preview Context"}
              </button>
            )}
            {messages.length > 0 && (
              <button className="ai-clear-btn" onClick={clearHistory}>Clear</button>
            )}
          </div>
        </div>
      </div>

      {showContextPreview && demoMode && (
        <ContextPreview sermon={sermon} step={activeStep || activeTab} />
      )}

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
                    <span key={si}>{si > 0 ? " · " : ""}{s.author} — <em>{s.work}</em></span>
                  ))}
                </div>
              )}
              {msg.role === "assistant" && <CopyButton text={msg.content} />}
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
        {/* Quick action chips */}
        {suggestions.length > 0 && (
          <div className="ai-suggestions">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="ai-suggestion-btn"
                onClick={() => s.librarySearch ? handleLibrarySearch() : sendMessage(s.prompt, s.system, activeStep || activeTab, sermon?.id)}
                disabled={loading}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Review My Work */}
        <button
          className="btn-primary"
          style={{ width: "100%", marginBottom: "10px" }}
          onClick={() => {
            const { prompt, system } = getReviewPrompt(activeTab, sermon, activeStep);
            sendMessage(prompt, system, activeStep || activeTab, sermon?.id);
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

// Steps where AI response patterns are worth capturing.
// Exegesis phases are excluded — stylistic patterns shouldn't form during text study.
const CAPTURE_PATTERN_STEPS = new Set(['manuscript', STEPS.OUTLINE, 'outline']);

// Extracts up to 2 phrase patterns from an AI response and stores them in memory.
// Only runs for manuscript and outline steps. Filters out any phrase already in
// memory or present in the last 3 stored phrases to prevent the AI reinforcing
// its own output endlessly.
function captureResponsePatterns(response, step) {
  if (!CAPTURE_PATTERN_STEPS.has(step)) return;
  if (!response?.trim()) return;

  const stored = getMemory()?.patterns?.aiPhrasePatterns ?? [];
  const storedSet = new Set(stored);
  const recentSet = new Set(stored.slice(-3));

  const newPatterns = extractPhrasePatterns(response)
    .slice(0, 2)
    .filter((p) => !storedSet.has(p) && !recentSet.has(p));

  if (newPatterns.length === 0) return;
  updateMemory({ patterns: { aiPhrasePatterns: newPatterns } });
}

function buildSystemPrompt(step, sermonId) {
  const stepDescriptions = {
    [STEPS.EXEGESIS]:            "The pastor is in the exegesis phase.",
    [PHASES.OBSERVE]:            "The pastor is making initial observations — reading the text, noting main features.",
    [PHASES.INTERPRET]:          "The pastor is interpreting the text — moving from observations to meaning.",
    [PHASES.REDEMPTIVE_THREAD]:  "The pastor is tracing the redemptive thread — locating this passage in the story of Christ.",
    [PHASES.IMPLICATIONS]:       "The pastor is drawing theological and practical implications from the text.",
    [STEPS.MPT_MPS]:             "The pastor is forging the Main Point of the Text (MPT) and Main Point of the Sermon (MPS).",
    [STEPS.OUTLINE]:             "The pastor is building the sermon outline.",
    [STEPS.FUNCTIONAL_ELEMENTS]: "The pastor is developing functional elements (explanation, application, illustration) per outline point.",
    "outline":     "The pastor is working on the sermon outline.",
    "manuscript":  "The pastor is writing the sermon manuscript.",
    "delivery":    "The pastor is preparing delivery notes.",
    "book-study":  "The pastor is in the Book Study phase — doing foundational research and theological reflection before series planning begins. This phase involves pasting commentary material, developing the book's argument, locating it in redemptive history, and forming a working big idea. The AI should act as a thinking partner for deep theological and structural exploration, not a content generator.",
  };

  const stepDesc = stepDescriptions[step]
    || (step === "study" ? "The pastor is in the study phase."
      : "The pastor is working on sermon preparation.");

  const toolContext = `TOOL CONTEXT:
SermonForge is built around a text-driven homiletical method. The workflow is intentional — each stage builds on the last and is designed to keep the text in control of the sermon rather than the pastor's predetermined ideas.

Work begins at the series level before any individual sermon prep starts. The pastor plans the theological arc of a book or topic, divides it into preachable units, and assigns them to Sundays. Each sermon inherits the series big idea and section big idea as orienting context. The sermon should express the series arc.

Individual sermon prep moves through these stages in sequence:

Observe — look at what the text actually says before deciding what it means. Slow down, notice everything.
Interpret — draw meaning from what you observed. What did the original author intend?
Redemptive Thread — locate the passage in the larger biblical story. Where does Christ appear in or behind this text?
Implications — what does this text demand of the listener? How does the gospel shape that demand?
MPT/MPS — distill the text's meaning (MPT, past tense: what the text said) and the sermon's claim (MPS, present tense: what the sermon says today). These are distinct and the distinction matters.
Outline — structure the sermon around the text's own movement, not a predetermined shape.
Functional Elements — for each outline point: what does it explain, what does it ask of the listener, what does it illustrate.
Manuscript — full written form, voice intact.
Delivery — final preparation, timing, post-sermon reflection.`;

  let base = `You are a sermon preparation assistant for a pastor. Be theologically rigorous. Be concise in conversational responses. Be thorough and structured when a review or evaluation is requested. When the pastor asks questions about the tool, the workflow, or why a stage exists, answer from this context accurately and in the spirit of the method.

${toolContext}

${stepDesc}

MESSAGE CONTEXT RULES:
The pastor's sermon context is provided at the start of each message under labeled sections. Use it according to these rules:
- ${CONTEXT_SECTIONS.PASSAGE}: Authoritative. All responses must stay grounded in the text and its historically-derived main point.
- ${CONTEXT_SECTIONS.THIS_SERMON}: Pastoral intelligence for this specific sermon. Three fields: Topic/Theme is the territory this sermon enters — a doctrine, life situation, question, or felt need (e.g. grief, doubt, parenting, the problem of evil, union with Christ). Audience is what the pastor knows about who's in the room — their posture, context, and what they're carrying into the service, not demographics. Background is specifically external context — news, cultural moment, community events, what's on everyone's mind before the sermon begins. Use Topic/Theme to orient theological framing and illustration relevance. Use Audience to shape application specificity and tone. Use Background to ground the sermon in the actual moment. Present at every step — weight appropriately alongside the text.
- ${CONTEXT_SECTIONS.INTERPRETATION}: Primary interpretive lens. The MPS governs application direction; do not suggest applications that contradict it.
- ${CONTEXT_SECTIONS.STRUCTURE}: The outline is a working structure guide. Respect it unless the pastor is asking you to evaluate or change it.
- ${CONTEXT_SECTIONS.SERIES}: Optional alignment only. Note resonance with the series where natural; never force it or subordinate the text to it.
- ${CONTEXT_SECTIONS.SUPPORTING}: Library and theology sources support the text — they illustrate, confirm, or enrich. They never override the text or replace exegetical work.
- ${CONTEXT_SECTIONS.PASTOR}: Reflects established patterns and preferences. Use it to align tone, structure, and style. Do not let it override the passage.`;

  const hints = buildAdaptiveHints(getMemory(), step, sermonId);
  if (hints.length > 0) {
    base += `\n\nADAPTIVE GUIDANCE:\nAdaptive guidance reflects tendencies, not requirements. Do not force patterns where they do not fit the passage.\n${hints.map(h => `- ${h}`).join("\n")}`;
  }

  return base;
}

const HOW_CHIP_MESSAGES = {
  [PHASES.OBSERVE]:            "Explain the Observe phase — what it's for, what I should be doing, and how it sets up the rest of sermon prep.",
  [PHASES.INTERPRET]:          "Explain the Interpret phase — what it's for, how it builds on observation, and what good interpretation looks like.",
  [PHASES.REDEMPTIVE_THREAD]:  "Explain the Redemptive Thread phase — what it's for, why it comes here in the process, and how to think about locating Christ in the text.",
  [PHASES.IMPLICATIONS]:       "Explain the Implications phase — what it's for, how it differs from application, and how the gospel shapes it.",
  [STEPS.MPT_MPS]:             "Explain the MPT and MPS — what each one is, why they're distinct, and how to forge them well.",
  [STEPS.OUTLINE]:             "Explain the Outline stage — what it's for, how it should relate to the text's own structure, and what makes a good sermon outline.",
  [STEPS.FUNCTIONAL_ELEMENTS]: "Explain Functional Elements — what Explanation, Application, and Illustration are each doing and why every point needs all three.",
  "outline":    "Explain the Outline stage — what it's for, how it should relate to the text's own structure, and what makes a good sermon outline.",
  "manuscript": "Explain the Manuscript stage — what it's for in this workflow and how it relates to everything that came before.",
  "delivery":   "Explain the Delivery tab — what it's for and how to use it well.",
  "series":     "Explain how Series Planning works in SermonForge — what it's for, how it relates to individual sermon prep, and how to use it well.",
  "study":      "Explain how the Study tab works — the four phases of exegesis and the steps that follow.",
  "book-study": "Explain how the Book Study phase works within SermonForge. Describe how each field contributes to the series planning process and how the work here feeds into the rest of the workflow.",
};

function howChip(key) {
  const prompt = HOW_CHIP_MESSAGES[key] || "Explain how this stage fits into the overall SermonForge workflow.";
  return { label: "How does this step work?", prompt };
}

function getSuggestions(tab, sermon, libraryCount = 0, activeStep) {
  const passage = sermon?.passage || "this passage";
  const mps = sermon?.mps || "";
  const libraryBtn = libraryCount > 0 ? [{ label: "Search My Library", librarySearch: true }] : [];

  if (tab === "study") {
    const base = [
      howChip(activeStep || "study"),
      {
        label: "Historical context",
        system: "Provide the key historical and cultural context a preacher needs. Be concise.",
        prompt: `Give me the key historical and cultural context for ${passage} that a preacher needs for sermon prep.`,
      },
      {
        label: "Key words to study",
        system: "Identify theologically significant words and phrases with biblical language insights. Be concise and practical.",
        prompt: `What are the most important words or phrases in ${passage} that carry theological weight? Include any Hebrew/Greek insights worth knowing.`,
      },
    ];
    // Add redemptive thread prompt when in that phase
    if (activeStep === PHASES.REDEMPTIVE_THREAD) {
      base.push({
        label: "Redemptive-historical placement",
        system: "Engage with this from a Reformed biblical theology perspective. Be specific and textually grounded.",
        prompt: `Where does ${passage} fit in the arc of redemptive history? How does it point forward or backward to Christ?`,
      });
    }
    return [...base, ...libraryBtn];
  }

  if (tab === "outline") {
    return [
      howChip(activeStep || "outline"),
      {
        label: "Suggest outline structures",
        system: "Suggest text-driven outlines, not topical ones.",
        prompt: `Suggest two or three possible outline structures for ${passage}. Each should derive the points directly from the text.${mps ? ` The MPS is: ${mps}` : ""}`,
      },
      ...libraryBtn,
    ];
  }

  if (tab === "manuscript") {
    return [
      howChip("manuscript"),
      {
        label: "Strengthen the introduction",
        system: "Focus on the opening hook and the move toward the text.",
        prompt: `Here is my sermon introduction. Suggest how to strengthen it — improve the hook, the tension, and the move toward the text:\n\n${sermon?.manuscript?.substring(0, 500) || "[No manuscript yet]"}`,
      },
      {
        label: "Check gospel clarity",
        system: "Evaluate gospel-centeredness from a Reformed homiletical perspective.",
        prompt: `Evaluate the gospel clarity of this sermon. Passage: ${passage}. MPS: ${mps || "(not set)"}. What should be explicit about Christ's work?`,
      },
      ...libraryBtn,
    ];
  }

  if (tab === "delivery") {
    return [
      howChip("delivery"),
      {
        label: "Delivery tips for this passage",
        system: "Give practical, specific preaching coaching.",
        prompt: `Give me 3–4 practical delivery tips for preaching ${passage}. Consider tone, pacing, and emotional engagement.`,
      },
    ];
  }

  if (tab === "series") {
    return [howChip("series")];
  }

  if (tab === "book-study") {
    return [
      howChip("book-study"),
      {
        label: "Summarize the book's argument",
        prompt: "Based on what I've shared, summarize the controlling argument of this book in a form I can work from.",
      },
      {
        label: "Suggest sermon divisions",
        prompt: "Based on the book's structure, suggest how it might be divided into a preaching series. Give me 4-8 divisions with passage ranges and a one-sentence rationale for each.",
      },
      {
        label: "Where does this sit in redemptive history",
        prompt: "Help me articulate where this book sits in the arc of redemptive history — from creation to new creation. What does it contribute to the story that only it can contribute?",
      },
      {
        label: "What does this book demand of this congregation",
        prompt: "Given what this book argues and who this congregation is, what is the specific claim this book makes on us? What does it demand that we believe, repent of, or do?",
      },
      {
        label: "Help me find the big idea",
        prompt: "I'm working toward a series big idea. Rather than giving me one, ask me three questions that will help me find it myself.",
      },
    ];
  }

  return [];
}

function getReviewPrompt(tab, sermon, activeStep) {
  const passage = sermon?.passage || "the passage";
  const mpt = sermon?.mpt || "";
  const mps = sermon?.mps || "";

  if (tab === "study") {
    const phasePrompts = {
      [PHASES.OBSERVE]:           `Review these observations about ${passage}. Are the main features of the text captured — context, divisions, commands, statements, characters, big ideas? What is missing or underdeveloped?\n\nMy observations:\n${sermon?.observations || "(none)"}`,
      [PHASES.INTERPRET]:         `Review this interpretation work on ${passage}. Does it move from observation to meaning correctly? Are contrasts, recurring ideas, and key words identified? What gaps remain?\n\nMy interpretation:\n${sermon?.interpretation || "(none)"}`,
      [PHASES.REDEMPTIVE_THREAD]: `Review this redemptive thread summary for ${passage}. Does it accurately locate this passage in redemptive history? Is Christ's role clear and textually grounded, not imported?\n\nMy redemptive thread notes:\n${sermon?.redemptive_thread || "(none)"}`,
      [PHASES.IMPLICATIONS]:      `Review these implications drawn from ${passage}. Are they theologically grounded? Do they address both believers and unbelievers? Do they go deeper than behavioral steps?\n\nMy implications:\n${sermon?.implications || "(none)"}`,
    };

    if (activeStep && phasePrompts[activeStep]) {
      return {
        system: "Give direct, specific, constructive feedback as a biblical scholar and homiletics mentor would.",
        prompt: phasePrompts[activeStep],
      };
    }

    // Step 2: MPT/MPS
    if (activeStep === STEPS.MPT_MPS) {
      return {
        system: "Act as a rigorous challenger. Push back, probe weaknesses, and expose where the MPT or MPS does not hold up. Do not offer encouragement unless the work genuinely earns it. If something is weak, say so directly. The pastor needs a tough critic here, not a supportive mentor.",
        prompt: `Challenge the MPT and MPS for ${passage}.\n\nMPT: ${mpt || "(none)"}\nMPS: ${mps || "(none)"}\n\nProbe each one:\n- Is the MPT the actual main point of the text, or is it what the pastor wanted to find? Can you poke a hole in it?\n- Does the MPS flow organically from the MPT, or is it an import from somewhere else?\n- Is the MPT-to-MPS movement legitimate, or is the preacher smuggling in a point the text doesn't make?\n- What is the weakest part of this formulation?`,
      };
    }

    // Step 3: Outline
    if (activeStep === STEPS.OUTLINE) {
      const outline = getOutline(sermon);
      return {
        system: "Review this outline for homiletical strength.",
        prompt: `Review this sermon outline for ${passage}.\n\nMPT: ${mpt}\nMPS: ${mps}\n\nOutline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n") || "(none)"}\n\nDo the points derive from the text? Do they serve the MPS? Is the progression clear?`,
      };
    }

    // Step 4: Functional Elements
    if (activeStep === STEPS.FUNCTIONAL_ELEMENTS) {
      const outline = getOutline(sermon);
      const fe = sermon?.functional_elements
        ? (typeof sermon.functional_elements === "string"
            ? (() => { try { return JSON.parse(sermon.functional_elements); } catch { return {}; } })()
            : sermon.functional_elements)
        : {};
      const feLines = outline.map((p, i) => {
        const entry = fe[p.id] || {};
        const explanation  = entry.explanation?.trim()  || "(none)";
        const application  = entry.application?.trim()  || "(none)";
        const illustration = entry.illustration?.trim() || "(none)";
        return `Point ${i + 1}: ${p.text}\n  Explanation: ${explanation}\n  Application: ${application}\n  Illustration: ${illustration}`;
      }).join("\n\n");
      return {
        system: "Review the functional elements for homiletical strength. Be thorough — evaluate each point individually.",
        prompt: `Review the functional elements for each outline point in this sermon on ${passage}.\n\nMPS: ${mps || "(none)"}\n\nFor each point, evaluate:\n- Does the explanation ground the point in the text and the author's intent?\n- Is the application specific, gospel-shaped, and not merely behavioral?\n- Does the illustration serve the point, or does it distract from it?\n- Is anything missing that the point genuinely needs?\n\n${feLines || "(No functional elements recorded)"}`,
      };
    }

    // Full study review (fallback)
    return {
      system: "Review this study work as a biblical scholar and homiletics mentor would.",
      prompt: `Review the study work for ${passage}.\n\nObservations: ${sermon?.observations || "(none)"}\n\nInterpretation: ${sermon?.interpretation || "(none)"}\n\nRedemptive thread: ${sermon?.redemptive_thread || "(none)"}\n\nImplications: ${sermon?.implications || "(none)"}\n\nMPT: ${mpt}\nMPS: ${mps}\n\nIs the exegetical work thorough? Is the MPT historically grounded? Does the MPS flow from the text?`,
    };
  }

  if (tab === "outline") {
    const outline = getOutline(sermon);
    return {
      system: "Review this outline for homiletical strength.",
      prompt: `Review this sermon outline for ${passage}.\n\nMPT: ${mpt}\nMPS: ${mps}\n\nOutline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}\n\nDo the points derive from the text? Do they serve the MPS? Is the progression clear?`,
    };
  }

  if (tab === "manuscript") {
    const manuscriptText = sermon?.manuscript || "(none)";
    const manuscriptForReview = manuscriptText.length > 8000
      ? manuscriptText.substring(0, 8000) + "\n\n(manuscript truncated for review — full text in editor)"
      : manuscriptText;
    return {
      system: "Provide a structured manuscript review.",
      prompt: `Review this sermon manuscript.\n\nPassage: ${passage}\nMPT: ${mpt}\nMPS: ${mps}\n\nManuscript:\n${manuscriptForReview}\n\nGive a brief assessment of: text governance, structural alignment, gospel necessity, and one concrete improvement.`,
    };
  }

  if (tab === "delivery") {
    return {
      system: "Review this from a preaching coach's perspective.",
      prompt: `Review the delivery notes and pre-sermon preparation for ${passage}.\n\nDelivery notes: ${sermon?.delivery_notes || "(none)"}\nTiming notes: ${sermon?.timing_notes || "(none)"}\n\nWhat should this preacher be thinking about for effective delivery?`,
    };
  }

  return {
    system: "Give brief, constructive feedback on the current sermon.",
    prompt: `Review the current sermon on ${passage} and give brief, constructive feedback.`,
  };
}

