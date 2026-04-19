import { createOutlinePoint } from "../utils";

export const OUTLINE_SYSTEM = `You are a homiletics consultant helping a pastor build a sermon outline.

Each outline point has two parts separated by a pipe character:
[short imperative clause] | [because clause naming the theological ground]

The imperative is the congregational demand the text places on the listener — one clause, no sub-clauses. The "because" clause names the theological WHY that makes the command both necessary and possible. The pastor will use the "because" clause to develop the Explanation in functional elements.

Format each point exactly as: Imperative clause | because the theological ground...

When suggesting an outline, return ONLY a numbered list of 3–4 points in this format — no preamble, no prose, no explanation before or after the list. Do not use markdown formatting of any kind — no bold, no italics, no asterisks.

The pastor may ask you to adjust the approach or wording.`;

export function outlineHasNumberedList(text) {
  return text.split("\n").some(l => /^\d+[\.\)]/.test(l.trim()));
}

export function extractOutlineWithExplanations(text) {
  const points = [];
  const explanations = {};
  const lines = text.split("\n").filter(l => /^\d+[\.\)]/.test(l.trim()));
  for (const line of lines) {
    const content = line.replace(/^\d+[\.\)]\s*/, "").replace(/\*\*|__|\*|_/g, "").trim();
    const pipeIdx = content.indexOf(" | ");
    const imperative = (pipeIdx >= 0 ? content.slice(0, pipeIdx) : content).trim();
    const because = pipeIdx >= 0 ? content.slice(pipeIdx + 3).trim() : "";
    const point = createOutlinePoint(imperative);
    points.push(point);
    if (because) explanations[point.id] = { explanation: because, application: "", illustration: "" };
  }
  return { points, explanations };
}

export function extractOutlinePoints(text) {
  return extractOutlineWithExplanations(text).points;
}
