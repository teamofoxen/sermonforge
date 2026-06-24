// MIRROR of `src/utils/studyGuideModel.js`.
//
// This file exists because `electron/main.js` is CommonJS (per CORE.md ESM/CJS
// boundary) and `src/` is not packaged into the app (electron-builder ships
// `dist/` + `electron/` only), so main.js cannot import the renderer source
// directly. Vite bundles the renderer; the main process runs raw JS.
//
// Both files MUST be edited together. Drift means the on-screen Study Guide
// preview and the exported .docx handout disagree (audit M6).
//
// Source of truth: `src/utils/studyGuideModel.js`.
'use strict';

function buildStudyGuideModel(series, sections, sermons) {
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

module.exports = { buildStudyGuideModel };
