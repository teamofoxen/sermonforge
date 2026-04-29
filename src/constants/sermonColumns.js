// Renderer-side mirror of SERMON_COLUMNS in electron/main.js. Used by
// SermonWorkspace to filter its optimistic state object down to the columns
// buildUpdate() will accept BEFORE the IPC call. Without this, the renderer
// posts JOIN-derived fields (series_title, series_color, the attached
// `series` and `section` objects) plus `id`/`created_at`/`updated_at`, and
// buildUpdate's dev-throw guard rejects the whole UPDATE — silently in
// renderer's try/catch — so user edits never reach the DB in dev mode.
//
// MUST stay in sync with the SERMON_COLUMNS Set in electron/main.js. When you
// add a column there, mirror it here. The main-side allowlist is still the
// security boundary; this is just a UX guard against the dev throw.

export const SERMON_COLUMNS = new Set([
  "title", "passage", "date", "preacher", "stage", "mpt", "mps",
  "observations", "interpretation", "redemptive_thread", "implications",
  "outline", "manuscript", "delivery_notes", "timing_notes", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  "topic_theme", "audience_assumptions", "background_noise", "study_guide_note",
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
]);

export function pickSermonColumns(obj) {
  const out = {};
  if (!obj) return out;
  for (const k of Object.keys(obj)) {
    if (SERMON_COLUMNS.has(k)) out[k] = obj[k];
  }
  return out;
}
