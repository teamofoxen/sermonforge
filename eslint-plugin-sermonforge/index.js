'use strict';

// SermonForge — local ESLint plugin.
// Each rule cites the contract clause it enforces from docs/CORE.md.

module.exports = {
  rules: {
    'no-raw-button': require('./lib/rules/no-raw-button'),
    'no-window-alert': require('./lib/rules/no-window-alert'),
    'no-direct-database': require('./lib/rules/no-direct-database'),
    'no-direct-ai': require('./lib/rules/no-direct-ai'),
    'canonical-loading-verb': require('./lib/rules/canonical-loading-verb'),
    'canonical-stage-name': require('./lib/rules/canonical-stage-name'),
  },
};
