import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "../utils/hooks";
import {
  getSeries, updateSeries,
  getSectionsBySeries, createSection, updateSection, deleteSection,
  getSermonsBySeries, createSermon, updateSermon, deleteSermon,
} from "../core/spine";
import { getCalendarNotes, exportStudyGuide } from "../db/database";
import {
  SERIES_STATUS, SERIES_STATUS_LABELS,
  SERMON_STATUS,
} from "../core/contracts";
import { getSeasonForDate, getUpcomingSundays, toDateString } from "../utils/churchCalendar";
import { tryParse, formatDate, autoResize } from "../utils";
import DeleteButton from "./DeleteButton";
import InlineError from "./InlineError";
import { sendAIMessage } from "../utils/ai";
import InlineAIResponse from "./InlineAIResponse";
import ReactMarkdown from "react-markdown";


const CANON_OPTIONS = [
  { value: "", label: "— Select category —" },
  { value: "ot", label: "Old Testament" },
  { value: "nt", label: "New Testament" },
  { value: "wisdom", label: "Wisdom" },
  { value: "prophetic", label: "Prophetic" },
];

const COLOR_OPTIONS = [
  { value: "gold", label: "Gold" },
  { value: "crimson", label: "Crimson" },
  { value: "sage", label: "Sage" },
  { value: "slate", label: "Slate" },
];

const STATUS_OPTIONS = [
  { value: SERIES_STATUS.InProgress, label: SERIES_STATUS_LABELS[SERIES_STATUS.InProgress] },
  { value: SERIES_STATUS.Complete,   label: SERIES_STATUS_LABELS[SERIES_STATUS.Complete] },
];

// ── Book Study field definitions ──────────────────────────────────────────────
const BOOK_STUDY_FIELDS = [
  {
    key: "redemptive_context",
    label: "Where This Book Sits in Redemptive History",
    placeholder: "How does this book fit in the arc from creation to new creation? Where does it land in the story of Israel, the coming of Christ, the mission of the church?",
    soloPrompt: "Here is my working note on where this book sits in redemptive history. Help me develop this into a clear statement of how this book participates in the arc from creation to new creation.",
  },
  {
    key: "book_background",
    label: "The World of This Book",
    placeholder: "Author, audience, occasion, historical setting, genre — what shaped why this book was written and who first received it?",
    soloPrompt: "Here is background material on this book. Summarize the author, audience, occasion, and genre in a way that closes the gap between their world and ours.",
  },
  {
    key: "book_argument",
    label: "The Book's Controlling Argument",
    placeholder: "What is the author's central claim? What is he trying to prove, teach, or accomplish from beginning to end?",
    soloPrompt: "Here is material on this book's argument. Distill the author's controlling claim in two or three sentences a pastor could work from.",
  },
  {
    key: "book_structure",
    label: "How the Book Is Built",
    placeholder: "Major movements, structural markers, turning points — how does the book progress from its opening to its conclusion?",
    soloPrompt: "Here is a structural analysis of this book. Suggest how this structure might translate into sermon divisions for a preaching series.",
  },
  {
    key: "series_motivation",
    label: "Why This Congregation, Why Now",
    placeholder: "What pastoral need, cultural moment, or congregational gap makes this book urgent for this people at this time?",
    soloPrompt: "Here is my pastoral reasoning for preaching this series. Help me sharpen this into a clear statement of why this congregation needs this book now.",
  },
  {
    key: "emerging_big_idea",
    label: "Working Big Idea",
    placeholder: "A working draft of the central truth this series will drive home — the one thing you want every listener to carry out the door.",
    soloPrompt: "Here is my working big idea for this series. Push back on it — is it the book's idea or mine? Is it too broad, too narrow, or exactly right?",
  },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function SeriesPlanner({ seriesId, onClose, onOpenSermon }) {
  const [series, setSeries]     = useState(null);
  const [sections, setSections] = useState([]);
  const [sermons, setSermons]   = useState([]);
  const [calNotes, setCalNotes] = useState([]);
  const [activeTab, setActiveTab] = useState("book-study");
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [showHowItWorks, setShowHowItWorks]   = useState(false);
  const [showStudyGuide, setShowStudyGuide]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    load();
    const saved = localStorage.getItem(`sermonforge_planner_tab_${seriesId}`);
    setActiveTab(saved || "book-study");
  }, [seriesId]);

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    localStorage.setItem(`sermonforge_planner_tab_${seriesId}`, tabId);
  }

  async function load() {
    try {
      const [s, sects, serms, notes] = await Promise.all([
        getSeries(seriesId),
        getSectionsBySeries(seriesId),
        getSermonsBySeries(seriesId),
        getCalendarNotes(),
      ]);
      setSeries(s);
      setSections(sects);
      setSermons(serms);
      setCalNotes(notes);
    } catch (e) {
      console.error("SeriesPlanner load error:", e);
    } finally {
      setLoading(false);
    }
  }

  const persistSeries = useCallback(async (fields) => {
    setSaving(true);
    setSaveError(false);
    try {
      await updateSeries(seriesId, fields);
      setSeries(prev => ({ ...prev, ...fields }));
    } catch (e) {
      console.error("[persistSeries]", e);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }, [seriesId]);

  const debouncedPersist = useDebounce(persistSeries, 800);

  function handleSeriesField(field, value) {
    setSeries(prev => ({ ...prev, [field]: value }));
    debouncedPersist({ [field]: value });
  }

  if (loading || !series) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
      </div>
    );
  }

  const tabs = [
    { id: "book-study", label: "Book Study" },
    { id: "overview",   label: "Overview" },
    { id: "structure",  label: "Structure" },
    { id: "slots",      label: "Sermon Slots" },
    { id: "calendar",   label: "Calendar" },
  ];

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Topbar */}
      <div style={{
        background: "var(--white)", borderBottom: "1px solid var(--parchment-deep)",
        padding: "0 28px", display: "flex", alignItems: "center", gap: "16px",
        minHeight: "56px", flexShrink: 0,
      }}>
        <SecondaryButton size="sm" onClick={onClose} style={{ flexShrink: 0 }}>
          ← Back
        </SecondaryButton>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
          background: `var(--${series.color || "gold"})`,
        }} />
        <div style={{
          flex: 1, fontFamily: "'Playfair Display', serif", fontSize: "17px",
          fontWeight: "600", color: "var(--ink)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}>
          {series.title}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          {saving && <span style={{ fontSize: "12px", color: "var(--ink-ghost)", fontStyle: "italic" }}>Saving…</span>}
          {!saving && saveError && <span style={{ fontSize: "12px", color: "var(--crimson-soft)" }}>Save failed</span>}
          <span style={{
            fontSize: "11px", padding: "3px 10px", borderRadius: "10px",
            background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)",
            color: series.status === SERIES_STATUS.Complete ? "var(--gold)" : "var(--sage)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {SERIES_STATUS_LABELS[series.status] || SERIES_STATUS_LABELS[SERIES_STATUS.InProgress]}
          </span>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "12px", padding: "4px 8px", fontFamily: "'Crimson Pro', serif", flexShrink: 0 }}
        >
          How this works
        </button>
        <button
          onClick={() => setShowStudyGuide(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "12px", padding: "4px 8px", fontFamily: "'Crimson Pro', serif", flexShrink: 0 }}
        >
          Study Guide
        </button>
        <SecondaryButton
          size="sm"
          onClick={() => setDrawerOpen(v => !v)}
          style={{ fontSize: "13px", color: drawerOpen ? "var(--gold)" : "var(--ink-ghost)", borderColor: drawerOpen ? "var(--gold)" : undefined, flexShrink: 0 }}
        >
          Chat with AI
        </SecondaryButton>
      </div>

      {/* Tab bar */}
      <div style={{
        background: "var(--white)", borderBottom: "1px solid var(--parchment-deep)",
        padding: "0 28px", display: "flex", gap: "0", flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "14px 18px", fontSize: "14px",
              fontFamily: "'Crimson Pro', serif",
              color: activeTab === tab.id ? "var(--gold)" : "var(--ink-soft)",
              borderBottom: activeTab === tab.id ? "2px solid var(--gold)" : "2px solid transparent",
              fontWeight: activeTab === tab.id ? "600" : "400",
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", background: "var(--parchment)" }}>
        {activeTab === "book-study" && (
          <BookStudyTab
            series={series}
            onChange={handleSeriesField}
            drawerOpen={drawerOpen}
            onOpenDrawer={() => setDrawerOpen(true)}
            onCloseDrawer={() => setDrawerOpen(false)}
          />
        )}
        {activeTab === "overview" && (
          <OverviewTab
            series={series}
            onChange={handleSeriesField}
            drawerOpen={drawerOpen}
            onOpenDrawer={() => setDrawerOpen(true)}
            onCloseDrawer={() => setDrawerOpen(false)}
          />
        )}
        {activeTab === "structure" && (
          <StructureTab
            series={series}
            sections={sections}
            onChange={handleSeriesField}
            onSectionsChange={setSections}
            seriesId={seriesId}
            drawerOpen={drawerOpen}
            onOpenDrawer={() => setDrawerOpen(true)}
            onCloseDrawer={() => setDrawerOpen(false)}
          />
        )}
        {activeTab === "slots" && (
          <SlotsTab
            series={series}
            sections={sections}
            sermons={sermons}
            seriesId={seriesId}
            onSermonsChange={setSermons}
            onOpenSermon={onOpenSermon}
            drawerOpen={drawerOpen}
            onOpenDrawer={() => setDrawerOpen(true)}
            onCloseDrawer={() => setDrawerOpen(false)}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarTab
            series={series}
            sections={sections}
            sermons={sermons}
            calNotes={calNotes}
            onChange={handleSeriesField}
            onSermonsChange={setSermons}
            drawerOpen={drawerOpen}
            onOpenDrawer={() => setDrawerOpen(true)}
            onCloseDrawer={() => setDrawerOpen(false)}
          />
        )}
      </div>
    </div>
    {showHowItWorks && <SeriesHowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    {showStudyGuide && <StudyGuideModal series={series} sections={sections} sermons={sermons} onClose={() => setShowStudyGuide(false)} />}
    </>
  );
}

// ── Book Study Tab ────────────────────────────────────────────────────────────
// Rich placeholders that replace the generic ones from BOOK_STUDY_FIELDS
const BOOK_STUDY_PLACEHOLDERS = {
  redemptive_context: "Where does this book sit in the arc from creation to new creation? How does it anticipate or reflect Christ?",
  book_background: "Author, audience, occasion, date, historical setting, literary genre. Paste from a commentary introduction or write your own notes.",
  book_argument: "What is the author's central claim or purpose? What is this book trying to do to its reader?",
  book_structure: "Major movements, structural markers, turning points, chiasms, repeated refrains. How does the shape of the book serve its argument?",
  series_motivation: "What does this congregation need from this book right now? What pastoral urgency drives this series?",
  emerging_big_idea: "A draft of the series big idea — what this book is saying and doing in one sentence. Refine it as you go.",
};

// Which pipeline tier each Book Study field belongs to.
// redemptive_context and series_motivation feed Tier 4 (series context).
// All other book study fields are excluded from per-sermon context — too large for the budget.
const BOOK_STUDY_TIER = {
  redemptive_context: 4,
  series_motivation: 4,
  book_background: "excluded",
  book_argument: "excluded",
  book_structure: "excluded",
  emerging_big_idea: "excluded",
};

function BookStudyTab({ series, onChange, drawerOpen, onOpenDrawer, onCloseDrawer }) {
  const [aiMessages, setAiMessages]   = useState([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Inline response state — keyed by field key
  const [inlineResponses, setInlineResponses] = useState({});
  const [inlineLoading, setInlineLoading] = useState(null); // field key | null

  // Draft loading for Working Big Idea
  const [draftLoading, setDraftLoading] = useState(false);

  async function handleAnalyze(fieldDef) {
    const currentContent = series[fieldDef.key]?.trim();
    if (!currentContent) return;

    const populatedFields = BOOK_STUDY_FIELDS.filter(f => series[f.key]?.trim().length > 0);

    let identity = `We are studying ${series.title || "this series"}`;
    if (series.passage_range?.trim()) identity += ` — ${series.passage_range.trim()}`;
    if (series.canon_category?.trim()) identity += ` (${series.canon_category.trim()})`;
    identity += ".";

    let userContent;
    if (populatedFields.length === 1) {
      userContent = `${identity}\n\n${currentContent}\n\n${fieldDef.soloPrompt}`;
    } else {
      const otherFields = populatedFields.filter(f => f.key !== fieldDef.key);
      const contextLines = otherFields
        .map(f => `${f.label}:\n${series[f.key].trim()}`)
        .join("\n\n");
      userContent = `${identity}\n\n${fieldDef.label}:\n${currentContent}\n\n${fieldDef.soloPrompt}\n\nFor context, here is what I have noted in other areas of my book study:\n\n${contextLines}`;
    }

    setInlineLoading(fieldDef.key);
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: userContent }],
        `You are a biblical scholar and preaching consultant helping a pastor develop their book study for a sermon series on "${series.title || "this book"}"${series.passage_range ? ` (${series.passage_range})` : ""}. Engage seriously with the pastor's notes and give substantive, practical feedback.`
      );
      setInlineResponses(prev => ({ ...prev, [fieldDef.key]: resp }));
    } catch (e) {
      console.error("[handleAnalyze]", e);
      setInlineResponses(prev => ({ ...prev, [fieldDef.key]: "Something went wrong. Please try again." }));
    } finally {
      setInlineLoading(null);
    }
  }

  async function generateWorkingBigIdea() {
    if (draftLoading) return;
    setDraftLoading(true);
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: `Series: "${series.title || "unknown"}"\nPassage: ${series.passage_range || "unknown"}\n\nBook Study notes:\n${BOOK_STUDY_FIELDS.filter(f => f.key !== "emerging_big_idea" && series[f.key]?.trim()).map(f => `${f.label}:\n${series[f.key].trim()}`).join("\n\n") || "(none yet)"}\n\nDraft a series big idea — one sentence summarizing the central truth this book drives home. Make it sharp, memorable, and theologically precise. Return only the sentence.` }],
        "You are helping a pastor crystallize a series big idea from their book study work."
      );
      if (resp?.trim()) onChange("emerging_big_idea", resp.trim());
    } catch (e) {
      console.error("[generateWorkingBigIdea]", e);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    let identity = `We are studying ${series.title || "this series"}`;
    if (series.passage_range?.trim()) identity += ` — ${series.passage_range.trim()}`;
    if (series.canon_category?.trim()) identity += ` (${series.canon_category.trim()})`;
    identity += ".";
    const userMsg = { role: "user", content: `${identity}\n\n${chatInput.trim()}` };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const populatedSummary = BOOK_STUDY_FIELDS
        .filter(f => series[f.key]?.trim())
        .map(f => `${f.label}: ${series[f.key].trim()}`)
        .join("\n");
      const systemCtx = populatedSummary
        ? `Book study notes:\n${populatedSummary}`
        : `Series: "${series.title || "untitled"}"${series.passage_range ? ` (${series.passage_range})` : ""}`;
      const resp = await sendAIMessage(
        newMessages,
        `You are a biblical scholar and preaching consultant helping a pastor develop their book study. ${systemCtx}`
      );
      setAiMessages([...newMessages, { role: "assistant", content: resp }]);
    } catch (e) {
      console.error("[handleChatSubmit]", e);
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      <div style={{ height: "100%", padding: "28px 32px", overflowY: "auto" }}>

        {/* Book identity header */}
        <div style={{ marginBottom: "24px", padding: "14px 16px", background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)" }}>
          <input
            style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "600", marginBottom: (series.passage_range || series.canon_category) ? "6px" : "0" }}
            value={series.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Series Text"
          />
          {(series.passage_range || series.canon_category) && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {series.passage_range && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "var(--ink-soft)" }}>
                  {series.passage_range}
                </span>
              )}
              {series.canon_category && (
                <span style={{
                  fontSize: "10px", padding: "2px 7px", borderRadius: "10px",
                  background: "var(--parchment-deep)", color: "var(--ink-soft)",
                  fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {series.canon_category}
                </span>
              )}
            </div>
          )}
        </div>

        {BOOK_STUDY_FIELDS.map((fieldDef) => (
          <div key={fieldDef.key} style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>{fieldDef.label}</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {/* Draft button only on Working Big Idea */}
                {fieldDef.key === "emerging_big_idea" && (series.passage_range || series.title) && (
                  <SecondaryButton
                    size="sm"
                    onClick={generateWorkingBigIdea}
                    disabled={draftLoading || inlineLoading !== null}
                    style={{ fontSize: "12px" }}
                  >
                    {draftLoading ? "Thinking…" : "Draft →"}
                  </SecondaryButton>
                )}
                <SecondaryButton
                  size="sm"
                  onClick={() => handleAnalyze(fieldDef)}
                  disabled={!series[fieldDef.key]?.trim() || inlineLoading !== null}
                >
                  {inlineLoading === fieldDef.key ? "Thinking…" : "Analyze"}
                </SecondaryButton>
              </div>
            </div>
            <textarea
              style={{ ...textareaStyle }}
              rows={3}
              value={series[fieldDef.key] || ""}
              onChange={(e) => onChange(fieldDef.key, e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder={BOOK_STUDY_PLACEHOLDERS[fieldDef.key] || fieldDef.placeholder}
            />
            <InlineAIResponse
              fieldName={fieldDef.label}
              response={inlineResponses[fieldDef.key]}
              loading={inlineLoading === fieldDef.key}
              onDismiss={() => setInlineResponses(prev => { const n = { ...prev }; delete n[fieldDef.key]; return n; })}
            />
          </div>
        ))}

      </div>

      {drawerOpen && (
        <div className="ai-drawer open">
          <div className="ai-drawer-close-bar">
            <IconButton aria-label="Close drawer" className="ai-drawer-close-btn" onClick={onCloseDrawer}>✕</IconButton>
          </div>
          <AIChatPanel
            messages={aiMessages}
            loading={chatLoading}
            input={chatInput}
            onInputChange={setChatInput}
            onSubmit={handleChatSubmit}
            placeholder="Ask about this book, its argument, historical context, or place in redemptive history…"
            onClear={() => setAiMessages([])}
          />
        </div>
      )}
    </>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ series, onChange, drawerOpen, onOpenDrawer, onCloseDrawer }) {
  const [aiLoading, setAiLoading] = useState(null); // "bigidea" | "overview"
  const [aiMessages, setAiMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  async function generateBigIdea() {
    if (!series.passage_range && !series.title) return;
    setAiLoading("bigidea");
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: `Series title: "${series.title}"\nPassage: ${series.passage_range || "not specified"}\nExisting overview: ${series.overview || "none yet"}\n\nWrite a single, compelling series Big Idea sentence — the central truth this series will hammer home. Make it sharp and memorable. Return only the sentence.` }],
        "You are a sermon series planning assistant. You help pastors craft focused, theologically precise series concepts."
      );
      if (resp?.trim()) onChange("big_idea", resp.trim());
    } catch (e) {
      console.error("[generateBigIdea]", e);
    } finally {
      setAiLoading(null);
    }
  }

  async function generateOverview() {
    if (!series.title && !series.passage_range) return;
    setAiLoading("overview");
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: `I am planning a sermon series titled "${series.title}" covering ${series.passage_range || "a biblical passage"}.\nBig Idea: ${series.big_idea || "not yet set"}\n\nWrite a 2-paragraph overview:\n1. The historical/literary context and purpose of this passage in Scripture\n2. Why this passage is urgently relevant to a contemporary congregation\n\nBe theologically substantive. Write as if for a pastor's own notes.` }],
        "You are a biblical scholar and preaching consultant helping a pastor develop a sermon series."
      );
      if (resp?.trim()) onChange("overview", resp.trim());
    } catch (e) {
      console.error("[generateOverview]", e);
    } finally {
      setAiLoading(null);
    }
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const context = `Series: "${series.title}" | Passage: ${series.passage_range || "—"} | Big Idea: ${series.big_idea || "—"} | Canon: ${series.canon_category || "—"}`;
      const resp = await sendAIMessage(newMessages, `You are helping a pastor plan a sermon series. Current series context: ${context}. Answer questions about the passage, theme, structure, or anything related to planning this series.`);
      setAiMessages([...newMessages, { role: "assistant", content: resp }]);
    } catch (e) {
      console.error("[OverviewTab chat]", e);
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      <div style={{ height: "100%", padding: "28px 32px", overflowY: "auto" }}>

        {/* Title + description */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Series Title</label>
          <input
            style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: "18px", marginBottom: "10px" }}
            value={series.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. The Gospel of Luke: Reintroducing Jesus"
          />
          <label style={labelStyle}>Short Description <span style={{ color: "var(--ink-ghost)", fontWeight: 400 }}>(tagline or subtitle)</span></label>
          <input
            style={inputStyle}
            value={series.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="A one-line description for the congregation or your own notes…"
          />
        </div>

        {/* Row: color + canon + status + year */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Color</label>
            <select style={selectStyle} value={series.color || "gold"} onChange={(e) => onChange("color", e.target.value)}>
              {COLOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Biblical Category</label>
            <select style={selectStyle} value={series.canon_category || ""} onChange={(e) => onChange("canon_category", e.target.value)}>
              {CANON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={selectStyle} value={series.status || SERIES_STATUS.InProgress} onChange={(e) => onChange("status", e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Year</label>
            <input
              type="number"
              style={inputStyle}
              value={series.year || new Date().getFullYear()}
              onChange={(e) => onChange("year", parseInt(e.target.value, 10))}
              min="2000"
              max="2100"
            />
          </div>
        </div>

        {/* Passage range + dates */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Passage Range</label>
            <input
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
              value={series.passage_range || ""}
              onChange={(e) => onChange("passage_range", e.target.value)}
              placeholder="e.g. Luke 1:1–24:53"
            />
          </div>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" style={inputStyle} value={series.start_date || ""} onChange={(e) => onChange("start_date", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" style={inputStyle} value={series.end_date || ""} onChange={(e) => onChange("end_date", e.target.value)} />
          </div>
        </div>

        {/* Big Idea */}
        <div style={{ marginBottom: "20px" }}>
          {/* Working hypothesis from Book Study — read-only, shown when both fields have content */}
          {series.emerging_big_idea?.trim() && series.big_idea?.trim() && (
            <>
              <div style={{
                padding: "10px 14px", marginBottom: "10px",
                background: "var(--parchment-warm)",
                border: "1px solid var(--parchment-deep)",
                borderRadius: "var(--radius)",
              }}>
                <div style={{ ...labelStyle, marginBottom: "4px" }}>Working hypothesis from Book Study</div>
                <div style={{
                  fontSize: "14px", fontFamily: "'Crimson Pro', serif",
                  color: "var(--ink-soft)", fontStyle: "italic", lineHeight: "1.6",
                }}>
                  {series.emerging_big_idea}
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--parchment-deep)", marginBottom: "10px" }} />
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Series Big Idea</label>
            <SecondaryButton
              size="sm"
              onClick={generateBigIdea}
              disabled={aiLoading === "bigidea"}
            >
              {aiLoading === "bigidea" ? "Thinking…" : "✦ Generate"}
            </SecondaryButton>
          </div>
          <input
            style={inputStyle}
            value={series.big_idea || ""}
            onChange={(e) => onChange("big_idea", e.target.value)}
            placeholder="The controlling idea of the entire series in one sentence."
          />
        </div>

        {/* Overview */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Series Overview</label>
            <SecondaryButton
              size="sm"
              onClick={generateOverview}
              disabled={aiLoading === "overview"}
            >
              {aiLoading === "overview" ? "Thinking…" : "✦ Generate"}
            </SecondaryButton>
          </div>
          <textarea
            style={{ ...textareaStyle }}
            rows={3}
            value={series.overview || ""}
            onChange={(e) => onChange("overview", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder="The theological arc of this series — where it starts, where it goes, what it asks of the congregation."
          />
        </div>

      </div>

      {drawerOpen && (
        <div className="ai-drawer open">
          <div className="ai-drawer-close-bar">
            <IconButton aria-label="Close drawer" className="ai-drawer-close-btn" onClick={onCloseDrawer}>✕</IconButton>
          </div>
          <AIChatPanel
            messages={aiMessages}
            loading={chatLoading}
            input={chatInput}
            onInputChange={setChatInput}
            onSubmit={handleChatSubmit}
            placeholder="Ask about this passage or series theme…"
            onClear={() => setAiMessages([])}
          />
        </div>
      )}
    </>
  );
}

// ── Structure Tab ─────────────────────────────────────────────────────────────
function StructureTab({ series, sections, onChange, onSectionsChange, seriesId, drawerOpen, onOpenDrawer, onCloseDrawer }) {
  const [aiLoading, setAiLoading] = useState(null);
  const [aiMessages, setAiMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const persistSection = useCallback(async (id, fields) => {
    await updateSection(id, fields);
  }, []);
  const debouncedSectionSave = useDebounce(persistSection, 800);

  async function generateOutline() {
    if (!series.passage_range && !series.title) return;
    setAiLoading("outline");
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: `Build a detailed structural/exegetical outline for ${series.passage_range || series.title}. Include major divisions, subdivisions, and key passage markers. Format as a traditional Roman numeral / letter / number outline. Be thorough.` }],
        "You are a biblical scholar providing a structural outline of a biblical passage for sermon series planning."
      );
      if (resp?.trim()) onChange("structural_outline", resp.trim());
    } catch (e) {
      console.error("[generateOutline]", e);
    } finally {
      setAiLoading(null);
    }
  }

  async function addSection() {
    const id = await createSection({ series_id: seriesId, sort_order: sections.length });
    const updated = await getSectionsBySeries(seriesId);
    onSectionsChange(updated);
    setExpandedSection(id);
  }

  function handleSectionField(id, field, value) {
    onSectionsChange(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    debouncedSectionSave(id, { [field]: value });
  }

  async function handleDeleteSection(id) {
    await deleteSection(id);
    onSectionsChange(prev => prev.filter(s => s.id !== id));
    if (expandedSection === id) setExpandedSection(null);
  }

  async function moveSection(id, direction) {
    const idx = sections.findIndex(s => s.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const reordered = [...sections];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    onSectionsChange(reordered);
    await Promise.all(reordered.map((s, i) => updateSection(s.id, { sort_order: i })));
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const context = `Series: "${series.title}" | Passage: ${series.passage_range || "—"}`;
      const resp = await sendAIMessage(newMessages, `You are helping a pastor plan the structure of a sermon series. Context: ${context}. Help with passage divisions, thematic organization, grammatical structure, and section planning.`);
      setAiMessages([...newMessages, { role: "assistant", content: resp }]);
    } catch (e) {
      console.error("[StructureTab chat]", e);
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      <div style={{ height: "100%", padding: "28px 32px", overflowY: "auto" }}>

        {/* Structural Outline */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Structural Outline</label>
            <SecondaryButton size="sm" onClick={generateOutline} disabled={aiLoading === "outline"}>
              {aiLoading === "outline" ? "Thinking…" : "✦ Generate"}
            </SecondaryButton>
          </div>
          <p style={{ fontSize: "13px", color: "var(--ink-ghost)", marginBottom: "8px" }}>
            Build this yourself, paste from a commentary, or generate with AI.
          </p>
          <textarea
            style={{ ...textareaStyle, fontFamily: "'Crimson Pro', serif", fontSize: "14px" }}
            rows={5}
            value={series.structural_outline || ""}
            onChange={(e) => onChange("structural_outline", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder={"I. Major Division (1:1–3:21)\n   A. Sub-section (1:1-25)\n      1. Point\n      2. Point\n   B. Sub-section (1:26-38)"}
          />
        </div>

        {/* Sections */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: "600", color: "var(--ink)" }}>
                Series Sections
              </h3>
              <p style={{ fontSize: "13px", color: "var(--ink-ghost)", marginTop: "2px" }}>
                Optional. Use for longer books with natural major divisions.
              </p>
            </div>
            <SecondaryButton size="sm" onClick={addSection}>+ Add Section</SecondaryButton>
          </div>

          {sections.length === 0 ? (
            <div style={{ padding: "24px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "14px" }}>
              No sections yet. Add sections if this book has natural major divisions (e.g., Luke's four movements).
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sections.map((section, idx) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  index={idx}
                  total={sections.length}
                  expanded={expandedSection === section.id}
                  onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  onChange={(field, value) => handleSectionField(section.id, field, value)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onMove={(dir) => moveSection(section.id, dir)}
                  series={series}
                  onSectionAI={(text) => setAiMessages(prev => [...prev, { role: "user", content: text }])}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="ai-drawer open">
          <div className="ai-drawer-close-bar">
            <IconButton aria-label="Close drawer" className="ai-drawer-close-btn" onClick={onCloseDrawer}>✕</IconButton>
          </div>
          <AIChatPanel
            messages={aiMessages}
            loading={chatLoading}
            input={chatInput}
            onInputChange={setChatInput}
            onSubmit={handleChatSubmit}
            placeholder="Ask about passage divisions, structure, or thematic organization…"
            onClear={() => setAiMessages([])}
          />
        </div>
      )}
    </>
  );
}

function SectionEditor({ section, index, total, expanded, onToggle, onChange, onDelete, onMove, series, onSectionAI }) {
  return (
    <div style={{ border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", background: "var(--white)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", cursor: "pointer" }} onClick={onToggle}>
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px", width: "16px", textAlign: "center" }}>{index + 1}</span>
        <span style={{ flex: 1, fontFamily: "'Playfair Display', serif", fontSize: "14px", color: section.title ? "var(--ink)" : "var(--ink-ghost)", fontStyle: section.title ? "normal" : "italic" }}>
          {section.title || "Untitled Section"}
        </span>
        {section.passage_range && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--ink-soft)" }}>{section.passage_range}</span>
        )}
        <div style={{ display: "flex", gap: "2px" }}>
          {index > 0 && <IconButton aria-label="Move section up" onClick={(e) => { e.stopPropagation(); onMove(-1); }} style={iconBtnStyle} title="Move up">↑</IconButton>}
          {index < total - 1 && <IconButton aria-label="Move section down" onClick={(e) => { e.stopPropagation(); onMove(1); }} style={iconBtnStyle} title="Move down">↓</IconButton>}
          <DeleteButton small onDelete={onDelete} />
        </div>
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div style={{ padding: "14px", borderTop: "1px solid var(--parchment-deep)", display: "flex", flexDirection: "column", gap: "12px", background: "var(--parchment-warm)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Section Title</label>
              <input style={inputStyle} value={section.title || ""} onChange={(e) => onChange("title", e.target.value)} placeholder="e.g. Seeing Jesus Through Others' Eyes" />
            </div>
            <div>
              <label style={labelStyle}>Passage Range</label>
              <input style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} value={section.passage_range || ""} onChange={(e) => onChange("passage_range", e.target.value)} placeholder="e.g. 1:1–4:13" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Section Big Idea</label>
            <input style={inputStyle} value={section.big_idea || ""} onChange={(e) => onChange("big_idea", e.target.value)} placeholder="The central truth of this section" />
          </div>
          <div>
            <label style={labelStyle}>Section Overview</label>
            <textarea
              style={{ ...textareaStyle }}
              rows={3}
              value={section.overview || ""}
              onChange={(e) => onChange("overview", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="What does this section of the book accomplish? What shift happens here?"
            />
          </div>
          <SecondaryButton
            size="sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => onSectionAI(`Help me write a big idea and overview for this section of ${series.passage_range || series.title}: "${section.title || "untitled section"}" covering ${section.passage_range || "unspecified passage"}.`)}
          >
            ✦ Ask AI about this section
          </SecondaryButton>
        </div>
      )}
    </div>
  );
}

// ── Sermon Slots Tab ──────────────────────────────────────────────────────────
function SlotsTab({ series, sections, sermons, seriesId, onSermonsChange, onOpenSermon, drawerOpen, onOpenDrawer, onCloseDrawer }) {
  const [aiMessages, setAiMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Draft slots — UI-only rows that have not yet been committed to the spine.
  // State Contract #3 forbids createSermon({ name: "" }), so the "+ Add Slot"
  // button creates a row in this local state instead of immediately calling
  // the spine. The row commits (createSermon + replace draft with real id) on
  // first non-empty-name blur/Enter, or when the user clicks Open.
  const [drafts, setDrafts] = useState([]);
  const [draftErrors, setDraftErrors] = useState({});
  const isDraftId = (id) => typeof id === "string" && id.startsWith("draft-");

  const persistSlot = useCallback(async (id, fields) => {
    await updateSermon(id, fields);
  }, []);
  const debouncedSlotSave = useDebounce(persistSlot, 800);

  // Called by SlotRow Assist buttons — sends message to AI, adds response to chat panel.
  async function handleSlotAI(messageContent) {
    const userMsg = { role: "user", content: messageContent };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setChatLoading(true);
    try {
      const resp = await sendAIMessage(
        newMessages,
        `You are helping a pastor write study guide notes for a sermon series titled "${series.title || "this series"}". Write for a congregation member — clear, warm, and connected to the series arc.`
      );
      setAiMessages([...newMessages, { role: "assistant", content: resp }]);
    } catch (e) {
      console.error("[handleSlotAI]", e);
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  // No spine call — the row exists only in local draft state until the user
  // types a non-empty name. State Contract #3 stays structurally enforced at
  // the spine boundary; this just defers when the IPC call fires so no
  // nameless atom ever reaches it.
  function addSlot(sectionId = null) {
    const id = `draft-${crypto.randomUUID()}`;
    setDrafts(prev => [...prev, {
      id,
      _draft: true,
      series_id: seriesId,
      section_id: sectionId,
      title: "",
      passage: "",
      date: "",
      stage: SERMON_STATUS.InProgress,
    }]);
  }

  // Commit a draft row to the spine. Called on title blur/Enter (with
  // non-empty name) and from the Open button. Returns the new sermon id on
  // success, null if there's nothing to commit (empty name) or commit failed.
  // On failure, surfaces an inline error on the row and keeps the draft so
  // the user can retry.
  async function commitDraft(draftId) {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return null;
    const name = draft.title?.trim();
    if (!name) return null;
    setDraftErrors(prev => {
      if (!(draftId in prev)) return prev;
      const next = { ...prev };
      delete next[draftId];
      return next;
    });
    try {
      const result = await createSermon({
        name,
        series_id: draft.series_id,
        section_id: draft.section_id,
        passage: draft.passage || "",
        date: draft.date || "",
        is_one_off: 0,
      });
      const newId = result.id;
      // create-sermon doesn't accept study_guide_note; if the user typed one
      // before committing, follow up with an updateSermon write.
      if (draft.study_guide_note?.trim?.()) {
        await updateSermon(newId, { study_guide_note: draft.study_guide_note });
      }
      const realSlot = {
        id: newId,
        series_id: draft.series_id,
        section_id: draft.section_id,
        title: name,
        passage: draft.passage || "",
        date: draft.date || "",
        stage: SERMON_STATUS.InProgress,
        ...(draft.study_guide_note ? { study_guide_note: draft.study_guide_note } : {}),
      };
      onSermonsChange(prev => [...prev, realSlot]);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      return newId;
    } catch (e) {
      console.error("[commitDraft]", e);
      setDraftErrors(prev => ({ ...prev, [draftId]: e?.message || "Could not create the sermon." }));
      return null;
    }
  }

  function handleSlotField(id, field, value) {
    if (isDraftId(id)) {
      setDrafts(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
      return;
    }
    onSermonsChange(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    debouncedSlotSave(id, { [field]: value });
  }

  function clearDraftError(id) {
    setDraftErrors(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleDeleteSlot(id) {
    if (isDraftId(id)) {
      setDrafts(prev => prev.filter(s => s.id !== id));
      clearDraftError(id);
      return;
    }
    await deleteSermon(id);
    onSermonsChange(prev => prev.filter(s => s.id !== id));
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const context = `Series: "${series.title}" | Passage: ${series.passage_range || "—"} | Existing slots: ${sermons.map(s => s.passage || s.title).filter(Boolean).join(", ") || "none yet"}`;
      const resp = await sendAIMessage(newMessages, `You are helping a pastor divide a biblical book into sermon-sized units. Context: ${context}. Suggest natural passage breaks, sermon titles, and big ideas. Be specific about verse ranges.`);
      setAiMessages([...newMessages, { role: "assistant", content: resp }]);
    } catch (e) {
      console.error("[SlotsTab chat]", e);
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  // Group sermons by section. Drafts merge in alongside committed sermons
  // so they render in the right place and order; downstream surfaces (Calendar
  // tab, etc.) read from `sermons` directly so drafts never leak past the
  // SlotsTab boundary.
  const allSlots = [...sermons, ...drafts];
  const unassigned = allSlots.filter(s => !s.section_id);
  const bySectionId = {};
  for (const sermon of allSlots) {
    if (sermon.section_id) {
      bySectionId[sermon.section_id] = bySectionId[sermon.section_id] || [];
      bySectionId[sermon.section_id].push(sermon);
    }
  }

  return (
    <>
      <div style={{ height: "100%", padding: "28px 32px", overflowY: "auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: "600", color: "var(--ink)" }}>
              Sermon Slots
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-ghost)", marginTop: "2px" }}>
              {allSlots.length} slot{allSlots.length !== 1 ? "s" : ""} planned
            </p>
          </div>
          {sections.length === 0 && (
            <PrimaryButton size="sm" onClick={() => addSlot(null)}>+ Add Slot</PrimaryButton>
          )}
        </div>

        {sections.length > 0 ? (
          // Organized by section
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {sections.map((section) => (
              <div key={section.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: "600", color: "var(--ink-soft)" }}>
                      {section.title || "Untitled Section"}
                    </h4>
                    {section.passage_range && (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--ink-ghost)" }}>
                        {section.passage_range}
                      </span>
                    )}
                  </div>
                  <SecondaryButton size="sm" onClick={() => addSlot(section.id)}>+ Add Slot</SecondaryButton>
                </div>
                <SlotList
                  slots={bySectionId[section.id] || []}
                  onChange={handleSlotField}
                  onDelete={handleDeleteSlot}
                  onCommit={commitDraft}
                  draftErrors={draftErrors}
                  onClearError={clearDraftError}
                  onOpenSermon={onOpenSermon}
                  seriesId={seriesId}
                  series={series}
                  totalSlots={allSlots.length}
                  sectionBigIdea={section.big_idea || ""}
                  onSlotAI={handleSlotAI}
                />
              </div>
            ))}

            {/* Unassigned */}
            {unassigned.length > 0 && (
              <div>
                <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: "600", color: "var(--ink-ghost)", marginBottom: "10px" }}>
                  Unassigned
                </h4>
                <SlotList slots={unassigned} onChange={handleSlotField} onDelete={handleDeleteSlot} onCommit={commitDraft} draftErrors={draftErrors} onClearError={clearDraftError} onOpenSermon={onOpenSermon} seriesId={seriesId} series={series} totalSlots={allSlots.length} sectionBigIdea="" onSlotAI={handleSlotAI} />
              </div>
            )}
          </div>
        ) : (
          // Flat list
          <SlotList
            slots={allSlots}
            onChange={handleSlotField}
            onDelete={handleDeleteSlot}
            onCommit={commitDraft}
            draftErrors={draftErrors}
            onClearError={clearDraftError}
            showAdd
            onAdd={() => addSlot(null)}
            onOpenSermon={onOpenSermon}
            seriesId={seriesId}
            series={series}
            totalSlots={allSlots.length}
            sectionBigIdea=""
            onSlotAI={handleSlotAI}
          />
        )}
      </div>

      {drawerOpen && (
        <div className="ai-drawer open">
          <div className="ai-drawer-close-bar">
            <IconButton aria-label="Close drawer" className="ai-drawer-close-btn" onClick={onCloseDrawer}>✕</IconButton>
          </div>
          <AIChatPanel
            messages={aiMessages}
            loading={chatLoading}
            input={chatInput}
            onInputChange={setChatInput}
            onSubmit={handleChatSubmit}
            placeholder={`"How many weeks for Galatians?" or "Divide ${series.passage_range || 'this passage'} into 6 units"…`}
            onClear={() => setAiMessages([])}
          />
        </div>
      )}
    </>
  );
}

function SlotList({ slots, onChange, onDelete, onCommit, draftErrors, onClearError, showAdd, onAdd, onOpenSermon, seriesId, series, totalSlots, sectionBigIdea, onSlotAI }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {slots.length === 0 && (
        <div style={{ padding: "16px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "13px" }}>
          No slots yet.
        </div>
      )}
      {slots.map((slot, idx) => (
        <SlotRow
          key={slot.id}
          slot={slot}
          index={idx}
          onChange={onChange}
          onDelete={onDelete}
          onCommit={onCommit}
          commitError={draftErrors?.[slot.id]}
          onClearError={onClearError}
          onOpenSermon={onOpenSermon}
          seriesId={seriesId}
          series={series}
          totalSlots={totalSlots}
          sectionBigIdea={sectionBigIdea}
          onSlotAI={onSlotAI}
        />
      ))}
      {showAdd && (
        <SecondaryButton size="sm" onClick={onAdd} style={{ alignSelf: "flex-start", marginTop: "4px" }}>
          + Add Slot
        </SecondaryButton>
      )}
    </div>
  );
}

function SlotRow({ slot, index, onChange, onDelete, onCommit, commitError, onClearError, onOpenSermon, seriesId, series, totalSlots, sectionBigIdea, onSlotAI }) {
  const [expanded, setExpanded] = useState(!slot.title && !slot.passage);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistResponse, setAssistResponse] = useState(null);
  const isDraft = !!slot._draft;

  // Commit a draft when the user signals "I'm done with the title": blur the
  // title input, press Enter in it, or click Open. No-op for committed slots.
  function maybeCommit() {
    if (!isDraft) return Promise.resolve(slot.id);
    if (!slot.title?.trim()) return Promise.resolve(null);
    return Promise.resolve(onCommit?.(slot.id) ?? null);
  }

  async function handleOpen(e) {
    e.stopPropagation();
    const id = isDraft ? await maybeCommit() : slot.id;
    if (!id) return;
    onOpenSermon(id, "series-planner", seriesId);
  }

  async function handleAssist(e) {
    e.stopPropagation();
    if (assistLoading) return;
    const parts = [
      `Sermon ${index + 1} of ${totalSlots}: ${slot.passage || "passage TBD"}${slot.title ? ` — "${slot.title}"` : ""}`,
      series?.big_idea   ? `Series big idea: ${series.big_idea}`           : null,
      sectionBigIdea     ? `Section big idea: ${sectionBigIdea}`           : null,
      series?.series_motivation ? `Pastoral motivation for this series: ${series.series_motivation}` : null,
    ].filter(Boolean).join("\n");
    const message = `${parts}\n\nWrite one or two sentences orienting a reader to how this sermon participates in the series arc. Write for a congregation member, not a scholar. Connect it to the series big idea.`;
    setAssistLoading(true);
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: message }],
        `You are helping a pastor write study guide notes for a sermon series titled "${series?.title || "this series"}". Write for a congregation member — clear, warm, and connected to the series arc.`
      );
      setAssistResponse(resp);
    } catch (e) {
      setAssistResponse(`Error: ${e.message}`);
    } finally {
      setAssistLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", background: "var(--white)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px", width: "16px" }}>{index + 1}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-soft)", minWidth: "90px" }}>
          {slot.passage || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "'Crimson Pro', serif" }}>No passage</span>}
        </span>
        <span style={{ flex: 1, fontSize: "14px", color: slot.title ? "var(--ink)" : "var(--ink-ghost)", fontStyle: slot.title ? "normal" : "italic" }}>
          {slot.title || "Untitled"}
        </span>
        {slot.date && (
          <span style={{ fontSize: "12px", color: "var(--ink-ghost)" }}>{formatDate(slot.date)}</span>
        )}
        {onOpenSermon && (
          <SecondaryButton
            size="sm"
            onClick={handleOpen}
            disabled={isDraft && !slot.title?.trim()}
            title={isDraft && !slot.title?.trim() ? "Type a title first" : undefined}
            style={{ fontSize: "12px", padding: "3px 10px" }}
          >
            Open
          </SecondaryButton>
        )}
        <DeleteButton small onDelete={() => onDelete(slot.id)} />
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--parchment-deep)", background: "var(--parchment-warm)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Passage</label>
            <input
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
              value={slot.passage || ""}
              onChange={(e) => onChange(slot.id, "passage", e.target.value)}
              placeholder="e.g. Luke 1:1-4"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label style={labelStyle}>Working Title</label>
            <input
              style={inputStyle}
              value={slot.title || ""}
              onChange={(e) => onChange(slot.id, "title", e.target.value)}
              onBlur={() => { if (isDraft && slot.title?.trim()) onCommit?.(slot.id); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isDraft && slot.title?.trim()) {
                  e.preventDefault();
                  onCommit?.(slot.id);
                }
              }}
              placeholder="e.g. Through the Eyes of Luke"
              onClick={(e) => e.stopPropagation()}
            />
            {commitError && (
              <div style={{ marginTop: "6px" }}>
                <InlineError onDismiss={() => onClearError?.(slot.id)}>{commitError}</InlineError>
              </div>
            )}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Study Guide Note</label>
              <SecondaryButton
                size="sm"
                onClick={handleAssist}
                disabled={assistLoading}
              >
                {assistLoading ? "Thinking…" : "Assist"}
              </SecondaryButton>
            </div>
            <textarea
              style={{ ...textareaStyle }}
              rows={3}
              value={slot.study_guide_note || ""}
              onChange={(e) => { onChange(slot.id, "study_guide_note", e.target.value); }}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="Orient the congregation reader — how does this sermon fit the series arc? What should they be watching for?"
              onClick={(e) => e.stopPropagation()}
            />
            <InlineAIResponse
              fieldName="Study Guide Note"
              response={assistResponse}
              loading={assistLoading && !assistResponse}
              onDismiss={() => setAssistResponse(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────
function CalendarTab({ series, sections, sermons, calNotes, onChange, onSermonsChange, drawerOpen, onOpenDrawer, onCloseDrawer }) {
  const [aiMessages, setAiMessages] = useState([]);
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [schedule, setSchedule]     = useState([]); // [{sermonId, date}]
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [calendarSaveMsg, setCalendarSaveMsg] = useState(""); // "" | "saved" | "error"

  const excludeDates = calNotes.map(n => n.date);

  // Always initialise schedule from current sermon dates so manual edits have
  // something to update and the Save button is always available.
  useEffect(() => {
    if (sermons.length === 0) return;
    setSchedule(sermons.map(s => ({ sermonId: s.id, date: s.date || "" })));
  }, [sermons]);

  function suggestSundays() {
    if (!series.start_date || sermons.length === 0) return;
    const sundays = getUpcomingSundays(series.start_date, sermons.length, excludeDates);
    const newSchedule = sermons.map((s, i) => ({ sermonId: s.id, date: sundays[i] || "" }));
    setSchedule(newSchedule);
  }

  function handleDateChange(sermonId, date) {
    setSchedule(prev => prev.map(s => s.sermonId === sermonId ? { ...s, date } : s));
  }

  function skipSunday(sermonId) {
    // Find current date for this slot, advance by one week
    const entry = schedule.find(s => s.sermonId === sermonId);
    if (!entry?.date) return;
    const d = new Date(entry.date + "T00:00:00");
    d.setDate(d.getDate() + 7);
    const next = toDateString(d);
    handleDateChange(sermonId, next);
  }

  async function applySchedule() {
    setCalendarSaving(true);
    setCalendarSaveMsg("");
    try {
      await Promise.all(
        schedule.map(({ sermonId, date }) => updateSermon(sermonId, { date }))
      );
      onSermonsChange(prev => prev.map(s => {
        const entry = schedule.find(e => e.sermonId === s.id);
        return entry ? { ...s, date: entry.date } : s;
      }));
      // Update series end_date from last slot
      const lastDate = [...schedule].sort((a, b) => (a.date > b.date ? 1 : -1)).pop()?.date;
      if (lastDate) onChange("end_date", lastDate);
      setCalendarSaveMsg("saved");
      setTimeout(() => setCalendarSaveMsg(""), 2000);
    } catch (e) {
      console.error("[applySchedule]", e);
      setCalendarSaveMsg("error");
    } finally {
      setCalendarSaving(false);
    }
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const scheduleContext = schedule.map((entry, i) => {
        const sermon = sermons.find(s => s.id === entry.sermonId);
        const season = entry.date ? getSeasonForDate(entry.date) : null;
        return `${i + 1}. ${sermon?.passage || "—"} "${sermon?.title || "Untitled"}" — ${entry.date ? formatDate(entry.date) : "unscheduled"}${season ? ` (${season.shortName})` : ""}`;
      }).join("\n");
      const noteContext = calNotes.length > 0 ? `\nCalendar notes (special dates): ${calNotes.map(n => `${n.date}: ${n.label}`).join(", ")}` : "";
      const resp = await sendAIMessage(
        newMessages,
        `You are helping a pastor schedule a sermon series. Series: "${series.title}" starting ${series.start_date || "TBD"}.\nCurrent schedule:\n${scheduleContext}${noteContext}\n\nAdvise on scheduling adjustments. If the pastor asks to skip a week or rearrange slots, explain what the adjusted schedule would look like (list it out). Do not modify anything — just advise clearly.`
      );
      setAiMessages([...newMessages, { role: "assistant", content: resp }]);
    } catch (e) {
      console.error("[CalendarTab chat]", e);
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  const sermonMap = Object.fromEntries(sermons.map(s => [s.id, s]));

  return (
    <>
      <div style={{ height: "100%", padding: "28px 32px", overflowY: "auto" }}>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Series Start Date</label>
            <input
              type="date"
              style={inputStyle}
              value={series.start_date || ""}
              onChange={(e) => onChange("start_date", e.target.value)}
            />
          </div>
          <PrimaryButton
            size="sm"
            onClick={suggestSundays}
            disabled={!series.start_date || sermons.length === 0}
          >
            Suggest Sundays ({sermons.length} slots)
          </PrimaryButton>
          <SecondaryButton size="sm" onClick={applySchedule} disabled={calendarSaving}>
            {calendarSaving ? "Saving…" : "✓ Save Dates"}
          </SecondaryButton>
          {calendarSaveMsg === "saved" && (
            <span style={{ fontSize: "12px", color: "var(--sage)" }}>Dates saved</span>
          )}
          {calendarSaveMsg === "error" && (
            <span style={{ fontSize: "12px", color: "var(--crimson-soft)" }}>Save failed</span>
          )}
        </div>

        {sermons.length === 0 ? (
          <div style={{ padding: "32px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "14px" }}>
            Add sermon slots in the Sermon Slots tab first.
          </div>
        ) : (
          <>
            {/* Schedule list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sermons.map((sermon, idx) => {
                const entry = schedule.find(s => s.sermonId === sermon.id);
                const date  = entry?.date || sermon.date || "";
                const season = date ? getSeasonForDate(date) : null;
                const note  = calNotes.find(n => n.date === date);

                return (
                  <div key={sermon.id} style={{
                    display: "grid", gridTemplateColumns: "24px 1fr 1fr auto auto",
                    alignItems: "center", gap: "12px",
                    padding: "10px 14px",
                    background: "var(--white)",
                    border: "1px solid var(--parchment-deep)",
                    borderRadius: "var(--radius)",
                  }}>
                    <span style={{ fontSize: "12px", color: "var(--ink-ghost)", textAlign: "center" }}>{idx + 1}</span>
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--ink)", fontFamily: "'Playfair Display', serif", lineHeight: "1.2" }}>
                        {sermon.title || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Untitled</span>}
                      </div>
                      {sermon.passage && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--ink-soft)", marginTop: "2px" }}>
                          {sermon.passage}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <input
                        type="date"
                        style={{ ...inputStyle, fontSize: "13px", padding: "5px 8px" }}
                        value={date}
                        onChange={(e) => handleDateChange(sermon.id, e.target.value)}
                      />
                      {note && (
                        <span style={{ fontSize: "11px", color: "var(--crimson-soft)" }}>⚠ {note.label}</span>
                      )}
                    </div>
                    <div>
                      {season && (
                        <span style={{
                          fontSize: "11px", padding: "2px 7px", borderRadius: "10px",
                          background: season.color + "22", color: season.color,
                          border: `1px solid ${season.color}44`,
                          whiteSpace: "nowrap",
                        }}>
                          {season.shortName}
                        </span>
                      )}
                    </div>
                    <IconButton
                      aria-label="Skip one week"
                      onClick={() => skipSunday(sermon.id)}
                      style={iconBtnStyle}
                      title="Skip one week"
                      disabled={!date}
                    >
                      +1wk
                    </IconButton>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <PrimaryButton onClick={applySchedule} disabled={calendarSaving}>
                {calendarSaving ? "Saving…" : "✓ Save All Dates to Sermon Records"}
              </PrimaryButton>
              {calendarSaveMsg === "saved" && (
                <span style={{ fontSize: "12px", color: "var(--sage)" }}>Dates saved</span>
              )}
              {calendarSaveMsg === "error" && (
                <span style={{ fontSize: "12px", color: "var(--crimson-soft)" }}>Save failed</span>
              )}
            </div>
          </>
        )}
      </div>

      {drawerOpen && (
        <div className="ai-drawer open">
          <div className="ai-drawer-close-bar">
            <IconButton aria-label="Close drawer" className="ai-drawer-close-btn" onClick={onCloseDrawer}>✕</IconButton>
          </div>
          <AIChatPanel
            messages={aiMessages}
            loading={chatLoading}
            input={chatInput}
            onInputChange={setChatInput}
            onSubmit={handleChatSubmit}
            placeholder="Ask about scheduling — e.g. 'skip Christmas week' or 'what falls during Holy Week?'"
            onClear={() => setAiMessages([])}
          />
        </div>
      )}
    </>
  );
}

// ── Copy Button (used in AIChatPanel) ────────────────────────────────────────
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
    <IconButton aria-label="Copy AI response" onClick={handleCopy} className="ai-copy-btn" title="Copy response">
      {copied ? "✓ Copied" : "Copy"}
    </IconButton>
  );
}

// ── AI Chat Panel (shared) ────────────────────────────────────────────────────
function AIChatPanel({ messages, loading, input, onInputChange, onSubmit, placeholder, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="aichat-panel" style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--white)", borderLeft: "1px solid var(--parchment-deep)" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--parchment-deep)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          AI Assistant
        </span>
        {messages.length > 0 && (
          <IconButton aria-label="Clear AI conversation" onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--ink-ghost)" }}>
            Clear
          </IconButton>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {messages.length === 0 && (
          <div style={{ color: "var(--ink-ghost)", fontSize: "13px", fontStyle: "italic", textAlign: "center", marginTop: "24px" }}>
            Ask anything about this series…
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "assistant" ? "aichat-msg-assistant" : undefined} style={{
            marginBottom: "12px",
            padding: "10px 12px",
            borderRadius: "var(--radius)",
            background: msg.role === "user" ? "var(--parchment-warm)" : "var(--white)",
            border: msg.role === "assistant" ? "1px solid var(--parchment-deep)" : "none",
            fontSize: "14px",
            lineHeight: "1.6",
            color: msg.role === "assistant" ? "var(--ink)" : "var(--ink-mid)",
            whiteSpace: msg.role === "user" ? "pre-wrap" : undefined,
            position: "relative",
          }}>
            {msg.role === "assistant"
              ? <div className="ai-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              : msg.content}
            {msg.role === "assistant" && <CopyButton text={msg.content} />}
          </div>
        ))}
        {loading && (
          <div style={{ padding: "10px 12px", color: "var(--ink-ghost)", fontSize: "13px", fontStyle: "italic" }}>
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} style={{ padding: "12px 16px", borderTop: "1px solid var(--parchment-deep)" }}>
        <textarea
          style={{
            width: "100%", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)",
            padding: "8px 10px", fontSize: "13px", fontFamily: "'Crimson Pro', serif",
            resize: "none", background: "var(--parchment-warm)", color: "var(--ink)",
            outline: "none", lineHeight: "1.5",
          }}
          rows={2}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onInput={(e) => autoResize(e.target)}
          ref={(el) => autoResize(el)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); }
          }}
        />
        <PrimaryButton
          type="submit"
          size="sm"
          style={{ marginTop: "6px", width: "100%" }}
          disabled={loading || !input.trim()}
        >
          {loading ? "Thinking…" : "Send"}
        </PrimaryButton>
      </form>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  color: "var(--ink-soft)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "5px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid var(--parchment-deep)",
  borderRadius: "var(--radius)",
  padding: "8px 10px",
  fontSize: "14px",
  fontFamily: "'Crimson Pro', serif",
  background: "var(--white)",
  color: "var(--ink)",
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: "1.6",
};

const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-ghost)",
  fontSize: "13px",
  padding: "2px 4px",
};

// ── Series Planner "How this works" modal ──────────────────────────────────────
function SeriesHowItWorksModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--white)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-deep)", padding: "28px 32px",
          maxWidth: "960px", width: "90vw", position: "relative",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <IconButton
          aria-label="Close how-this-works modal"
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-ghost)", fontSize: "18px", lineHeight: 1,
          }}
        >✕</IconButton>
        <h3 style={{
          fontFamily: "'Playfair Display', serif", fontSize: "18px",
          color: "var(--ink)", marginBottom: "6px",
        }}>How the Series Planner works</h3>
        <p style={{
          fontSize: "13px", color: "var(--ink-ghost)",
          marginBottom: "24px", fontFamily: "'Crimson Pro', serif",
        }}>Plan and build a sermon series through five planning stages.</p>
        <div style={{ overflowX: "auto" }}>
          <svg viewBox="0 0 1080 228" style={{ width: "100%", height: "auto", display: "block" }}>

            {/* ── Stage boxes ─────────────────────────────────────────────────── */}
            <rect x="10" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="100" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Book Study</text>

            <rect x="230" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="320" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Overview</text>

            <rect x="450" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="540" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Structure</text>

            <rect x="670" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="760" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Sermon Slots</text>

            <rect x="890" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="980" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Calendar</text>

            {/* ── Between-stage arrows ────────────────────────────────────────── */}
            <text x="210" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>
            <text x="430" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>
            <text x="650" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>
            <text x="870" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>

            {/* ── Stage → first sub-item connectors ───────────────────────────── */}
            <line x1="100" y1="56" x2="100" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="320" y1="56" x2="320" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="540" y1="56" x2="540" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="760" y1="56" x2="760" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="980" y1="56" x2="980" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            {/* ── Book Study sub-items (4) ────────────────────────────────────── */}
            <rect x="10" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Redemptive Context</text>
            <line x1="100" y1="104" x2="100" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Book Background</text>
            <line x1="100" y1="140" x2="100" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Argument &amp; Structure</text>
            <line x1="100" y1="176" x2="100" y2="184" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="184" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Working Big Idea</text>

            {/* ── Overview sub-items (4) ───────────────────────────────────────── */}
            <rect x="230" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="320" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>{"Title & identity"}</text>
            <line x1="320" y1="104" x2="320" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="230" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="320" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>{"Passage & dates"}</text>
            <line x1="320" y1="140" x2="320" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="230" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="320" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Series Big Idea</text>
            <line x1="320" y1="176" x2="320" y2="184" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="230" y="184" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="320" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Series Overview</text>

            {/* ── Structure sub-items (2) ──────────────────────────────────────── */}
            <rect x="450" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="540" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Structural Outline</text>
            <line x1="540" y1="104" x2="540" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="450" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="540" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Series Sections</text>

            {/* ── Sermon Slots sub-items (3) ───────────────────────────────────── */}
            <rect x="670" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="760" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Sermon Slots</text>
            <line x1="760" y1="104" x2="760" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="670" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="760" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Stage: planning</text>
            <line x1="760" y1="140" x2="760" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="670" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="760" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Promote to active</text>

            {/* ── Calendar sub-items (3) ───────────────────────────────────────── */}
            <rect x="890" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="980" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Date assignment</text>
            <line x1="980" y1="104" x2="980" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="890" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="980" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Liturgical seasons</text>
            <line x1="980" y1="140" x2="980" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="890" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="980" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>AI Advisor</text>

          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Study Guide Modal ─────────────────────────────────────────────────────────
function StudyGuideModal({ series, sections, sermons, onClose }) {
  const [exporting, setExporting]     = useState(false);
  const [exportResult, setExportResult] = useState(null); // null | { ok, filepath?, error? }

  async function handleExport() {
    setExporting(true);
    setExportResult(null);
    try {
      const result = await exportStudyGuide(series.id);
      setExportResult(result.success
        ? { ok: true, filepath: result.filepath }
        : { ok: false, error: result.error || "Export failed" }
      );
    } catch (e) {
      setExportResult({ ok: false, error: e.message });
    } finally {
      setExporting(false);
    }
  }


  function SgStatusDot({ value }) {
    const len = value?.trim().length || 0;
    if (len > 100) {
      return (
        <span style={{
          display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
          background: "var(--sage)", flexShrink: 0, marginTop: "4px",
        }} title="Substantive content" />
      );
    } else if (len > 0) {
      return (
        <span style={{
          display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
          border: "2px solid var(--gold)", flexShrink: 0, marginTop: "4px",
        }} title="Brief content" />
      );
    } else {
      return (
        <span style={{
          display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
          border: "2px solid var(--ink-ghost)", flexShrink: 0, marginTop: "4px",
        }} title="Empty" />
      );
    }
  }

  function SgPartHeader({ number, title }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <span style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "24px", height: "24px", borderRadius: "50%",
          background: "var(--gold)", color: "var(--white)",
          fontSize: "12px", fontWeight: "700", fontFamily: "'Crimson Pro', serif",
          flexShrink: 0,
        }}>{number}</span>
        <h3 style={{
          fontFamily: "'Playfair Display', serif", fontSize: "16px",
          fontWeight: "600", color: "var(--ink)", margin: 0,
        }}>{title}</h3>
      </div>
    );
  }

  function SgPartDivider() {
    return <div style={{ borderTop: "1px solid var(--parchment-deep)", margin: "28px 0" }} />;
  }

  function SgSection({ label, value, hint }) {
    const content = value?.trim();
    return (
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
          <SgStatusDot value={value} />
          <span style={{ ...labelStyle, marginBottom: 0 }}>{label}</span>
        </div>
        {content ? (
          <div style={{ paddingLeft: "16px" }}>
            {content.split(/\n+/).filter(p => p.trim()).map((para, i) => (
              <p key={i} style={{
                fontSize: "14px", fontFamily: "'Crimson Pro', serif",
                color: "var(--ink)", lineHeight: "1.7", margin: "0 0 8px",
              }}>
                {para}
              </p>
            ))}
          </div>
        ) : (
          <div style={{ paddingLeft: "16px", fontSize: "13px", fontStyle: "italic", color: "var(--ink-ghost)" }}>
            {hint || "No content yet."}
          </div>
        )}
      </div>
    );
  }

  function SgSlotRow({ sermon, index }) {
    const season = sermon.date ? getSeasonForDate(sermon.date) : null;
    return (
      <div style={{
        marginBottom: "12px", padding: "14px 16px",
        background: "var(--white)", border: "1px solid var(--parchment-deep)",
        borderRadius: "var(--radius)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: sermon.study_guide_note ? "10px" : 0 }}>
          <span style={{ fontSize: "12px", color: "var(--ink-ghost)", width: "18px", flexShrink: 0, marginTop: "2px" }}>{index + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
              {sermon.passage && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-soft)" }}>
                  {sermon.passage}
                </span>
              )}
              {sermon.title && (
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: "600", color: "var(--ink)" }}>
                  {sermon.title}
                </span>
              )}
              {!sermon.passage && !sermon.title && (
                <span style={{ fontStyle: "italic", color: "var(--ink-ghost)", fontSize: "13px" }}>Untitled</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              {sermon.date && (
                <span style={{ fontSize: "12px", color: "var(--ink-ghost)" }}>{formatDate(sermon.date)}</span>
              )}
              {season && (
                <span style={{
                  fontSize: "11px", padding: "1px 6px", borderRadius: "10px",
                  background: season.color + "22", color: season.color,
                  border: `1px solid ${season.color}44`,
                }}>
                  {season.shortName}
                </span>
              )}
            </div>
          </div>
        </div>
        {sermon.study_guide_note && (
          <div style={{ paddingLeft: "28px" }}>
            <p style={{ fontSize: "14px", fontFamily: "'Crimson Pro', serif", color: "var(--ink)", lineHeight: "1.6", margin: 0 }}>
              {sermon.study_guide_note}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--parchment)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-deep)", padding: "28px 32px",
          maxWidth: "760px", width: "90vw", position: "relative",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <IconButton
          aria-label="Close study guide preview"
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-ghost)", fontSize: "18px", lineHeight: 1,
          }}
        >✕</IconButton>

        {/* Header */}
        <div style={{ marginBottom: "24px", paddingRight: "32px" }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "20px",
            fontWeight: "600", color: "var(--ink)", marginBottom: "4px",
          }}>
            Study Guide Preview
          </h2>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-ghost)" }}>
            {series.title}{series.passage_range ? ` — ${series.passage_range}` : ""}
          </div>
        </div>

        {/* Part 1: The Series */}
        <SgPartHeader number="1" title="The Series" />
        <SgSection label="Series Big Idea" value={series.big_idea} hint="Add in Overview → Series Big Idea" />
        <SgSection label="Overview" value={series.overview} hint="Add in Overview → Series Overview" />

        <SgPartDivider />

        {/* Part 2: The Book */}
        <SgPartHeader number="2" title="The Book" />
        <SgSection label="The World of This Book" value={series.book_background} hint="Add in Book Study → The World of This Book" />
        <SgSection label="The Book's Controlling Argument" value={series.book_argument} hint="Add in Book Study → The Book's Controlling Argument" />
        <SgSection label="How the Book Is Built" value={series.book_structure} hint="Add in Book Study → How the Book Is Built" />

        <SgPartDivider />

        {/* Part 3: Where This Fits */}
        <SgPartHeader number="3" title="Where This Fits in the Story" />
        <SgSection label="Redemptive Context" value={series.redemptive_context} hint="Add in Book Study → Where This Book Sits in Redemptive History" />
        {series.emerging_big_idea?.trim() &&
          (series.emerging_big_idea.trim() !== series.big_idea?.trim() || !series.big_idea?.trim()) && (
          <SgSection label="Working Big Idea (from Book Study)" value={series.emerging_big_idea} hint="Add in Book Study → Working Big Idea" />
        )}

        <SgPartDivider />

        {/* Part 4: Why This Series, Why Now */}
        <SgPartHeader number="4" title="Why This Series, Why Now" />
        <SgSection label="Pastoral Motivation" value={series.series_motivation} hint="Add in Book Study → Why This Congregation, Why Now" />

        <SgPartDivider />

        {/* Part 5: The Sermons */}
        <SgPartHeader number="5" title={`The Sermons (${sermons.length})`} />
        {sermons.length === 0 ? (
          <div style={{ fontSize: "13px", fontStyle: "italic", color: "var(--ink-ghost)" }}>
            Add sermon slots in the Sermon Slots tab.
          </div>
        ) : (
          <div>
            {sermons.map((sermon, idx) => (
              <SgSlotRow key={sermon.id} sermon={sermon} index={idx} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--parchment-deep)" }}>
          {exportResult?.ok && (
            <div style={{ fontSize: "12px", color: "var(--sage)", marginBottom: "10px", fontFamily: "'Crimson Pro', serif" }}>
              Saved to: {exportResult.filepath}
            </div>
          )}
          {exportResult && !exportResult.ok && (
            <div style={{ fontSize: "12px", color: "var(--crimson-soft)", marginBottom: "10px", fontFamily: "'Crimson Pro', serif" }}>
              Export failed: {exportResult.error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <SecondaryButton size="sm" onClick={onClose}>Close</SecondaryButton>
            <PrimaryButton onClick={handleExport} disabled={exporting}>
              {exporting ? "Saving…" : "Export to Word"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
