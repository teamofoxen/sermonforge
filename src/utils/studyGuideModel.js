// Study guide view model — the shared shape behind the Study Guide preview
// (src/components/SeriesPlanner.jsx StudyGuideModal) and the .docx exporter.
//
// Source of truth. A hand-maintained mirror lives at
// `electron/studyGuideModel.cjs` because the main process is CommonJS (per
// CORE.md ESM/CJS boundary) and `src/` is not packaged into the app, so
// main.js cannot import this file directly. Both files MUST be edited
// together — drift means the on-screen preview and the exported handout
// disagree (audit M6).
//
// Returns the computed values both renderers share: the Part-3
// working-hypothesis de-dupe flag and the Part-4 section grouping.
export function buildStudyGuideModel(series, sections, sermons) {
  // Part 3: suppress the working hypothesis when it already matches the
  // final Series Big Idea — printing the same sentence twice is noise.
  const showWorkingHypothesis =
    !!series.emerging_big_idea &&
    series.emerging_big_idea.trim().length > 0 &&
    series.emerging_big_idea.trim() !== (series.big_idea || '').trim();

  // Part 4: group sermons into their sections, skipping blank section
  // shells that have no title/metadata and no assigned sermons.
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
    showWorkingHypothesis,
    sectionGroups,
    remainingSermons,
    hasSections: sections.length > 0,
  };
}
