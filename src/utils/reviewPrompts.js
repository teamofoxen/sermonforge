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
import { getOutline } from "../utils";

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

  if (tab === "study") {
    const phasePrompts = {
      [PHASES.OBSERVE]:
        `Review these observations about ${passage}. Are the main features of the text captured — context, divisions, commands, statements, characters, big ideas? What is missing or underdeveloped?\n\nMy observations:\n${sermon?.observations || "(none)"}`,
      [PHASES.INTERPRET]:
        `Review this interpretation work on ${passage}. Does it move from observation to meaning correctly? Are contrasts, recurring ideas, and key words identified? What gaps remain?\n\nMy interpretation:\n${sermon?.interpretation || "(none)"}`,
      [PHASES.REDEMPTIVE_THREAD]:
        `Review this redemptive thread summary for ${passage}. Does it accurately locate this passage in redemptive history? Is Christ's role clear and textually grounded, not imported?\n\nMy redemptive thread notes:\n${sermon?.redemptive_thread || "(none)"}`,
      [PHASES.IMPLICATIONS]:
        `Review these implications drawn from ${passage}. Are they theologically grounded? Do they address both believers and unbelievers? Do they go deeper than behavioral steps?\n\nMy implications:\n${sermon?.implications || "(none)"}`,
    };

    if (activeStep && phasePrompts[activeStep]) {
      return {
        system: "Give direct, specific, constructive feedback as a biblical scholar and homiletics mentor would.",
        prompt: phasePrompts[activeStep],
      };
    }

    // Step 2: MPT/MPS
    if (activeStep === STEPS.MPT_MPS) {
      return {
        system:
          "Act as a rigorous challenger. Push back, probe weaknesses, and expose where the MPT or MPS does not hold up. Do not offer encouragement unless the work genuinely earns it. If something is weak, say so directly. The pastor needs a tough critic here, not a supportive mentor.",
        prompt:
          `Challenge the MPT and MPS for ${passage}.\n\nMPT: ${mpt || "(none)"}\nMPS: ${mps || "(none)"}\n\nProbe each one:\n- Is the MPT the actual main point of the text, or is it what the pastor wanted to find? Can you poke a hole in it?\n- Does the MPS flow organically from the MPT, or is it an import from somewhere else?\n- Is the MPT-to-MPS movement legitimate, or is the preacher smuggling in a point the text doesn't make?\n- What is the weakest part of this formulation?`,
      };
    }

    // Step 3: Outline
    if (activeStep === STEPS.OUTLINE) {
      const outline = getOutline(sermon);
      return {
        system: "Review this outline for homiletical strength.",
        prompt:
          `Review this sermon outline for ${passage}.\n\nMPT: ${mpt}\nMPS: ${mps}\n\nOutline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n") || "(none)"}\n\nDo the points derive from the text? Do they serve the MPS? Is the progression clear?`,
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
    return {
      system: "Review this study work as a biblical scholar and homiletics mentor would.",
      prompt:
        `Review the study work for ${passage}.\n\nObservations: ${sermon?.observations || "(none)"}\n\nInterpretation: ${sermon?.interpretation || "(none)"}\n\nRedemptive thread: ${sermon?.redemptive_thread || "(none)"}\n\nImplications: ${sermon?.implications || "(none)"}\n\nMPT: ${mpt}\nMPS: ${mps}\n\nIs the exegetical work thorough? Is the MPT historically grounded? Does the MPS flow from the text?`,
    };
  }

  if (tab === "outline") {
    const outline = getOutline(sermon);
    return {
      system: "Review this outline for homiletical strength.",
      prompt:
        `Review this sermon outline for ${passage}.\n\nMPT: ${mpt}\nMPS: ${mps}\n\nOutline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}\n\nDo the points derive from the text? Do they serve the MPS? Is the progression clear?`,
    };
  }

  if (tab === "manuscript") {
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

  if (tab === "delivery") {
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
