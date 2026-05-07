/**
 * reviewPrompts.js
 *
 * Prompt construction for AI review actions in the sermon workspace.
 * Extracted from AIPanel.jsx — no React, no state, no side effects.
 *
 * Exports:
 *   getReviewPrompt(tab, sermon, activeStep) → { prompt, system }
 *   buildCoherenceCheckPrompt(sermon)        → { prompt, system }
 */

import { STEPS, PHASES } from "../constants/steps";
import { STAGE } from "../core/contracts";
import { getOutline } from "../utils";
import {
  OUTLINE_REVIEW_TASK, CHALLENGE_MPT_TASK,
  OBSERVE_LOOK_AGAIN_TASK, INTERPRET_LOOK_AGAIN_TASK, REDEMPTIVE_LOOK_AGAIN_TASK, IMPLICATIONS_LOOK_AGAIN_TASK,
} from "../prompts/study";
import {
  OBSERVE_FIELDS, INTERPRET_FIELDS, REDEMPTIVE_FIELDS, IMPLICATIONS_FIELDS,
  parseStructuredField, flattenToText,
} from "./studyFields";

/**
 * Build the prompt and system message for the "Review My Work" action.
 * Covers every tab (study, outline, manuscript, delivery) and every
 * study phase (observe, interpret, redemptive thread, implications,
 * mpt/mps, outline, functional elements).
 *
 * @param {string} tab         — active tab identifier
 * @param {object} sermon      — current sermon record
 * @param {string} activeStep  — active step/phase identifier within the tab
 * @returns {{ prompt: string, system: string }}
 */
export function getReviewPrompt(tab, sermon, activeStep) {
  const passage = sermon?.passage || "the passage";
  const mpt = sermon?.mpt || "";
  const mps = sermon?.mps || "";

  if (tab === STAGE.Study) {
    if (activeStep === PHASES.OBSERVE) {
      const obsData = parseStructuredField(sermon?.observations);
      const filled = flattenToText(obsData, OBSERVE_FIELDS);
      return {
        system: OBSERVE_LOOK_AGAIN_TASK,
        prompt: `Observations on ${passage}:\n\n${filled || "(none yet)"}`,
      };
    }

    if (activeStep === PHASES.INTERPRET) {
      const intData = parseStructuredField(sermon?.interpretation);
      const filled = flattenToText(intData, INTERPRET_FIELDS);
      return {
        system: INTERPRET_LOOK_AGAIN_TASK,
        prompt: `Interpretation of ${passage}:\n\n${filled || "(none yet)"}`,
      };
    }

    if (activeStep === PHASES.REDEMPTIVE_THREAD) {
      const redData = parseStructuredField(sermon?.redemptive_thread);
      const filled = flattenToText(redData, REDEMPTIVE_FIELDS);
      return {
        system: REDEMPTIVE_LOOK_AGAIN_TASK,
        prompt: `Redemptive thread for ${passage}:\n\n${filled || "(none yet)"}`,
      };
    }

    if (activeStep === PHASES.IMPLICATIONS) {
      const impData = parseStructuredField(sermon?.implications);
      const filled = flattenToText(impData, IMPLICATIONS_FIELDS);
      return {
        system: IMPLICATIONS_LOOK_AGAIN_TASK,
        prompt: `Implications from ${passage}:\n\n${filled || "(none yet)"}`,
      };
    }

    // Step 2: MPT/MPS
    if (activeStep === STEPS.MPT_MPS) {
      return {
        system: CHALLENGE_MPT_TASK,
        prompt:
          `Challenge the MPT and MPS for ${passage}.\n\nMPT: ${mpt || "(none)"}\nMPS: ${mps || "(none)"}\n\nProbe each one:\n- Is the MPT the actual main point of the text, or is it what the pastor wanted to find? Can you poke a hole in it?\n- Does the MPS flow organically from the MPT, or is it an import from somewhere else?\n- Is the MPT-to-MPS movement legitimate, or is the preacher smuggling in a point the text doesn't make?\n- What is the weakest part of this formulation?`,
      };
    }

    // Step 3: Outline
    if (activeStep === STEPS.OUTLINE) {
      const outline = getOutline(sermon);
      return {
        system: OUTLINE_REVIEW_TASK,
        prompt:
          `Review this sermon outline for ${passage}.\n\nMPT: ${mpt}\nMPS: ${mps}\n\nOutline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n") || "(none)"}`,
      };
    }

    // Step 4: Functional Elements
    if (activeStep === STEPS.FUNCTIONAL_ELEMENTS) {
      const outline = getOutline(sermon);
      const fe = sermon?.functional_elements
        ? (typeof sermon.functional_elements === "string"
            ? (() => { try { return JSON.parse(sermon.functional_elements); } catch { return {}; } })()
            : sermon.functional_elements)
        : {};
      const feLines = outline
        .map((p, i) => {
          const entry = fe[p.id] || {};
          const explanation  = entry.explanation?.trim()  || "(none)";
          const application  = entry.application?.trim()  || "(none)";
          const illustration = entry.illustration?.trim() || "(none)";
          return `Point ${i + 1}: ${p.text}\n  Explanation: ${explanation}\n  Application: ${application}\n  Illustration: ${illustration}`;
        })
        .join("\n\n");
      return {
        system: "Review the functional elements for homiletical strength. Be thorough — evaluate each point individually.",
        prompt:
          `Review the functional elements for each outline point in this sermon on ${passage}.\n\nMPS: ${mps || "(none)"}\n\nFor each point, evaluate:\n- Does the explanation ground the point in the text and the author's intent?\n- Is the application specific, gospel-shaped, and not merely behavioral?\n- Does the illustration serve the point, or does it distract from it?\n- Is anything missing that the point genuinely needs?\n\n${feLines || "(No functional elements recorded)"}`,
      };
    }

    // Full study review (fallback)
    const obsFlat = flattenToText(parseStructuredField(sermon?.observations),     OBSERVE_FIELDS);
    const intFlat = flattenToText(parseStructuredField(sermon?.interpretation),   INTERPRET_FIELDS);
    const redFlat = flattenToText(parseStructuredField(sermon?.redemptive_thread), REDEMPTIVE_FIELDS);
    const impFlat = flattenToText(parseStructuredField(sermon?.implications),     IMPLICATIONS_FIELDS);
    return {
      system: "Review this study work as a biblical scholar and homiletics mentor would.",
      prompt:
        `Review the study work for ${passage}.\n\nObservations:\n${obsFlat || "(none yet)"}\n\nInterpretation:\n${intFlat || "(none yet)"}\n\nRedemptive thread:\n${redFlat || "(none yet)"}\n\nImplications:\n${impFlat || "(none yet)"}\n\nMPT: ${mpt || "(none)"}\nMPS: ${mps || "(none)"}\n\nIs the exegetical work thorough? Is the MPT historically grounded? Does the MPS flow from the text?`,
    };
  }

  if (tab === STAGE.Blueprint) {
    const outline = getOutline(sermon);
    return {
      system: OUTLINE_REVIEW_TASK,
      prompt:
        `Review this sermon outline for ${passage}.\n\nMPT: ${mpt}\nMPS: ${mps}\n\nOutline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}`,
    };
  }

  if (tab === STAGE.Manuscript) {
    const manuscriptText = sermon?.manuscript || "(none)";
    const manuscriptForReview =
      manuscriptText.length > 8000
        ? manuscriptText.substring(0, 8000) + "\n\n(manuscript truncated for review — full text in editor)"
        : manuscriptText;
    return {
      system: "Provide a structured manuscript review.",
      prompt:
        `Review this sermon manuscript.\n\nPassage: ${passage}\nMPT: ${mpt}\nMPS: ${mps}\n\nManuscript:\n${manuscriptForReview}\n\nGive a brief assessment of: text governance, structural alignment, gospel necessity, and one concrete improvement.`,
    };
  }

  if (tab === STAGE.Delivery) {
    return {
      system: "Review this from a preaching coach's perspective.",
      prompt: `Based on the sermon outline and manuscript for ${passage}, what should this preacher be thinking about for effective delivery?`,
    };
  }

  return {
    system: "Give brief, constructive feedback on the current sermon.",
    prompt: `Review the current sermon on ${passage} and give brief, constructive feedback.`,
  };
}

/**
 * Build the prompt and system message for the "Check Series Alignment" action.
 * Returns null if the sermon has no series big idea (button should not appear).
 *
 * @param {object} sermon — current sermon record
 * @returns {{ prompt: string, system: string } | null}
 */
export function buildCoherenceCheckPrompt(sermon) {
  const seriesBigIdea  = sermon?.series?.big_idea;
  const sectionBigIdea = sermon?.section?.big_idea;
  if (!seriesBigIdea) return null;

  const outline = getOutline(sermon);
  const parts = [];
  if (sermon?.mpt)          parts.push(`MPT: "${sermon.mpt}"`);
  if (outline.length > 0)   parts.push(`Outline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}`);
  parts.push(`Series big idea: "${seriesBigIdea}"`);
  if (sectionBigIdea)       parts.push(`Section big idea: "${sectionBigIdea}"`);

  return {
    system:
      "Review whether this sermon fits its series without losing its textual integrity. " +
      "Be direct and specific. Divergence is not always a problem — say so when it is warranted by the text.",
    prompt:
      parts.join("\n\n") +
      "\n\nEvaluate series alignment:\n" +
      "1. Where is the alignment between this sermon and the series framework strong?\n" +
      "2. Where does this sermon diverge from the series framework?\n" +
      "3. Is that divergence textually necessary and helpful, or distracting?",
  };
}
