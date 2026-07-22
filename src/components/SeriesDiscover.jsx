import { useState, useEffect, useRef } from "react";
import { parseDiscovery, AUTHORIAL_FUNCTIONS, MAX_DIFFICULT_DECISIONS } from "../utils/discovery";
import { parsePassageRef } from "../utils/passageRef";
import { autoResize } from "../utils";
import { buttonKeydown } from "../utils/buttonKeydown";
import CoveragePanel from "./CoveragePanel";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import TextButton from "./primitives/TextButton";
import IconButton from "./primitives/IconButton";
import DeleteButton from "./DeleteButton";
import InlineError from "./InlineError";

// ── Series Discovery — the exegetical front screen of the Series Planner ─────────
// Discovery shows the QUESTIONS behind the plan; Outline shows the clean plan those
// answers produced. They are two views of the SAME pastor-authored series, never
// two planning systems: a "major movement" IS a real Series Section (createSection);
// a "preaching text" IS a real Sermon under it (createSermon); their canonical
// fields (title/passage/big_idea/overview, section_id) edit through the SAME parent
// savers, so an edit here is instantly what Outline shows. Only the Discovery-only
// REASONING (why a boundary sits here, subject/complement/authorial function, the
// candidate big ideas) is stored apart, in the per-entity `discovery` JSON (v34).
//
// SermonForge supplies the pressure; the pastor supplies the clarity. Nothing is
// generated for him — no suggested divisions, movements, texts, or big ideas. The
// only automatic thing is the deterministic coverage readout, which exposes his own
// work (gaps, overlaps, unreadable refs); it never completes it. Book series only —
// topical keeps its existing journey. AI-free by construction.
//
// The entity mutations (addSection / addSermon / commitDraft / delete / field edits)
// are the parent SeriesPlanner's — the SAME functions the Outline tab uses — passed
// as props, so the two tabs can't drift into separate systems. Charter:
// docs/PROPOSALS/series-discovery.md.

const STEPS = [
  { key: "read",       label: "Read",            title: "Read the Book" },
  { key: "understand", label: "Understand",      title: "Understand the Book" },
  { key: "movements",  label: "Movements",       title: "Map the Major Movements" },
  { key: "texts",      label: "Preaching texts", title: "Identify the Preaching Texts" },
  { key: "test",       label: "Test",            title: "Test Every Passage" },
  { key: "decisions",  label: "Decisions",       title: "Difficult Decisions" },
  { key: "bigidea",    label: "Series big idea", title: "Propose the Series Big Idea" },
  { key: "review",     label: "Planner-ready",   title: "Planner-Ready Review" },
];

// Book-series sermons sort by their section's order, then within-section by
// creation — the same reading order the Outline groups by. (Discovery is book-only,
// so there is no topical sort_order term to weigh here.)
function bySectionReadingOrder(sections) {
  const order = new Map(sections.map((s, i) => [s.id, s.sort_order ?? i]));
  return (a, b) => {
    const ao = order.get(a.section_id) ?? Number.MAX_SAFE_INTEGER;
    const bo = order.get(b.section_id) ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  };
}

export default function SeriesDiscover({
  series, sections, sermons, seriesId,
  drafts, draftErrors, expandedSermons,
  onSeriesField, onSectionField,
  onSeriesDiscovery, onSectionDiscovery, onSermonDiscovery,
  addSection, deleteSectionRow, addSermon, commitDraft,
  handleSermonRowField, removeSermonRow, clearDraftError, toggleSermon,
  onOpenSermon, onNavigate,
}) {
  // Current step is remembered per series (write-on-change localStorage, the same
  // set-once idiom as the planner's tab + intro flags) so reload restores position
  // — a pastor on Step 7 comes back to Step 7, not Step 1. Re-read on series change.
  const stepKey = `sermonforge_discover_step_${seriesId}`;
  const readStep = () => {
    const saved = Number(localStorage.getItem(stepKey));
    return Number.isInteger(saved) && saved >= 0 && saved < STEPS.length ? saved : 0;
  };
  const [stepIdx, setStepIdx] = useState(readStep);
  useEffect(() => { setStepIdx(readStep()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [seriesId]);
  function goStep(i) {
    const next = Math.max(0, Math.min(STEPS.length - 1, i));
    setStepIdx(next);
    localStorage.setItem(stepKey, String(next));
  }

  const step = STEPS[stepIdx];
  const disc = parseDiscovery(series.discovery);
  const orderedSermons = [...sermons].sort(bySectionReadingOrder(sections));
  const orderedSections = [...sections].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="page-body" style={{ background: "var(--parchment)" }}>
      <div className="page-header" style={{ padding: "0 0 4px" }}>
        <div className="page-title">Discover</div>
        <div className="page-subtitle">
          Work the book from a first reading down to a preaching map and a series big idea — in your own words.
          Your answers become the plan as you make them. Each major movement here is a section in your Outline,
          and each preaching text is a sermon under it — the same series, two views. You can open Outline any time.
        </div>
      </div>

      <Stepper steps={STEPS} current={stepIdx} onGo={goStep} />

      <div style={{ marginTop: "18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gold-bright)" }}>
            Step {stepIdx + 1} of {STEPS.length}
          </span>
        </div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "var(--ink)", margin: "0 0 16px" }}>{step.title}</h2>

        {step.key === "read" && <ReadStep disc={disc} onSeriesDiscovery={onSeriesDiscovery} />}
        {step.key === "understand" && <UnderstandStep disc={disc} onSeriesDiscovery={onSeriesDiscovery} />}
        {step.key === "movements" && (
          <MovementsStep
            sections={orderedSections}
            sermons={sermons}
            onSectionField={onSectionField}
            onSectionDiscovery={onSectionDiscovery}
            addSection={addSection}
            deleteSectionRow={deleteSectionRow}
          />
        )}
        {step.key === "texts" && (
          <PreachingTextsStep
            sections={orderedSections}
            sermons={sermons}
            drafts={drafts}
            draftErrors={draftErrors}
            expandedSermons={expandedSermons}
            onRowField={handleSermonRowField}
            onSermonDiscovery={onSermonDiscovery}
            addSermon={addSermon}
            commitDraft={commitDraft}
            removeSermonRow={removeSermonRow}
            clearDraftError={clearDraftError}
            toggleSermon={toggleSermon}
            onOpenSermon={onOpenSermon}
            onGoMovements={() => goStep(2)}
          />
        )}
        {step.key === "test" && (
          <TestStep series={series} sermons={orderedSermons} sections={orderedSections} onNavigate={onNavigate} />
        )}
        {step.key === "decisions" && <DecisionsStep disc={disc} onSeriesDiscovery={onSeriesDiscovery} />}
        {step.key === "bigidea" && (
          <BigIdeaStep series={series} disc={disc} onSeriesField={onSeriesField} onSeriesDiscovery={onSeriesDiscovery} />
        )}
        {step.key === "review" && (
          <ReviewStep series={series} sections={orderedSections} sermons={orderedSermons} onNavigate={onNavigate} />
        )}
      </div>

      {/* Back / Next — free navigation; readiness informs, it never blocks. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px", paddingTop: "16px", borderTop: "1px solid var(--parchment-deep)" }}>
        <SecondaryButton size="sm" onClick={() => goStep(stepIdx - 1)} disabled={stepIdx === 0}>← Back</SecondaryButton>
        {stepIdx < STEPS.length - 1 ? (
          <PrimaryButton size="sm" onClick={() => goStep(stepIdx + 1)}>Next: {STEPS[stepIdx + 1].title} →</PrimaryButton>
        ) : (
          <PrimaryButton size="sm" onClick={() => onNavigate?.("book-outline")}>Open Outline →</PrimaryButton>
        )}
      </div>
    </div>
  );
}

// ── The step rail ───────────────────────────────────────────────────────────────
function Stepper({ steps, current, onGo }) {
  return (
    <div role="tablist" aria-label="Discovery steps" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {steps.map((s, i) => {
        const active = i === current;
        return (
          <div
            key={s.key}
            role="tab"
            tabIndex={0}
            aria-selected={active}
            aria-label={`Step ${i + 1}: ${s.title}`}
            onClick={() => onGo(i)}
            onKeyDown={buttonKeydown(() => onGo(i))}
            style={{
              display: "flex", alignItems: "center", gap: "7px", cursor: "pointer",
              padding: "6px 11px 6px 7px", borderRadius: "999px",
              border: `1px solid ${active ? "var(--gold)" : "var(--parchment-deep)"}`,
              background: active ? "var(--gold)" : "var(--white)",
            }}
          >
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
              background: active ? "var(--white)" : "var(--parchment-deep)",
              color: active ? "var(--gold-bright)" : "var(--ink-soft)",
              fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "11px",
            }}>{i + 1}</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "11.5px", fontWeight: 600,
              letterSpacing: "0.02em", color: active ? "var(--white)" : "var(--ink-soft)",
            }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared field helpers ────────────────────────────────────────────────────────
function StepLead({ children }) {
  return (
    <p style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "var(--ink-soft)", lineHeight: 1.65, margin: "0 0 18px", maxWidth: "760px" }}>
      {children}
    </p>
  );
}

function FieldTextarea({ id, label, hint, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="field-group" style={{ marginBottom: 0 }}>
      <label className="field-label" htmlFor={id}>{label}</label>
      <textarea
        id={id} className="field-textarea" rows={rows}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => autoResize(e.target)}
        ref={(el) => autoResize(el)}
        placeholder={placeholder}
      />
      {hint && <div className="field-caption" style={{ marginTop: "6px" }}>{hint}</div>}
    </div>
  );
}

function FieldInput({ id, label, hint, value, onChange, placeholder, onBlur, onKeyDown, inputRef }) {
  return (
    <div className="field-group" style={{ marginBottom: 0 }}>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id} className="field-input" ref={inputRef}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur} onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
      {hint && <div className="field-caption" style={{ marginTop: "6px" }}>{hint}</div>}
    </div>
  );
}

// A visually distinct block for the Discovery-only exegetical reasoning, so it
// reads apart from the canonical fields that also live in Outline.
function ReasoningBlock({ children }) {
  return (
    <div style={{
      marginTop: "12px", padding: "12px 14px", background: "var(--parchment-warm)",
      borderRadius: "var(--radius)", borderLeft: "3px solid var(--sage)",
      display: "flex", flexDirection: "column", gap: "12px",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-ghost)" }}>
        Your reasoning · kept in Discover
      </div>
      {children}
    </div>
  );
}

// ── Step 1 · Read the Book ──────────────────────────────────────────────────────
function ReadStep({ disc, onSeriesDiscovery }) {
  return (
    <>
      <StepLead>
        Read the whole book several times, as one finished letter — not yet as a stack of sermons. Watch for what
        repeats: repeated words and themes, commands, warnings, promises, examples, contrasts, the hinge-words
        (&ldquo;therefore,&rdquo; &ldquo;but,&rdquo; &ldquo;so that&rdquo;), and the places where the author&rsquo;s
        thought seems to turn. Don&rsquo;t divide it into sermons yet. Just listen to the whole.
      </StepLead>
      <div className="card">
        <FieldTextarea
          id="disc-read-notes"
          label="Notes as you read"
          hint="What you're noticing — repetitions, turns, questions. Rough is fine; this is for you, and it stays in Discover."
          value={disc.readNotes}
          onChange={(v) => onSeriesDiscovery({ readNotes: v })}
          rows={9}
        />
      </div>
    </>
  );
}

// ── Step 2 · Understand the Book ────────────────────────────────────────────────
function UnderstandStep({ disc, onSeriesDiscovery }) {
  return (
    <>
      <StepLead>
        Now step back and ask why this book exists. These are your notes — they feed the Series Overview and Big Idea
        you&rsquo;ll write yourself later. SermonForge won&rsquo;t write or summarize them for you.
      </StepLead>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <FieldTextarea id="disc-u-why" label="Why was this book written?" value={disc.understandWhyWritten}
          onChange={(v) => onSeriesDiscovery({ understandWhyWritten: v })}
          placeholder="The author's purpose, as best you can hear it." />
        <FieldTextarea id="disc-u-situation" label="What situation prompted it?" value={disc.understandSituation}
          onChange={(v) => onSeriesDiscovery({ understandSituation: v })}
          placeholder="The occasion — what was happening for the first readers." />
        <FieldTextarea id="disc-u-problem" label="What problem, pressure, or need is being addressed?" value={disc.understandProblem}
          onChange={(v) => onSeriesDiscovery({ understandProblem: v })}
          placeholder="The ache the book speaks into." />
        <FieldTextarea id="disc-u-response" label="What response does the author want from the first readers?" value={disc.understandResponse}
          onChange={(v) => onSeriesDiscovery({ understandResponse: v })}
          placeholder="What he's asking them to do, believe, or become." />
        <FieldInput id="disc-u-wants" label="Through this book, the author wants the reader to…" value={disc.understandWantsReaderTo}
          onChange={(v) => onSeriesDiscovery({ understandWantsReaderTo: v })}
          placeholder="…finish the sentence in your own words." />
      </div>
    </>
  );
}

// ── Step 3 · Map the Major Movements (real Series Sections) ──────────────────────
function MovementsStep({ sections, sermons, onSectionField, onSectionDiscovery, addSection, deleteSectionRow }) {
  const [justCreatedId, setJustCreatedId] = useState(null);
  async function handleAdd() {
    const id = await addSection();
    if (id) setJustCreatedId(id);
  }
  return (
    <>
      <StepLead>
        A <strong>major movement</strong> organizes preaching texts — it is not automatically one sermon. You create each
        one yourself. Every movement you add here <strong>becomes a section in your Outline</strong> — the same plan, two
        views. Give it a title and passage range, its big idea and overview, and note why its boundaries fall where they do.
      </StepLead>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sections.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "28px 24px" }}>
            <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink-soft)", fontSize: "14px", margin: "0 auto 14px", maxWidth: "520px", lineHeight: 1.6 }}>
              No movements yet. Add the book&rsquo;s first major movement — where its opening section begins and ends, and
              the one idea that holds it together.
            </p>
            <SecondaryButton size="sm" onClick={handleAdd}>+ Add major movement</SecondaryButton>
          </div>
        ) : (
          <>
            {sections.map((section, i) => (
              <MovementCard
                key={section.id}
                section={section}
                index={i}
                sermonCount={sermons.filter((s) => s.section_id === section.id).length}
                justCreated={justCreatedId === section.id}
                onSectionField={onSectionField}
                onSectionDiscovery={onSectionDiscovery}
                onDelete={() => deleteSectionRow(section.id)}
              />
            ))}
            <SecondaryButton size="sm" onClick={handleAdd} style={{ alignSelf: "flex-start" }}>+ Add major movement</SecondaryButton>
          </>
        )}
      </div>
    </>
  );
}

function MovementCard({ section, index, sermonCount, justCreated, onSectionField, onSectionDiscovery, onDelete }) {
  const disc = parseDiscovery(section.discovery);
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  useEffect(() => {
    if (justCreated) {
      cardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [justCreated]);
  const set = (field, value) => onSectionField(section.id, { [field]: value });
  return (
    <div ref={cardRef} className="card" style={{ borderLeft: "3px solid var(--gold)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
          Movement {index + 1}
        </span>
        <span style={{ flex: 1, fontSize: "11px", color: "var(--ink-ghost)" }}>
          {sermonCount} preaching text{sermonCount === 1 ? "" : "s"} · becomes a section in Outline
        </span>
        <DeleteButton small onDelete={onDelete} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <FieldInput id={`mv-${section.id}-title`} label="Title" inputRef={titleRef} value={section.title}
          onChange={(v) => set("title", v)} placeholder="e.g. Seeing Jesus Through Others' Eyes" />
        <FieldInput id={`mv-${section.id}-range`} label="Passage" value={section.passage_range}
          onChange={(v) => set("passage_range", v)} placeholder="e.g. 1:1–4:13" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <FieldInput id={`mv-${section.id}-big`} label="Big idea" value={section.big_idea}
          onChange={(v) => set("big_idea", v)} placeholder="The one thing this movement is about, in a line." />
        <FieldTextarea id={`mv-${section.id}-overview`} label="Overview" value={section.overview}
          onChange={(v) => set("overview", v)} placeholder="What this movement accomplishes — the shift that happens across it." />
      </div>
      <ReasoningBlock>
        <FieldTextarea id={`mv-${section.id}-begin`} label="Why does this movement begin here?" value={disc.whyBegin}
          onChange={(v) => onSectionDiscovery(section.id, { whyBegin: v })}
          placeholder="What in the text marks the start — a new setting, audience, or turn of thought." rows={2} />
        <FieldTextarea id={`mv-${section.id}-end`} label="Why does it end here?" value={disc.whyEnd}
          onChange={(v) => onSectionDiscovery(section.id, { whyEnd: v })}
          placeholder="What closes it off before the next movement opens." rows={2} />
      </ReasoningBlock>
    </div>
  );
}

// ── Step 4 · Identify the Preaching Texts (real Sermons under a movement) ────────
function PreachingTextsStep({
  sections, sermons, drafts, draftErrors, expandedSermons,
  onRowField, onSermonDiscovery, addSermon, commitDraft, removeSermonRow,
  clearDraftError, toggleSermon, onOpenSermon, onGoMovements,
}) {
  // The advisor's trap: a preaching text with no parent movement makes the spine
  // fabricate a phantom "Section 1". So a preaching text can ONLY be created inside
  // an existing movement, and always with that movement's section_id.
  if (sections.length === 0) {
    return (
      <>
        <StepLead>
          Preaching texts live inside a movement. Map at least one major movement first, then come back to gather the
          passages you&rsquo;ll preach within it.
        </StepLead>
        <div className="card" style={{ textAlign: "center", padding: "24px" }}>
          <SecondaryButton size="sm" onClick={onGoMovements}>← Back to Map the Major Movements</SecondaryButton>
        </div>
      </>
    );
  }
  return (
    <>
      <StepLead>
        Within each movement, gather the individual passages you&rsquo;ll preach — one preaching text each. Every text you
        add <strong>becomes a sermon under that movement in your Outline</strong>. Follow the text; don&rsquo;t force an
        arbitrary number of sermons. Set the passage and a working title, then reason about its boundaries and what the
        author is doing.
      </StepLead>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {sections.map((section) => {
          const rows = [
            ...sermons.filter((s) => s.section_id === section.id),
            ...drafts.filter((d) => d.section_id === section.id),
          ];
          return (
            <div key={section.id} className="card" style={{ borderLeft: "3px solid var(--parchment-deep)" }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 600, color: section.title ? "var(--ink)" : "var(--ink-ghost)", fontStyle: section.title ? "normal" : "italic" }}>
                  {section.title || "Untitled movement"}
                  {section.passage_range && <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-soft)", marginLeft: "8px" }}>{section.passage_range}</span>}
                </div>
                <div className="field-caption" style={{ marginTop: "2px" }}>Preaching texts in this movement</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {rows.length === 0 && (
                  <div style={{ padding: "12px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "13px", fontFamily: "var(--font-serif)" }}>
                    No preaching texts here yet.
                  </div>
                )}
                {rows.map((row) => (
                  <PreachingTextCard
                    key={row.id}
                    sermon={row}
                    expanded={expandedSermons.has(row.id)}
                    onToggle={() => toggleSermon(row.id)}
                    onRowField={onRowField}
                    onSermonDiscovery={onSermonDiscovery}
                    onCommit={commitDraft}
                    onDelete={removeSermonRow}
                    onOpenSermon={onOpenSermon}
                    commitError={draftErrors[row.id]}
                    onClearError={clearDraftError}
                  />
                ))}
                <SecondaryButton size="sm" onClick={() => addSermon(section.id)} style={{ alignSelf: "flex-start" }}>+ Add preaching text</SecondaryButton>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PreachingTextCard({ sermon: p, expanded, onToggle, onRowField, onSermonDiscovery, onCommit, onDelete, onOpenSermon, commitError, onClearError }) {
  const isDraft = !!p._draft;
  const disc = parseDiscovery(p.discovery);
  const rowRef = useRef(null);
  const titleRef = useRef(null);
  useEffect(() => {
    if (p._draft) {
      rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      titleRef.current?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen(e) {
    e.stopPropagation();
    const id = isDraft ? await onCommit?.(p.id) : p.id;
    if (id) onOpenSermon(id);
  }
  const commitIfReady = () => { if (isDraft && p.title?.trim()) onCommit?.(p.id); };

  // Authorial function: a fixed vocabulary the pastor PICKS from (not a suggestion),
  // with Other → a free-text field. Two sub-fields keep "Other" unambiguous even
  // before the free text is typed.
  const fn = disc.authorialFunction || "";
  return (
    <div ref={rowRef} style={{ border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", background: "var(--white)", overflow: "hidden" }}>
      <div
        role="button" tabIndex={0} aria-expanded={expanded}
        onClick={onToggle} onKeyDown={buttonKeydown(onToggle)}
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", cursor: "pointer" }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-soft)", minWidth: "84px" }}>
          {p.passage || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>No passage</span>}
        </span>
        <span style={{ flex: 1, fontSize: "14px", color: p.title ? "var(--ink)" : "var(--ink-ghost)", fontStyle: p.title ? "normal" : "italic" }}>
          {p.title || "Untitled"}
        </span>
        <SecondaryButton
          size="sm" onClick={handleOpen}
          disabled={isDraft && !p.title?.trim()}
          title={isDraft && !p.title?.trim() ? "Type a working title first" : "Open this sermon to prepare it"}
          style={{ fontSize: "12px", padding: "3px 10px" }}
        >
          Build this sermon
        </SecondaryButton>
        <DeleteButton small onDelete={() => onDelete(p.id)} />
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "14px", borderTop: "1px solid var(--parchment-deep)", background: "var(--parchment-warm)", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FieldInput
              id={`pt-${p.id}-passage`} label="Passage" value={p.passage}
              onChange={(v) => onRowField(p.id, "passage", v)} placeholder="e.g. Luke 1:5-25"
            />
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor={`pt-${p.id}-title`}>Working title</label>
              <input
                id={`pt-${p.id}-title`} ref={titleRef} className="field-input"
                value={p.title || ""}
                onChange={(e) => onRowField(p.id, "title", e.target.value)}
                onBlur={commitIfReady}
                onKeyDown={(e) => { if (e.key === "Enter" && isDraft && p.title?.trim()) { e.preventDefault(); onCommit?.(p.id); } }}
                placeholder="A rough handle — the big idea expands on it."
              />
              {commitError && <div style={{ marginTop: "6px" }}><InlineError onDismiss={() => onClearError?.(p.id)}>{commitError}</InlineError></div>}
            </div>
          </div>
          <FieldInput id={`pt-${p.id}-big`} label="Big idea" value={p.big_idea}
            onChange={(v) => onRowField(p.id, "big_idea", v)} placeholder="The one thing this passage says, in a sentence." />
          <FieldTextarea id={`pt-${p.id}-overview`} label="Overview" value={p.overview}
            onChange={(v) => onRowField(p.id, "overview", v)} placeholder="A paragraph on this passage — what it shows and where it lands." />

          <ReasoningBlock>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <FieldTextarea id={`pt-${p.id}-begin`} label="Why does it begin here?" value={disc.whyBegin}
                onChange={(v) => onSermonDiscovery(p.id, { whyBegin: v })} rows={2}
                placeholder="What opens this thought." />
              <FieldTextarea id={`pt-${p.id}-end`} label="Why does it end here?" value={disc.whyEnd}
                onChange={(v) => onSermonDiscovery(p.id, { whyEnd: v })} rows={2}
                placeholder="What completes it — is a command kept with its reason, an example with its point?" />
            </div>
            <FieldTextarea id={`pt-${p.id}-subject`} label="What is the author talking about? (subject)" value={disc.subject}
              onChange={(v) => onSermonDiscovery(p.id, { subject: v })} rows={2}
              placeholder="The thing the passage is about." />
            <FieldTextarea id={`pt-${p.id}-complement`} label="What is he saying about it? (complement)" value={disc.complement}
              onChange={(v) => onSermonDiscovery(p.id, { complement: v })} rows={2}
              placeholder="What he asserts about that subject." />
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor={`pt-${p.id}-fn`}>What is the author doing here?</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  id={`pt-${p.id}-fn`} className="field-input" style={{ width: "auto" }}
                  value={fn}
                  onChange={(e) => onSermonDiscovery(p.id, { authorialFunction: e.target.value })}
                >
                  <option value="">Choose…</option>
                  {AUTHORIAL_FUNCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                {fn === "Other" && (
                  <input
                    className="field-input" style={{ flex: 1, minWidth: "180px" }}
                    aria-label="Other authorial function"
                    value={disc.authorialFunctionOther || ""}
                    onChange={(e) => onSermonDiscovery(p.id, { authorialFunctionOther: e.target.value })}
                    placeholder="Name it in your own word."
                  />
                )}
              </div>
            </div>
          </ReasoningBlock>
        </div>
      )}
    </div>
  );
}

// ── Step 5 · Test Every Passage (pressure, not checkbox theater; no stored state) ─
const PASSAGE_TESTS = [
  "Does this passage express one coherent thought?",
  "Does the beginning make sense as a beginning?",
  "Does the ending complete the thought?",
  "Am I separating a command from its reason?",
  "Am I separating an example from the point it supports?",
  "Is this passage too large? Too small?",
  "Does the big idea cover the whole passage?",
  "Am I following the text — not forcing an arbitrary number of sermons?",
];
function TestStep({ series, sermons, sections, onNavigate }) {
  const named = sermons.filter((s) => !s._draft);
  return (
    <>
      <StepLead>
        Hold each preaching text up to the light. These questions apply the pressure; you answer them in your own
        judgment — nothing here is stored or checked off. Below, SermonForge shows the objective coverage of your book
        so far: where verses are uncovered, doubled, or unreadable.
      </StepLead>

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="field-label" style={{ marginBottom: "8px" }}>Ask of every passage</div>
        <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {PASSAGE_TESTS.map((q) => (
            <li key={q} style={{ fontFamily: "var(--font-serif)", fontSize: "13.5px", color: "var(--ink-mid)", lineHeight: 1.5 }}>{q}</li>
          ))}
        </ul>
      </div>

      {/* SeriesDiscover only mounts for a BOOK series, so there is always a book
          to measure; CoveragePanel self-handles the no-book empty state. */}
      <div style={{ marginBottom: "16px" }}>
        <CoveragePanel series={series} sermons={sermons} onNavigate={onNavigate} />
      </div>

      <div className="card">
        <div className="field-label" style={{ marginBottom: "8px" }}>Your preaching texts</div>
        {named.length === 0 ? (
          <div style={{ fontSize: "13px", fontStyle: "italic", color: "var(--ink-ghost)" }}>
            No preaching texts yet — add them in Preaching texts.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {named.map((s, i) => {
              const ref = parsePassageRef(s.passage || "", series.book_id);
              const unreadable = (s.passage || "").trim() !== "" && ref.error === true;
              const sectionTitle = sections.find((sec) => sec.id === s.section_id)?.title || "—";
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "baseline", gap: "10px", fontSize: "13px", padding: "6px 0", borderBottom: i < named.length - 1 ? "1px solid var(--parchment-deep)" : "none" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: unreadable ? "var(--crimson-soft)" : "var(--ink-soft)", minWidth: "110px" }}>
                    {s.passage || "No passage"}
                  </span>
                  <span style={{ flex: 1, color: "var(--ink)", fontFamily: "var(--font-serif)" }}>{s.title || "Untitled"}</span>
                  <span style={{ fontSize: "11px", color: "var(--ink-ghost)", fontFamily: "var(--font-mono)" }}>{sectionTitle}</span>
                  {unreadable && <span style={{ fontSize: "11px", color: "var(--crimson-soft)", fontFamily: "var(--font-mono)" }}>couldn&rsquo;t read</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── Step 6 · Difficult Decisions (up to three; never blocks) ─────────────────────
function DecisionsStep({ disc, onSeriesDiscovery }) {
  const decisions = Array.isArray(disc.decisions) ? disc.decisions : [];
  function update(nextList) { onSeriesDiscovery({ decisions: nextList }); }
  function add() {
    if (decisions.length >= MAX_DIFFICULT_DECISIONS) return;
    update([...decisions, { id: crypto.randomUUID(), optionA: "", optionB: "", evidenceA: "", evidenceB: "", preference: "", why: "" }]);
  }
  function patch(id, field, value) {
    update(decisions.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }
  function remove(id) { update(decisions.filter((d) => d.id !== id)); }
  return (
    <>
      <StepLead>
        Some divisions stay genuinely uncertain. Keep up to three of them honestly here — the two options, the evidence
        for each, and which way you&rsquo;re leaning and why. This never blocks your plan; it just preserves the question
        so you can return to it.
      </StepLead>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {decisions.map((d, i) => (
          <div key={d.id} className="card" style={{ borderLeft: "3px solid var(--slate)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>Decision {i + 1}</span>
              <DeleteButton small onDelete={() => remove(d.id)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <FieldInput id={`dec-${d.id}-a`} label="Option A" value={d.optionA} onChange={(v) => patch(d.id, "optionA", v)} placeholder="e.g. Break at 9:50" />
              <FieldInput id={`dec-${d.id}-b`} label="Option B" value={d.optionB} onChange={(v) => patch(d.id, "optionB", v)} placeholder="e.g. Break at 9:62" />
              <FieldTextarea id={`dec-${d.id}-ea`} label="Evidence for A" value={d.evidenceA} onChange={(v) => patch(d.id, "evidenceA", v)} rows={2} />
              <FieldTextarea id={`dec-${d.id}-eb`} label="Evidence for B" value={d.evidenceB} onChange={(v) => patch(d.id, "evidenceB", v)} rows={2} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
              <FieldInput id={`dec-${d.id}-pref`} label="Currently leaning" value={d.preference} onChange={(v) => patch(d.id, "preference", v)} placeholder="A or B — for now" />
              <FieldTextarea id={`dec-${d.id}-why`} label="Why" value={d.why} onChange={(v) => patch(d.id, "why", v)} rows={2} />
            </div>
          </div>
        ))}
        {decisions.length < MAX_DIFFICULT_DECISIONS ? (
          <SecondaryButton size="sm" onClick={add} style={{ alignSelf: "flex-start" }}>+ Add a difficult decision</SecondaryButton>
        ) : (
          <div className="field-caption">That&rsquo;s the three worth keeping — resolve one to add another.</div>
        )}
      </div>
    </>
  );
}

// ── Step 7 · Propose the Series Big Idea ─────────────────────────────────────────
function BigIdeaStep({ series, disc, onSeriesField, onSeriesDiscovery }) {
  return (
    <>
      <StepLead>
        Now that the preaching map exists, find the one burden that holds the whole book together. Think it through, write
        two possible big ideas, then establish the one you&rsquo;ll preach. SermonForge won&rsquo;t compare, rank, merge,
        or choose for you — the final words are yours.
      </StepLead>

      <div className="card" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="field-label" style={{ marginBottom: 0 }}>Think it through</div>
        <FieldTextarea id="disc-bi-burden" label="What burden holds the whole book together?" value={disc.bigIdeaBurden}
          onChange={(v) => onSeriesDiscovery({ bigIdeaBurden: v })} rows={2} />
        <FieldTextarea id="disc-bi-recurring" label="What keeps appearing throughout?" value={disc.bigIdeaRecurring}
          onChange={(v) => onSeriesDiscovery({ bigIdeaRecurring: v })} rows={2} />
        <FieldTextarea id="disc-bi-response" label="What response does the author ultimately seek?" value={disc.bigIdeaResponse}
          onChange={(v) => onSeriesDiscovery({ bigIdeaResponse: v })} rows={2} />
        <FieldTextarea id="disc-bi-unifier" label="What unifies the sermons in this series?" value={disc.bigIdeaUnifier}
          onChange={(v) => onSeriesDiscovery({ bigIdeaUnifier: v })} rows={2} />
      </div>

      <div className="card" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="field-label" style={{ marginBottom: 0 }}>Two possibilities</div>
        <BigIdeaCandidate
          id="disc-bi-a" label="Possible big idea A" value={disc.bigIdeaCandidateA}
          onChange={(v) => onSeriesDiscovery({ bigIdeaCandidateA: v })}
          onUse={() => onSeriesField("big_idea", disc.bigIdeaCandidateA || "")}
        />
        <BigIdeaCandidate
          id="disc-bi-b" label="Possible big idea B" value={disc.bigIdeaCandidateB}
          onChange={(v) => onSeriesDiscovery({ bigIdeaCandidateB: v })}
          onUse={() => onSeriesField("big_idea", disc.bigIdeaCandidateB || "")}
        />
      </div>

      <div className="card" style={{ borderLeft: "3px solid var(--gold)", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="field-label" style={{ marginBottom: 0 }}>Establish the series (this is what Outline shows)</div>
        <FieldInput id="disc-canonical-big" label="Series Big Idea" value={series.big_idea}
          onChange={(v) => onSeriesField("big_idea", v)}
          hint="Write it fresh, or use one of your two above. This is the canonical big idea — the same field the Outline's book node holds."
          placeholder="The one line the whole series sounds." />
        <FieldTextarea id="disc-canonical-overview" label="Series Overview" value={series.overview}
          onChange={(v) => onSeriesField("overview", v)} rows={4}
          placeholder="What this book is, and why it matters for this congregation — the arc of the whole. Becomes the study guide's introduction." />
      </div>
    </>
  );
}

function BigIdeaCandidate({ id, label, value, onChange, onUse }) {
  return (
    <div className="field-group" style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <label className="field-label" htmlFor={id} style={{ marginBottom: 0 }}>{label}</label>
        <TextButton onClick={onUse} disabled={!value?.trim()} style={{ fontSize: "12px" }}>Use as the series big idea →</TextButton>
      </div>
      <input id={id} className="field-input" style={{ marginTop: "6px" }} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="One possible way to say it." />
    </div>
  );
}

// ── Step 8 · Planner-Ready Review (read-only projection; not a gate) ──────────────
function ReviewStep({ series, sections, sermons, onNavigate }) {
  const missing = (v) => !String(v || "").trim();
  const named = sermons.filter((s) => !s._draft); // committed preaching texts only
  return (
    <>
      <StepLead>
        A clean read of what you&rsquo;ve produced. Anything still missing is marked plainly, and the objective coverage
        of your book is shown below. This is not a gate — open Outline whenever you&rsquo;re ready; it&rsquo;s the same
        plan without the Discovery scaffolding.
      </StepLead>

      <div className="card" style={{ marginBottom: "16px" }}>
        <SgPart>Book</SgPart>
        <ReviewLine label="Series title" value={series.title} />
        <ReviewLine label="Series big idea" value={series.big_idea} missing={missing(series.big_idea)} />
        <ReviewLine label="Series overview" value={series.overview} missing={missing(series.overview)} multiline />
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <SgPart>Major movements</SgPart>
        {sections.length === 0 ? (
          <ReviewEmpty>No movements yet — map them in Movements.</ReviewEmpty>
        ) : sections.map((s, i) => (
          <div key={s.id} style={{ paddingBottom: "10px", marginBottom: "10px", borderBottom: i < sections.length - 1 ? "1px solid var(--parchment-deep)" : "none" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 600, color: s.title ? "var(--ink)" : "var(--ink-ghost)" }}>
              {i + 1}. {s.title || <em>Untitled movement</em>}
              {s.passage_range && <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-soft)", marginLeft: "8px" }}>{s.passage_range}</span>}
            </div>
            <ReviewLine label="Big idea" value={s.big_idea} missing={missing(s.big_idea)} indent />
            <ReviewLine label="Overview" value={s.overview} missing={missing(s.overview)} indent multiline />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <SgPart>Sermons</SgPart>
        {named.length === 0 ? (
          <ReviewEmpty>No preaching texts yet — add them in Preaching texts.</ReviewEmpty>
        ) : named.map((s, i, arr) => (
          <div key={s.id} style={{ paddingBottom: "10px", marginBottom: "10px", borderBottom: i < arr.length - 1 ? "1px solid var(--parchment-deep)" : "none" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-soft)" }}>{s.passage || "No passage"}</span>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "14px", fontWeight: 600, color: s.title ? "var(--ink)" : "var(--ink-ghost)" }}>{s.title || "Untitled"}</span>
            </div>
            <ReviewLine label="Big idea" value={s.big_idea} missing={missing(s.big_idea)} indent />
            <ReviewLine label="Overview" value={s.overview} missing={missing(s.overview)} indent multiline />
          </div>
        ))}
      </div>

      {/* SeriesDiscover only mounts for a BOOK series, so there is always a book
          to measure; CoveragePanel self-handles the no-book empty state. */}
      <div style={{ marginBottom: "16px" }}>
        <CoveragePanel series={series} sermons={sermons} onNavigate={onNavigate} />
      </div>

      <div className="card" style={{ borderTop: "3px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "var(--ink-soft)" }}>
          Your plan is live in Outline — the clean view of this same work.
        </div>
        <PrimaryButton size="sm" onClick={() => onNavigate?.("book-outline")}>Open Outline →</PrimaryButton>
      </div>
    </>
  );
}

function SgPart({ children }) {
  return <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gold-bright)", marginBottom: "10px" }}>{children}</div>;
}
function ReviewEmpty({ children }) {
  return <div style={{ fontSize: "13px", fontStyle: "italic", color: "var(--ink-ghost)" }}>{children}</div>;
}
function ReviewLine({ label, value, missing = false, indent = false, multiline = false }) {
  return (
    <div style={{ marginTop: "6px", marginLeft: indent ? "14px" : 0 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-ghost)", marginRight: "8px" }}>{label}</span>
      {missing
        ? <span style={{ fontSize: "12.5px", color: "var(--crimson-soft)", fontStyle: "italic" }}>not written yet</span>
        : <span style={{ fontSize: "13.5px", color: "var(--ink)", fontFamily: "var(--font-serif)", lineHeight: 1.55, whiteSpace: multiline ? "pre-wrap" : "normal" }}>{value}</span>}
    </div>
  );
}
