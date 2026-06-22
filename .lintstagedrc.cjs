'use strict';

// Pre-commit lint runs only against staged files — all rules at full severity.
// The plugin's own rule sources are excluded because canonical-stage-name.js
// contains literal forbidden-alias strings and would self-flag if linted.
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
    return `eslint --max-warnings 0 ${args}`;
  },
};
