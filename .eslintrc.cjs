'use strict';

// SermonForge — ESLint config.
//
// Layered enforcement (with scripts/spine-integrity.js + tests/contracts/):
// the lint layer catches violations at editor time, the integrity gate at
// commit time, and the test layer at CI time. All three cite docs/CORE.md
// clauses on failure.
//
// Lint approach: Approach A (lint-staged). Pre-commit lints only the staged
// files, so existing deferred-Phase noise (no-raw-button, canonical-loading-verb)
// doesn't block commits, but new violations on touched files do.

module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  plugins: ['sermonforge', 'react-hooks', 'react'],
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'build/**',
    'resources/**',
    // The plugin's rule sources contain literal forbidden-alias strings as
    // part of their own definitions ('writing', 'ready', 'archived' in
    // canonical-stage-name.js); ignored so the rule doesn't flag itself.
    'eslint-plugin-sermonforge/**',
    'tests/contracts/_fixtures/**',
  ],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: { sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
  ],
  rules: {
    // Approach A: when invoked from .lintstagedrc.cjs (pre-commit), the env
    // var SF_LINT_STAGED=1 downgrades the two deferred-Phase-4 rules to
    // 'off' so existing baseline noise on touched files doesn't block
    // commits. `npm run lint` (no env var set) still surfaces the full
    // count as the visible reminder.
    'sermonforge/no-raw-button': process.env.SF_LINT_STAGED ? 'off' : 'error',
    'sermonforge/canonical-loading-verb': process.env.SF_LINT_STAGED ? 'off' : 'error',
    // Structural rules — always enforced.
    'sermonforge/no-window-alert': 'error',
    'sermonforge/no-direct-database': 'error',
    'sermonforge/no-direct-ai': 'error',
    'sermonforge/canonical-stage-name': 'error',
    // react-hooks plugin registered so existing inline
    // `eslint-disable-line react-hooks/exhaustive-deps` directives resolve.
    // rules-of-hooks catches real hook bugs (hooks called conditionally);
    // exhaustive-deps left off because it produces noisy false positives
    // around intentional dep-array narrowing (see AIPanel.jsx:104).
    'react-hooks/rules-of-hooks': 'error',
    // Structural enforcement against the consumer-side import-drift class
    // documented in docs/ENFORCEMENT_STATUS.md. The Pilot C → SeriesPlanner
    // regression — `getSeriesById` imported from a spine that only exports
    // `getSeries` — passed lint, the integrity gate, and the Path B contract
    // test fixture, surfacing only as a runtime crash. `react/jsx-no-undef`
    // catches missing-import cases on JSX components; `no-undef` catches the
    // same on non-JSX symbols (function calls, member accesses, hooks).
    'react/jsx-no-undef': 'error',
    'no-undef': 'error',
  },
};
