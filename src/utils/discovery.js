// discovery — the one place the Series Discovery reasoning envelope is parsed and
// merged. Discovery and Outline are two views of ONE series: a major section IS a
// real section, a preaching text IS a real sermon, and their canonical fields
// (title/passage/big_idea/overview, section_id) live in their own columns. Only
// the exegetical REASONING the pastor authors in the Discover walk — the words
// that cannot truthfully live in a clean planner field — rides the per-entity
// nullable JSON `discovery` column (v34). AI-free: every value is pastor-typed.
//
// The envelope is a FLAT object of well-known keys per entity (below), so merging
// a single sub-field is a plain spread and can never drop a sibling. Fail-soft:
// null / non-string / malformed / wrong-shape all degrade to {} — never throws,
// never blocks (shares parseJsonObject with parseStudyGuideExtras). Fail-soft
// also means retired keys are simply ignored: the `decisions` array written by
// the removed Difficult Decisions step (2026-07-22 simplification) may still sit
// in old envelopes; nothing reads or writes it anymore.
//
//   series.discovery          — Immerse notes, Understand answers, Series-Big-
//                               Idea reasoning + the two candidates. The FINAL
//                               canonical Series Big Idea is series.big_idea; the
//                               Overview is series.overview — this holds only the
//                               working-out.
//   series_sections.discovery — { whyBegin, whyEnd } (major-section boundaries).
//   sermons.discovery         — { whyBegin, whyEnd, subject, complement,
//                               authorialFunction } (preaching-text reasoning).

import { parseJsonObject } from "./json";

// Parse a `discovery` column value into a plain object. Fail-soft to {}.
export function parseDiscovery(raw) {
  return parseJsonObject(raw);
}

// Merge a shallow patch into the parsed envelope and return the JSON string to
// persist. Each Discover field edit sends its sub-field's COMPLETE new value, so a
// spread preserves every other sub-field.
export function mergeDiscovery(raw, patch) {
  return JSON.stringify({ ...parseDiscovery(raw), ...patch });
}

// "What is the author doing here?" — plain, pastor-facing choices for a
// preaching text's authorial function, plus Other (free text). AI-free: these are
// a fixed vocabulary the pastor PICKS from, not a suggestion the system generates.
export const AUTHORIAL_FUNCTIONS = [
  "Commanding",
  "Warning",
  "Encouraging",
  "Explaining",
  "Correcting",
  "Comforting",
  "Rebuking",
  "Exhorting",
  "Defending",
  "Celebrating",
  "Other",
];
