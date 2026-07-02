// SearchResultSnippet — renders the snippet returned by `searchSermons`
// with the matched range highlighted. The backend wraps the matched
// substring in `‹mark›…‹/mark›` (single-guillemet markers, not HTML
// brackets) so we can split safely without an HTML escape round-trip.
//
// A small per-column label sits in front of the snippet so the pastor
// sees WHERE the match landed (e.g., "STUDY NOTEBOOK · …prodigal…").

const COLUMN_LABELS = {
  title:               "TITLE",
  passage:             "PASSAGE",
  series_title:        "SERIES",
  observations:        "STUDY · OBSERVE",
  interpretation:      "STUDY · INTERPRET",
  redemptive_thread:   "STUDY · REDEMPTIVE THREAD",
  implications:        "STUDY · IMPLICATIONS",
  main_point_pair:     "ANCHOR · MAIN POINT PAIR",
  outline:             "OUTLINE",
  manuscript:          "MANUSCRIPT",
  // sermon_frame is a legacy column post-Frame-collapse (2026-07-02): old
  // sermons' frame answers still index; matches land at the Manuscript doors.
  sermon_frame:        "MANUSCRIPT · INTRO / CONCLUSION (LEGACY FRAME)",
  notebook_study:      "STUDY NOTEBOOK",
  notebook_blueprint:  "ASSEMBLY NOTEBOOK",
  notebook_manuscript: "MANUSCRIPT NOTEBOOK",
  // v24 — functional_elements (the sermon body) replaced the struck
  // delivery_notes / timing_notes index columns. Region renamed Body in the
  // OEM restructure (2026-07-02).
  functional_elements: "BODY · SERMON BODY",
};

export default function SearchResultSnippet({ matchedColumn, snippet }) {
  if (!snippet) return null;
  const label = COLUMN_LABELS[matchedColumn] || "";
  // Split on the open marker, then each piece on the close marker. The
  // matched substring is everything between an open and the next close;
  // text outside the pair renders plain.
  const parts = [];
  let remaining = snippet;
  let i = 0;
  while (remaining.length > 0) {
    const openIdx = remaining.indexOf("‹mark›");
    if (openIdx < 0) {
      parts.push(<span key={i++}>{remaining}</span>);
      break;
    }
    if (openIdx > 0) {
      parts.push(<span key={i++}>{remaining.slice(0, openIdx)}</span>);
    }
    const after = remaining.slice(openIdx + "‹mark›".length);
    const closeIdx = after.indexOf("‹/mark›");
    if (closeIdx < 0) {
      parts.push(<mark key={i++}>{after}</mark>);
      break;
    }
    parts.push(<mark key={i++}>{after.slice(0, closeIdx)}</mark>);
    remaining = after.slice(closeIdx + "‹/mark›".length);
  }
  return (
    <div className="sermon-card-snippet">
      {label && <span className="sermon-card-snippet-label tw-mono">{label}</span>}
      {parts}
    </div>
  );
}
