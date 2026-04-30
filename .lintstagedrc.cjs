'use strict';

// Approach A — pre-commit lint runs only against staged files, with the two
// deferred Phase-4 rules (sermonforge/no-raw-button + canonical-loading-verb)
// downgraded via SF_LINT_STAGED=1 so existing baseline noise on touched
// files doesn't block commits. `npm run lint` (no env var) still surfaces
// the full 185-error count as the visible reminder.
//
// The plugin's own rule sources are excluded — canonical-stage-name.js
// contains literal forbidden-alias strings as part of its definition, and
// the rule would self-flag if linted.
const path = require('node:path');

module.exports = {
  '*.{js,jsx,ts,tsx,cjs}': (files) => {
    const filtered = files.filter((f) => {
      const rel = f.replace(/\\/g, '/');
      // Skip the plugin source (self-flagging strings) and dotfiles
      // (ESLint ignores them by default; passing them explicitly produces
      // "File ignored" warnings that --max-warnings 0 upgrades to errors).
      if (rel.includes('eslint-plugin-sermonforge/')) return false;
      if (path.basename(rel).startsWith('.')) return false;
      return true;
    });
    if (filtered.length === 0) return [];
    const args = filtered.map((f) => JSON.stringify(f)).join(' ');
    return `cross-env SF_LINT_STAGED=1 eslint --max-warnings 0 ${args}`;
  },
};
