// Context section label constants.
// Single source of truth for the labeled sections emitted by assembleContext()
// in contextBuilder.js and referenced in the MESSAGE CONTEXT RULES of
// buildSystemPrompt() in AIPanel.jsx.
// A label may only be defined here — never as a string literal in either file.

export const CONTEXT_SECTIONS = Object.freeze({
  PASSAGE:        "[PASSAGE & MPT]",
  THIS_SERMON:    "[THIS SERMON]",
  INTERPRETATION: "[INTERPRETATION]",
  STRUCTURE:      "[STRUCTURE]",
  SERIES:         "[SERIES CONTEXT]",
  SUPPORTING:     "[SUPPORTING MATERIAL]",
  PASTOR:         "[PASTOR CONTEXT]",
});
