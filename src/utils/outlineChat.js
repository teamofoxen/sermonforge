import { createOutlinePoint } from "../utils";
export { OUTLINE_SYSTEM } from "../prompts/outline";

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
