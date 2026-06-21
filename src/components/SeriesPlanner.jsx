import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDebounce } from "../utils/hooks";
import {
  getSeries, updateSeries,
  getSectionsBySeries, createSection, updateSection, deleteSection,
  getSermonsBySeries, createSermon, updateSermon, deleteSermon,
} from "../core/spine";
import { getCalendarNotes, exportStudyGuide } from "../db/database";
import {
  SERIES_STATUS, SERIES_STATUS_LABELS,
  SERMON_STATUS, LOADING_VERB,
} from "../core/contracts";
import { getSeasonForDate, getUpcomingSundays, toDateString } from "../utils/churchCalendar";
import { formatDate, autoResize } from "../utils";
import { buttonKeydown } from "../utils/buttonKeydown";
import DeleteButton from "./DeleteButton";
import InlineError from "./InlineError";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import BackButton from "./primitives/BackButton";
import TextButton from "./primitives/TextButton";
import FeedbackFlag from "./FeedbackFlag";


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
// soloPrompt keys stripped — they were consumed only by the removed AI analyze
// path. The pastor now fills these from his own study; the labels and
// placeholders are the only scaffolding that remains.
const BOOK_STUDY_FIELDS = [
  {
    key: "redemptive_context",
    label: "Where This Book Sits in Redemptive History",
    placeholder: "How does this book fit in the arc from creation to new creation? Where does it land in the story of Israel, the coming of Christ, the mission of the church?",
  },
  {
    key: "book_background",
    label: "The World of This Book",
    placeholder: "Author, audience, occasion, historical setting, genre — what shaped why this book was written and who first received it?",
  },
  {
    key: "book_argument",
    label: "The Book's Controlling Argument",
    placeholder: "What is the author's central claim? What is he trying to prove, teach, or accomplish from beginning to end?",
  },
  {
    key: "book_structure",
    label: "How the Book Is Built",
    placeholder: "Major movements, structural markers, turning points — how does the book progress from its opening to its conclusion?",
  },
  {
    key: "series_motivation",
    label: "Why This Congregation, Why Now",
    placeholder: "What pastoral need, cultural moment, or congregational gap makes this book urgent for this people at this time?",
  },
  {
    key: "emerging_big_idea",
    label: "Working Big Idea",
    placeholder: "A working draft of the central truth this series will drive home — the one thing you want every listener to carry out the door.",
  },
];

// Rich placeholders that replace the generic ones from BOOK_STUDY_FIELDS.
const BOOK_STUDY_PLACEHOLDERS = {
  redemptive_context: "Where does this book sit in the arc from creation to new creation? How does it anticipate or reflect Christ?",
  book_background: "Author, audience, occasion, date, historical setting, literary genre. Paste from a commentary introduction or write your own notes.",
  book_argument: "What is the author's central claim or purpose? What is this book trying to do to its reader?",
  book_structure: "Major movements, structural markers, turning points, chiasms, repeated refrains. How does the shape of the book serve its argument?",
  series_motivation: "What does this congregation need from this book right now? What pastoral urgency drives this series?",
  emerging_big_idea: "A draft of the series big idea — what this book is saying and doing in one sentence. Refine it as you go.",
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function SeriesPlanner({ seriesId, onBack, onOpenSermon, _fixture }) {
  // _fixture — preview seam (mirrors SermonWorkspace's _fixtureSermon). When
  // set, skip the spine reads and seed from the fixture so the planner renders
  // in a browser preview without Electron/SQLite. Never set in production.
  const [series, setSeries]     = useState(_fixture?.series ?? null);
  const [sections, setSections] = useState(_fixture?.sections ?? []);
  const [sermons, setSermons]   = useState(_fixture?.sermons ?? []);
  const [calNotes, setCalNotes] = useState(_fixture?.calNotes ?? []);
  const [activeTab, setActiveTab] = useState(_fixture?.activeTab ?? "book-study");
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loading, setLoading]   = useState(!_fixture);
  const [showHowItWorks, setShowHowItWorks]   = useState(false);
  const [showStudyGuide, setShowStudyGuide]   = useState(false);

  useEffect(() => {
    if (_fixture) return; // preview fixture — no DB reads
    load();
    const saved = localStorage.getItem(`sermonforge_planner_tab_${seriesId}`);
    setActiveTab(saved || "book-study");
  }, [seriesId]);

  // Auto-suggest series complete — Pilot B.3 / Process Contract #2
  // ("movement gated by user evidence"). The user's evidence is clicking
  // the Mark Series Complete button; the suggestion is just visibility.
  // Conditions: every committed (non-draft) child sermon has reached
  // SERMON_STATUS.Complete, the series itself isn't already complete, and
  // there's at least one sermon (don't suggest completion of an empty series).
  const committedSermons = sermons.filter((s) => !s._draft && !s.id?.startsWith?.("draft-"));
  const allChildrenComplete =
    committedSermons.length > 0 &&
    committedSermons.every((s) => s.stage === SERMON_STATUS.Complete);
  const suggestSeriesComplete =
    allChildrenComplete && series?.status !== SERIES_STATUS.Complete;

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
    if (_fixture) return; // preview fixture — no DB writes
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
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>{LOADING_VERB.Loading}</div>
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
      {/* Topbar — always-dark .topbar frame, mirroring SermonWorkspace.
          Left: BackButton (icon) → series color dot → breadcrumb + title.
          Right: save indicator (--topbar-* tokens) → status pill →
          Mark Series Complete → How this works / Study Guide → FeedbackFlag. */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          <BackButton
            variant="icon"
            onClick={onBack}
            title="Back"
            className="btn-icon"
            style={{ flexShrink: 0 }}
          />
          <div style={{
            width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
            background: `var(--${series.color || "gold"})`,
          }} />
          <div className="topbar-left">
            <div className="topbar-series">
              {SERIES_STATUS_LABELS[series.status] || SERIES_STATUS_LABELS[SERIES_STATUS.InProgress]}
            </div>
            <div className="topbar-title">{series.title}</div>
          </div>
        </div>

        <div className="topbar-right">
          {/* These sit on the always-dark topbar — its locally-scoped
              --topbar-* tokens, never the theme ink ramp (var(--ink-ghost)
              was near-invisible here in light mode). */}
          {saving && (
            <span style={{ fontSize: "12px", color: "var(--topbar-fg-muted)", fontStyle: "italic", padding: "0 6px" }}>
              {LOADING_VERB.Saving}
            </span>
          )}
          {!saving && saveError && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
              <span style={{ fontSize: "12px", color: "var(--topbar-danger)" }}>Save failed</span>
              <SecondaryButton size="sm" style={{ fontSize: "12px", padding: "2px 8px" }} onClick={() => persistSeries({})}>
                Retry
              </SecondaryButton>
            </span>
          )}
          {!saving && !saveError && (
            <span style={{ fontSize: "12px", color: "var(--topbar-fg-muted)", padding: "0 6px" }}>
              Saved
            </span>
          )}
          <span style={{
            fontSize: "11px", padding: "3px 10px", borderRadius: "10px",
            background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)",
            color: series.status === SERIES_STATUS.Complete ? "var(--gold)" : "var(--sage)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {SERIES_STATUS_LABELS[series.status] || SERIES_STATUS_LABELS[SERIES_STATUS.InProgress]}
          </span>
          {series.status !== SERIES_STATUS.Complete && (
            <SecondaryButton
              size="sm"
              onClick={() => persistSeries({ status: SERIES_STATUS.Complete })}
              title="Mark this series complete"
              style={{ fontSize: "12px" }}
            >
              Mark Series Complete
            </SecondaryButton>
          )}
          <TextButton onClick={() => setShowHowItWorks(true)}>
            How this works
          </TextButton>
          <TextButton onClick={() => setShowStudyGuide(true)}>
            Study Guide
          </TextButton>
          <FeedbackFlag surface="series-planner" sermonId={null} step={null} />
        </div>
      </div>

      {/* Auto-suggest Mark Series Complete — fires when every committed
          child sermon has reached SERMON_STATUS.Complete. The user's click
          on Mark Series Complete is the explicit evidence; the banner is
          just visibility (Process Contract #2 + the Principle). */}
      {suggestSeriesComplete && (
        <div
          role="status"
          style={{
            background: "var(--parchment-warm)",
            borderBottom: "1px solid var(--parchment-deep)",
            borderLeft: "3px solid var(--gold)",
            padding: "10px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            fontFamily: "var(--font-serif)",
            fontSize: "13px",
            color: "var(--ink-mid)",
          }}
        >
          <span>All sermons in this series are complete. Mark the series complete?</span>
          <PrimaryButton
            size="sm"
            onClick={() => persistSeries({ status: SERIES_STATUS.Complete })}
          >
            Mark Series Complete
          </PrimaryButton>
        </div>
      )}

      {/* Tab bar — the app's .stage-tabs idiom (white bar, gold active
          underline). Each tab is a role="button" div (no raw <button>);
          buttonKeydown gives it Enter/Space activation. */}
      <div className="stage-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={buttonKeydown(() => handleTabChange(tab.id))}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`stage-tab${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Tab content — the parchment body. Each tab renders its own
          .page-body scaffolding. AI drawer props are gone. */}
      <div style={{ flex: 1, overflow: "hidden", background: "var(--parchment)" }}>
        {activeTab === "book-study" && (
          <BookStudyTab
            series={series}
            onChange={handleSeriesField}
          />
        )}
        {activeTab === "overview" && (
          <OverviewTab
            series={series}
            onChange={handleSeriesField}
          />
        )}
        {activeTab === "structure" && (
          <StructureTab
            series={series}
            sections={sections}
            onChange={handleSeriesField}
            onSectionsChange={setSections}
            seriesId={seriesId}
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
// The walk's first stage: the pastor reads the book before he plans the series.
// AI-free — every field is the pastor's own working note, persisted through the
// debounced updateSeries spine via the `onChange` prop the shell owns.
function BookStudyTab({ series, onChange }) {
  return (
    <div className="page-body" style={{ background: "var(--parchment)" }}>

      {/* Section intro — workspace vocabulary */}
      <div className="page-header" style={{ padding: "0 0 4px" }}>
        <div className="page-title">Book Study</div>
        <div className="page-subtitle">
          Read the book before you plan the series. These notes are the soil the
          whole series grows out of.
        </div>
      </div>

      {/* Book identity card — the title the pastor edits, with the read-only
          passage range + canon category chips alongside it. */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label">Series Text</label>
          <input
            className="field-input"
            style={{ fontWeight: 600 }}
            value={series.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Series Text"
          />
          {(series.passage_range || series.canon_category) && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
              {series.passage_range && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "var(--ink-soft)" }}>
                  {series.passage_range}
                </span>
              )}
              {series.canon_category && (
                <span style={{
                  fontSize: "10px", padding: "2px 7px", borderRadius: "10px",
                  background: "var(--parchment-deep)", color: "var(--ink-soft)",
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {series.canon_category}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* The six book-study notes, each bound to a series column and persisted
          through the debounced updateSeries path the shell wires to onChange. */}
      <div className="card" style={{ marginTop: "20px" }}>
        {BOOK_STUDY_FIELDS.map((fieldDef) => (
          <div key={fieldDef.key} className="field-group">
            <label className="field-label">{fieldDef.label}</label>
            <textarea
              className="field-textarea large"
              value={series[fieldDef.key] || ""}
              onChange={(e) => onChange(fieldDef.key, e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder={BOOK_STUDY_PLACEHOLDERS[fieldDef.key] || fieldDef.placeholder}
            />
          </div>
        ))}
      </div>

    </div>
  );
}
// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ series, onChange }) {
  return (
    <div className="page-body">
      <div className="page-header" style={{ padding: 0, marginBottom: "20px" }}>
        <div className="page-title">Overview</div>
        <div className="page-subtitle">
          The identity of the series — its name, its arc, and the one idea it drives home.
        </div>
      </div>

      {/* Title + description */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="field-group">
          <label className="field-label">Series Title</label>
          <input
            className="field-input"
            style={{ fontSize: "18px" }}
            value={series.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. The Gospel of Luke: Reintroducing Jesus"
          />
        </div>
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label">
            Short Description <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(tagline or subtitle)</span>
          </label>
          <input
            className="field-input"
            value={series.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="A one-line description for the congregation or your own notes…"
          />
        </div>
      </div>

      {/* Row: color + canon + status + year */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", gap: "16px" }}>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Color</label>
            <select className="field-input" value={series.color || "gold"} onChange={(e) => onChange("color", e.target.value)}>
              {COLOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Biblical Category</label>
            <select className="field-input" value={series.canon_category || ""} onChange={(e) => onChange("canon_category", e.target.value)}>
              {CANON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Status</label>
            <select className="field-input" value={series.status || SERIES_STATUS.InProgress} onChange={(e) => onChange("status", e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Year</label>
            <input
              type="number"
              className="field-input"
              value={series.year || new Date().getFullYear()}
              onChange={(e) => onChange("year", parseInt(e.target.value, 10))}
              min="2000"
              max="2100"
            />
          </div>
        </div>
      </div>

      {/* Passage range + dates */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px" }}>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Passage Range</label>
            <input
              className="field-input"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              value={series.passage_range || ""}
              onChange={(e) => onChange("passage_range", e.target.value)}
              placeholder="e.g. Luke 1:1–24:53"
            />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Start Date</label>
            <input type="date" className="field-input" value={series.start_date || ""} onChange={(e) => onChange("start_date", e.target.value)} />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">End Date</label>
            <input type="date" className="field-input" value={series.end_date || ""} onChange={(e) => onChange("end_date", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Big Idea */}
      <div className="card" style={{ marginBottom: "20px" }}>
        {/* Working hypothesis from Book Study — read-only, shown when both fields have content */}
        {series.emerging_big_idea?.trim() && series.big_idea?.trim() && (
          <>
            <div style={{
              padding: "10px 14px", marginBottom: "12px",
              background: "var(--parchment-warm)",
              border: "1px solid var(--parchment-deep)",
              borderRadius: "var(--radius)",
            }}>
              <div className="field-label" style={{ marginBottom: "4px" }}>Working hypothesis from Book Study</div>
              <div style={{
                fontSize: "14px", fontFamily: "var(--font-serif)",
                color: "var(--ink-soft)", fontStyle: "italic", lineHeight: "1.6",
              }}>
                {series.emerging_big_idea}
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--parchment-deep)", marginBottom: "12px" }} />
          </>
        )}
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label">Series Big Idea</label>
          <input
            className="field-input"
            value={series.big_idea || ""}
            onChange={(e) => onChange("big_idea", e.target.value)}
            placeholder="The controlling idea of the entire series in one sentence."
          />
        </div>
      </div>

      {/* Overview */}
      <div className="card">
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label">Series Overview</label>
          <textarea
            className="field-textarea"
            rows={3}
            value={series.overview || ""}
            onChange={(e) => onChange("overview", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder="The theological arc of this series — where it starts, where it goes, what it asks of the congregation."
          />
        </div>
      </div>
    </div>
  );
}
// ── Structure Tab ─────────────────────────────────────────────────────────────
// The walk's third stage: the pastor lays out the book's skeleton — a free-form
// structural outline, plus optional major sections for longer books with natural
// divisions. AI-free: the outline is the pastor's own (typed, or pasted from a
// commentary), and every section field persists through the debounced
// updateSection spine. Section CRUD (create/update/delete/reorder) is preserved
// verbatim from the recovered shell.
function StructureTab({ series, sections, onChange, onSectionsChange, seriesId }) {
  const [expandedSection, setExpandedSection] = useState(null);

  const persistSection = useCallback(async (id, fields) => {
    await updateSection(id, fields);
  }, []);
  const debouncedSectionSave = useDebounce(persistSection, 800);

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

  return (
    <div className="page-body">

      {/* Section intro — workspace vocabulary */}
      <div className="page-header" style={{ padding: "0 0 4px" }}>
        <div className="page-title">Structure</div>
        <div className="page-subtitle">
          The skeleton of the book — its major divisions and the shape your series
          will follow through them.
        </div>
      </div>

      {/* Structural Outline */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label">Structural Outline</label>
          <p className="field-caption" style={{ margin: "0 0 8px" }}>
            Build this yourself, or paste from a commentary.
          </p>
          <textarea
            className="field-textarea large"
            rows={5}
            value={series.structural_outline || ""}
            onChange={(e) => onChange("structural_outline", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder={"I. Major Division (1:1–3:21)\n   A. Sub-section (1:1-25)\n      1. Point\n      2. Point\n   B. Sub-section (1:26-38)"}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Series Sections</h3>
            <p className="field-caption" style={{ marginTop: "2px" }}>
              Optional. Use for longer books with natural major divisions.
            </p>
          </div>
          <SecondaryButton size="sm" onClick={addSection}>+ Add Section</SecondaryButton>
        </div>

        {sections.length === 0 ? (
          <div style={{
            padding: "24px",
            background: "var(--parchment-warm)",
            borderRadius: "var(--radius)",
            textAlign: "center",
            color: "var(--ink-ghost)",
            fontSize: "14px",
          }}>
            No sections yet. Add sections if this book has natural major divisions
            (e.g., Luke's four movements).
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
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Section editor ─────────────────────────────────────────────────────────────
// One collapsible card per major division. The header shows the section number,
// title, and passage range with reorder (↑/↓) and delete controls; expanding it
// reveals the four editable fields. All four persist through the debounced
// updateSection path the parent wires to `onChange`. AI-free.
function SectionEditor({ section, index, total, expanded, onToggle, onChange, onDelete, onMove, series }) {
  const chevronBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--ink-ghost)",
    fontSize: "13px",
    padding: "2px 4px",
  };

  return (
    <div style={{
      border: "1px solid var(--parchment-deep)",
      borderRadius: "var(--radius)",
      background: "var(--white)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={buttonKeydown(onToggle)}
        aria-expanded={expanded}
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", cursor: "pointer" }}
      >
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px", width: "16px", textAlign: "center" }}>{index + 1}</span>
        <span style={{
          flex: 1,
          fontFamily: "var(--font-serif)",
          fontSize: "14px",
          color: section.title ? "var(--ink)" : "var(--ink-ghost)",
          fontStyle: section.title ? "normal" : "italic",
        }}>
          {section.title || "Untitled Section"}
        </span>
        {section.passage_range && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--ink-soft)" }}>{section.passage_range}</span>
        )}
        <div style={{ display: "flex", gap: "2px" }}>
          {index > 0 && (
            <IconButton aria-label="Move section up" onClick={(e) => { e.stopPropagation(); onMove(-1); }} style={chevronBtnStyle} title="Move up">↑</IconButton>
          )}
          {index < total - 1 && (
            <IconButton aria-label="Move section down" onClick={(e) => { e.stopPropagation(); onMove(1); }} style={chevronBtnStyle} title="Move down">↓</IconButton>
          )}
          <DeleteButton small onDelete={onDelete} />
        </div>
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div style={{
          padding: "14px",
          borderTop: "1px solid var(--parchment-deep)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          background: "var(--parchment-warm)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label">Section Title</label>
              <input
                className="field-input"
                value={section.title || ""}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="e.g. Seeing Jesus Through Others' Eyes"
              />
            </div>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label">Passage Range</label>
              <input
                className="field-input"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                value={section.passage_range || ""}
                onChange={(e) => onChange("passage_range", e.target.value)}
                placeholder="e.g. 1:1–4:13"
              />
            </div>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Section Big Idea</label>
            <input
              className="field-input"
              value={section.big_idea || ""}
              onChange={(e) => onChange("big_idea", e.target.value)}
              placeholder="The central truth of this section"
            />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Section Overview</label>
            <textarea
              className="field-textarea"
              rows={3}
              value={section.overview || ""}
              onChange={(e) => onChange("overview", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="What does this section of the book accomplish? What shift happens here?"
            />
          </div>
        </div>
      )}
    </div>
  );
}
// ── Sermon Slots Tab ──────────────────────────────────────────────────────────
// Plan the individual sermons that make up the series. Slots can be grouped by
// section (when the Structure tab has sections) or kept as a flat list. Each
// slot is a real sermon atom on the spine; the "+ Add Slot" flow defers the
// spine write until the pastor types a non-empty title (State Contract #3 —
// no nameless atom ever reaches createSermon).
function SlotsTab({ series, sections, sermons, seriesId, onSermonsChange, onOpenSermon }) {
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
    <div className="page-body">
      <div className="card-header" style={{ marginBottom: "20px" }}>
        <div>
          <div className="card-title">Sermon Slots</div>
          <p className="field-caption" style={{ marginTop: "2px" }}>
            {allSlots.length} slot{allSlots.length !== 1 ? "s" : ""} planned
          </p>
        </div>
        {sections.length === 0 && (
          <PrimaryButton size="sm" onClick={() => addSlot(null)}>+ Add Slot</PrimaryButton>
        )}
      </div>

      {sections.length > 0 ? (
        // Organized by section
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {sections.map((section) => (
            <div className="card" key={section.id}>
              <div className="card-header">
                <div>
                  <div className="card-title">{section.title || "Untitled Section"}</div>
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
              />
            </div>
          ))}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ color: "var(--ink-soft)" }}>Unassigned</div>
              </div>
              <SlotList slots={unassigned} onChange={handleSlotField} onDelete={handleDeleteSlot} onCommit={commitDraft} draftErrors={draftErrors} onClearError={clearDraftError} onOpenSermon={onOpenSermon} seriesId={seriesId} series={series} totalSlots={allSlots.length} sectionBigIdea="" />
            </div>
          )}
        </div>
      ) : (
        // Flat list
        <div className="card">
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
          />
        </div>
      )}
    </div>
  );
}

function SlotList({ slots, onChange, onDelete, onCommit, draftErrors, onClearError, showAdd, onAdd, onOpenSermon, seriesId, series, totalSlots, sectionBigIdea }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {slots.length === 0 && (
        <div style={{ padding: "16px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "13px", fontFamily: "var(--font-serif)" }}>
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

function SlotRow({ slot, index, onChange, onDelete, onCommit, commitError, onClearError, onOpenSermon, seriesId, series, totalSlots, sectionBigIdea }) {
  const [expanded, setExpanded] = useState(!slot.title && !slot.passage);
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
    onOpenSermon(id);
  }

  return (
    <div style={{ border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", background: "var(--white)", overflow: "hidden" }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={buttonKeydown(() => setExpanded(e => !e))}
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer" }}
      >
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px", width: "16px" }}>{index + 1}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-soft)", minWidth: "90px" }}>
          {slot.passage || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>No passage</span>}
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
        <div style={{ padding: "14px", borderTop: "1px solid var(--parchment-deep)", background: "var(--parchment-warm)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Passage</label>
            <input
              className="field-input"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px" }}
              value={slot.passage || ""}
              onChange={(e) => onChange(slot.id, "passage", e.target.value)}
              placeholder="e.g. Luke 1:1-4"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Working Title</label>
            <input
              className="field-input"
              style={{ fontSize: "14px" }}
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
          <div className="field-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
            <label className="field-label">Study Guide Note</label>
            <textarea
              className="field-textarea"
              style={{ fontSize: "14px", minHeight: "auto" }}
              rows={3}
              value={slot.study_guide_note || ""}
              onChange={(e) => { onChange(slot.id, "study_guide_note", e.target.value); }}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="Orient the congregation reader — how does this sermon fit the series arc? What should they be watching for?"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="field-caption">A short note for the congregational study guide — written in your own voice.</p>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Calendar Tab ───────────────────────────────────────────────────────────
// Schedules the series' sermon slots onto Sundays, honouring church-calendar
// seasons and the preacher's special-date notes. AI scheduling advisor removed
// (constitutional no-direct-ai); the date engine is preserved verbatim.
function CalendarTab({ series, sections, sermons, calNotes, onChange, onSermonsChange }) {
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

  return (
    <>
      <div className="page-header">
        <div className="page-title">Calendar</div>
        <div className="page-subtitle">
          Lay each slot on a Sunday. Seasons and your special-date notes ride along so nothing lands where it shouldn't.
        </div>
      </div>

      <div className="page-body">
        {/* Controls */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="series-start-date">Series Start Date</label>
              <input
                id="series-start-date"
                type="date"
                className="field-input"
                style={{ width: "auto", fontSize: "14px", padding: "8px 12px" }}
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
              {calendarSaving ? LOADING_VERB.Saving : "Save Dates"}
            </SecondaryButton>
            {calendarSaveMsg === "saved" && (
              <span style={{ fontSize: "12px", color: "var(--sage)" }}>Dates saved</span>
            )}
            {calendarSaveMsg === "error" && (
              <span style={{ fontSize: "12px", color: "var(--crimson)" }}>Save failed</span>
            )}
          </div>
        </div>

        {sermons.length === 0 ? (
          <div style={{
            padding: "32px",
            background: "var(--parchment-warm)",
            border: "1px solid var(--parchment-deep)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
            color: "var(--ink-ghost)",
            fontSize: "14px",
          }}>
            Add sermon slots in the Sermon Slots tab first.
          </div>
        ) : (
          <>
            {/* Schedule list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sermons.map((sermon, idx) => {
                const entry = schedule.find(s => s.sermonId === sermon.id);
                const date  = entry?.date || sermon.date || "";
                const season = date ? getSeasonForDate(date) : null;
                const note  = calNotes.find(n => n.date === date);

                return (
                  <div key={sermon.id} style={{
                    display: "grid", gridTemplateColumns: "24px 1fr 1fr auto auto",
                    alignItems: "center", gap: "14px",
                    padding: "12px 16px",
                    background: "var(--white)",
                    border: "1px solid var(--parchment-deep)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-soft)",
                  }}>
                    <span style={{ fontSize: "12px", color: "var(--ink-ghost)", textAlign: "center" }}>{idx + 1}</span>
                    <div>
                      <div style={{ fontSize: "14px", color: "var(--ink)", fontFamily: "var(--font-serif)", lineHeight: "1.3" }}>
                        {sermon.title || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Untitled</span>}
                      </div>
                      {sermon.passage && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--ink-soft)", marginTop: "3px" }}>
                          {sermon.passage}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <input
                        type="date"
                        className="field-input"
                        style={{ fontSize: "13px", padding: "6px 10px" }}
                        value={date}
                        onChange={(e) => handleDateChange(sermon.id, e.target.value)}
                        aria-label={`Date for slot ${idx + 1}`}
                      />
                      {note && (
                        <span style={{ fontSize: "11px", color: "var(--crimson)" }}>⚠ {note.label}</span>
                      )}
                    </div>
                    <div>
                      {season && (
                        <span style={{
                          fontSize: "11px", padding: "3px 9px", borderRadius: "10px",
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
                      className="btn-icon"
                      onClick={() => skipSunday(sermon.id)}
                      title="Skip one week"
                      disabled={!date}
                      style={{ fontSize: "12px", padding: "5px 9px" }}
                    >
                      +1wk
                    </IconButton>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <PrimaryButton onClick={applySchedule} disabled={calendarSaving}>
                {calendarSaving ? LOADING_VERB.Saving : "Save All Dates to Sermon Records"}
              </PrimaryButton>
              {calendarSaveMsg === "saved" && (
                <span style={{ fontSize: "12px", color: "var(--sage)" }}>Dates saved</span>
              )}
              {calendarSaveMsg === "error" && (
                <span style={{ fontSize: "12px", color: "var(--crimson)" }}>Save failed</span>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
// ── Series Planner "How this works" modal ──────────────────────────────────────
// Pure copy — no AI, no DB. Explains the five planning stages and their
// sub-items. Restyled to the app's .modal-* vocabulary (NewSeriesModal idiom):
// .modal-backdrop → .modal → .modal-header/.modal-body. Width is widened past
// the 560px default (inline) so the five-column SVG breathes; everything else is
// the shared class. The old "AI Advisor" Calendar node has been relabelled to a
// mechanical step (no AI anywhere in the revived planner).
function SeriesHowItWorksModal({ onClose }) {
  // Escape closes — same pattern as every sibling overlay (NewSeriesModal).
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "960px" }}>
        <div className="modal-header">
          <h2 className="modal-title">How the Series Planner works</h2>
          <IconButton aria-label="Close how-this-works modal" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body">
          <p style={{
            fontSize: "13px", color: "var(--ink-ghost)",
            marginBottom: "24px", fontFamily: "var(--font-serif)",
          }}>Plan and build a sermon series through five planning stages.</p>

          <div style={{ overflowX: "auto" }}>
            <svg viewBox="0 0 1080 228" style={{ width: "100%", height: "auto", display: "block" }}>

              {/* ── Stage boxes ─────────────────────────────────────────────────── */}
              <rect x="10" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
              <text x="100" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Book Study</text>

              <rect x="230" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
              <text x="320" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Overview</text>

              <rect x="450" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
              <text x="540" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Structure</text>

              <rect x="670" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
              <text x="760" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Sermon Slots</text>

              <rect x="890" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
              <text x="980" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Calendar</text>

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
              <text x="100" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Redemptive Context</text>
              <line x1="100" y1="104" x2="100" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="10" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="100" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Book Background</text>
              <line x1="100" y1="140" x2="100" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="10" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="100" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Argument &amp; Structure</text>
              <line x1="100" y1="176" x2="100" y2="184" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="10" y="184" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="100" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Working Big Idea</text>

              {/* ── Overview sub-items (4) ───────────────────────────────────────── */}
              <rect x="230" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="320" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>{"Title & identity"}</text>
              <line x1="320" y1="104" x2="320" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="230" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="320" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>{"Passage & dates"}</text>
              <line x1="320" y1="140" x2="320" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="230" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="320" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Series Big Idea</text>
              <line x1="320" y1="176" x2="320" y2="184" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="230" y="184" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="320" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Series Overview</text>

              {/* ── Structure sub-items (2) ──────────────────────────────────────── */}
              <rect x="450" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="540" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Structural Outline</text>
              <line x1="540" y1="104" x2="540" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="450" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="540" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Series Sections</text>

              {/* ── Sermon Slots sub-items (3) ───────────────────────────────────── */}
              <rect x="670" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="760" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Sermon Slots</text>
              <line x1="760" y1="104" x2="760" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="670" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="760" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Assign passages</text>
              <line x1="760" y1="140" x2="760" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="670" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="760" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Open in Workspace</text>

              {/* ── Calendar sub-items (3) ───────────────────────────────────────── */}
              <rect x="890" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="980" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Date assignment</text>
              <line x1="980" y1="104" x2="980" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="890" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="980" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Liturgical seasons</text>
              <line x1="980" y1="140" x2="980" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

              <rect x="890" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
              <text x="980" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Study Guide export</text>

            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Study Guide Modal ─────────────────────────────────────────────────────────
// AI-free: renders a five-part read-only preview from series + sections +
// sermons, and exports to Word via exportStudyGuide(series.id) — a real DB/IPC
// document export, not AI. Restyled to the app's .modal-* vocabulary; the
// preview body keeps its bespoke, token-styled sub-components (status dots, part
// headers, slot rows). In-flight export label is LOADING_VERB.Exporting.
function StudyGuideModal({ series, sections, sermons, onClose }) {
  const [exporting, setExporting]       = useState(false);
  const [exportResult, setExportResult] = useState(null); // null | { ok, filepath?, error? }

  // Escape closes — matches the how-this-works overlay and NewSeriesModal.
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          fontSize: "12px", fontWeight: "700", fontFamily: "var(--font-serif)",
          flexShrink: 0,
        }}>{number}</span>
        <h3 style={{
          fontFamily: "var(--font-serif)", fontSize: "16px",
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
          <span className="field-label" style={{ marginBottom: 0 }}>{label}</span>
        </div>
        {content ? (
          <div style={{ paddingLeft: "16px" }}>
            {content.split(/\n+/).filter(p => p.trim()).map((para, i) => (
              <p key={i} style={{
                fontSize: "14px", fontFamily: "var(--font-serif)",
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
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "14px", fontWeight: "600", color: "var(--ink)" }}>
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
            <p style={{ fontSize: "14px", fontFamily: "var(--font-serif)", color: "var(--ink)", lineHeight: "1.6", margin: 0 }}>
              {sermon.study_guide_note}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Wider than the 560px default and parchment-bodied — this is a reading
          surface, so the body sits on --parchment like the page body. */}
      <div className="modal" style={{ width: "760px" }}>
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="modal-title">Study Guide Preview</h2>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
              color: "var(--ink-ghost)", marginTop: "4px",
            }}>
              {series.title}{series.passage_range ? ` — ${series.passage_range}` : ""}
            </div>
          </div>
          <IconButton aria-label="Close study guide preview" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body" style={{ background: "var(--parchment)" }}>
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
        </div>

        <div className="modal-footer" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
          {exportResult?.ok && (
            <div style={{ fontSize: "12px", color: "var(--sage)", fontFamily: "var(--font-serif)" }}>
              Saved to: {exportResult.filepath}
            </div>
          )}
          {exportResult && !exportResult.ok && (
            <div style={{ fontSize: "12px", color: "var(--crimson)", fontFamily: "var(--font-serif)" }}>
              Export failed: {exportResult.error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <SecondaryButton size="sm" onClick={onClose}>Close</SecondaryButton>
            <PrimaryButton onClick={handleExport} disabled={exporting}>
              {exporting ? LOADING_VERB.Exporting : "Export to Word"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
