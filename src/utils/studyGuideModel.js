// Study guide view model — the shared shape behind the Study-guide tab preview
// (src/components/SeriesPlanner.jsx StudyGuideTab) and the .docx exporter
// (electron/main.js buildStudyGuideDoc).
//
// Source of truth. A hand-maintained mirror lives at
// `electron/studyGuideModel.cjs` because the main process is CommonJS (per
// CORE.md ESM/CJS boundary) and `src/` is not packaged into the app, so
// main.js cannot import this file directly. Both files MUST be edited
// together — drift means the on-screen preview and the exported handout
// disagree (audit M6).
//
// Returns the section grouping both renderers share: each section paired with
// its sermons, plus any unsectioned ("remaining") sermons. (The old Part-3
// working-hypothesis de-dupe flag was removed in the 2026-06-24 content-model
// rebuild — the emerging_big_idea / working-hypothesis concept is gone.)
export function buildStudyGuideModel(series, sections, sermons) {
  // Group sermons into their sections, skipping blank section shells that have
  // no title/metadata and no assigned sermons.
  const assignedIds = new Set();
  const sectionGroups = [];
  for (const section of sections) {
    const sectionSermons = sermons.filter(s => s.section_id === section.id);
    sectionSermons.forEach(s => assignedIds.add(s.id));
    const empty =
      !section.title?.trim() &&
      !section.passage_range?.trim() &&
      !section.big_idea?.trim() &&
      !section.overview?.trim() &&
      sectionSermons.length === 0;
    if (!empty) sectionGroups.push({ section, sermons: sectionSermons });
  }
  const remainingSermons = sermons.filter(s => !assignedIds.has(s.id));

  return {
    sectionGroups,
    remainingSermons,
    hasSections: sections.length > 0,
  };
}
