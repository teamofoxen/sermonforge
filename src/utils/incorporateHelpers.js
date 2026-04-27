/**
 * incorporateHelpers.js
 *
 * Field configuration and prompt construction for the Incorporate flow
 * (AI review → propose revisions → diff → accept).
 * Extracted from AIPanel.jsx — no React, no state, no side effects.
 *
 * Exports:
 *   getStepFieldConfig(step)                             → config | null
 *   getCurrentFieldData(config, sermon)                  → object
 *   buildIncorporatePrompt(config, current, reviewContent) → string
 */

import { STEPS, PHASES } from "../constants/steps";
import {
  OBSERVE_FIELDS,
  INTERPRET_FIELDS,
  REDEMPTIVE_FIELDS,
  REDEMPTIVE_SUMMARY_KEY,
  IMPLICATIONS_THEOLOGICAL,
  IMPLICATIONS_PERSONAL,
  IMPLICATIONS_UNBELIEVER_KEY,
  IMPLICATIONS_COMPILED_KEY,
  parseStructuredField,
} from "./studyFields";

/**
 * Map a review step to its target field configuration.
 * Returns null for steps that don't have an incorporate target.
 *
 * @param {string} step
 * @returns {{ type: string, column?: string, label: string, fieldDefs: Array } | null}
 */
export function getStepFieldConfig(step) {
  switch (step) {
    case PHASES.OBSERVE:
      return { type: "json", column: "observations", label: "Observations", fieldDefs: OBSERVE_FIELDS };
    case PHASES.INTERPRET:
      return { type: "json", column: "interpretation", label: "Interpretation", fieldDefs: INTERPRET_FIELDS };
    case PHASES.REDEMPTIVE_THREAD:
      return {
        type: "json", column: "redemptive_thread", label: "Redemptive Thread",
        fieldDefs: [...REDEMPTIVE_FIELDS, { key: REDEMPTIVE_SUMMARY_KEY, label: "Summary" }],
      };
    case PHASES.IMPLICATIONS:
      return {
        type: "json", column: "implications", label: "Implications",
        fieldDefs: [
          ...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL,
          { key: IMPLICATIONS_UNBELIEVER_KEY, label: "Implications for Unbelievers" },
          { key: IMPLICATIONS_COMPILED_KEY,   label: "Compiled Implications" },
        ],
      };
    case STEPS.MPT_MPS:
      return {
        type: "mpt_mps", label: "MPT / MPS",
        fieldDefs: [{ key: "mpt", label: "MPT" }, { key: "mps", label: "MPS" }],
      };
    default:
      return null;
  }
}

/**
 * Read the current field values for a given config from the sermon record.
 *
 * @param {{ type: string, column?: string, fieldDefs: Array }} config
 * @param {object} sermon
 * @returns {object}
 */
export function getCurrentFieldData(config, sermon) {
  if (config.type === "mpt_mps") {
    return { mpt: sermon?.mpt || "", mps: sermon?.mps || "" };
  }
  return parseStructuredField(sermon?.[config.column]);
}

/**
 * Build the incorporate prompt that asks the AI to revise current content
 * based on review feedback.
 *
 * @param {{ label: string, fieldDefs: Array<{ key: string, label: string }> }} config
 * @param {object} current       — current field values keyed by fieldDef.key
 * @param {string} reviewContent — the AI review text to incorporate
 * @returns {string}
 */
export function buildIncorporatePrompt(config, current, reviewContent) {
  const keys = config.fieldDefs.map(f => f.key);
  const currentLabeled = config.fieldDefs
    .map(f => `${f.label}: ${current[f.key] || "(empty)"}`)
    .join("\n");

  return (
    `Current content for ${config.label}:\n${currentLabeled}\n\n` +
    `Review feedback:\n${reviewContent}\n\n` +
    `Based on this feedback, produce a revised version of the content above.\n` +
    `Return a JSON object with these exact keys: ${JSON.stringify(keys)}\n` +
    `Include all keys — use the original value for anything you are not changing.`
  );
}
