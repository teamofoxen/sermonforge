// electron/support.js — the one place the support channel is defined.
//
// Currently the developer's personal inbox — fine for the beta cohort.
// FLAGGED: when a dedicated forwarding address exists (e.g.
// sermonforge@teamofoxen.com), swap it here and in the renderer mirror
// (src/constants/support.js) together. Dialog copy must always print the
// address in plain text, never rely on a clickable mailto — native dialogs
// can't click, and the pastor's machine may have no mail handler.

"use strict";

const SUPPORT_EMAIL = "ross.appleton@gmail.com";

// Where a pastor gets the installer by hand. Used when the updater cannot
// finish a download: telling him "it failed" without telling him where to
// go leaves him stranded on his installed version with no way forward.
const DOWNLOAD_PAGE = "teamofoxen.com/sermonforge";

// The pre-boot route. The email above is the in-app channel — useless to a
// pastor whose installer or app will not start, which is exactly how the
// Intel boot crash went unreported for 74 days (2026-07-20 audit, M14).
// Verified 2026-07-20: the repository is public and has issues enabled.
const SUPPORT_ISSUES_URL = "https://github.com/teamofoxen/sermonforge/issues";

module.exports = { SUPPORT_EMAIL, DOWNLOAD_PAGE, SUPPORT_ISSUES_URL };
