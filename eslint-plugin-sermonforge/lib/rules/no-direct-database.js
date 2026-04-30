'use strict';

/**
 * no-direct-database — Spine Integrity Gate (subsumes State Contract #1).
 *
 * From docs/CORE.md: "The series is the primary planning unit. The sermon
 * is the atomic unit of content work. Both are first-class canonical state."
 * The spine is the only sermon/series state surface; bypass means components
 * can read or write canonical state without going through the contract gate.
 *
 * Flags imports of any spine-only function name from `src/db/database.js`
 * (with or without `.js` suffix) from outside `src/core/`. This is the
 * lint-layer mirror of `scripts/spine-integrity.js` — lint catches it at
 * editor time before the integrity gate catches it at commit time.
 */
const SPINE_ONLY_NAMES = new Set([
  'getAllSermons', 'getSermonById', 'getSermon',
  'createSermon', 'updateSermon', 'deleteSermon',
  'getRecentSermons', 'getInProgressSermons',
  'getAllSeries', 'getRecentSeries', 'getSeriesById', 'getSeries',
  'createSeries', 'updateSeries', 'deleteSeries',
  'getSermonsBySeries',
  'getSectionsBySeries', 'createSection', 'updateSection', 'deleteSection',
  'loadTourSermon', 'removeTourSermon',
  'transitionState', 'applyMutation', 'persistMutation',
]);

const RE_DATABASE_PATH = /(?:^|\/)db\/database(?:\.js)?$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Spine Integrity Gate: sermon/series helpers must be imported from src/core/spine, not src/db/database.',
      category: 'SermonForge',
    },
    schema: [],
    messages: {
      bypass:
        "Spine Integrity violation: '{{name}}' is sermon/series state — import from 'src/core/spine' instead of 'src/db/database'. (Mirrors scripts/spine-integrity.js.)",
    },
  },
  create(context) {
    const filename = (context.getFilename ? context.getFilename() : context.filename || '').replace(/\\/g, '/');
    if (filename.includes('src/core/')) return {};
    return {
      ImportDeclaration(node) {
        const src = node.source && node.source.value;
        if (typeof src !== 'string' || !RE_DATABASE_PATH.test(src)) return;
        for (const spec of node.specifiers || []) {
          if (spec.type !== 'ImportSpecifier') continue;
          const imported = spec.imported && spec.imported.name;
          if (imported && SPINE_ONLY_NAMES.has(imported)) {
            context.report({ node: spec, messageId: 'bypass', data: { name: imported } });
          }
        }
      },
    };
  },
};
