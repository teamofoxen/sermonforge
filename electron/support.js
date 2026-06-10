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

module.exports = { SUPPORT_EMAIL };
