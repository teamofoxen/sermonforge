import { describe, it, expect } from "vitest";
import { deriveQuestionStatesFromSermon } from "./sermonState";
import { questionId } from "./walkOrder";

// The Sermon Body ("functional-elements") map-gating ruling (OEM walk,
// 2026-07-02): a point reads "answered" when its Scripture + Explanation +
// Application are written; Illustration never gates (it "serves"), though it
// still counts toward "partial" and the preview. The gating rule lives in the
// field def (illustration carries `gating: false`) and is read by
// deriveQuestionStatesFromSermon. This locks that behavior — the map-gating
// path had no coverage before.

const BODY_ID = questionId({
  stage: "Manuscript",
  subPhase: "Body",
  fieldKey: "equip",
  questionKey: "elements",
});

// Build a sermon record with the given outline points + functional elements.
function sermonWith(points, functionalElements) {
  return {
    outline: JSON.stringify(points),
    functional_elements: JSON.stringify(functionalElements),
  };
}

const full = { scripture: "v.1", explanation: "e", application: "a" };

describe("Sermon Body map gating (deriveQuestionStatesFromSermon)", () => {
  it("every point with Scripture + Explanation + Application reads answered (no illustration needed)", () => {
    const sermon = sermonWith(
      [{ id: "p1", text: "One" }, { id: "p2", text: "Two" }],
      { p1: { ...full }, p2: { ...full } }
    );
    expect(deriveQuestionStatesFromSermon(sermon)[BODY_ID].state).toBe("answered");
  });

  it("a point missing only Illustration still reads answered — illustration never gates", () => {
    const sermon = sermonWith(
      [{ id: "p1", text: "One" }],
      { p1: { ...full } } // no illustration
    );
    expect(deriveQuestionStatesFromSermon(sermon)[BODY_ID].state).toBe("answered");
  });

  it("a point missing a gating cell (Application) reads partial", () => {
    const sermon = sermonWith(
      [{ id: "p1", text: "One" }, { id: "p2", text: "Two" }],
      { p1: { ...full }, p2: { scripture: "v.2", explanation: "e" } } // no application
    );
    expect(deriveQuestionStatesFromSermon(sermon)[BODY_ID].state).toBe("partial");
  });

  it("an illustration-only point reads partial, not answered", () => {
    const sermon = sermonWith(
      [{ id: "p1", text: "One" }],
      { p1: { illustration: "a story" } }
    );
    expect(deriveQuestionStatesFromSermon(sermon)[BODY_ID].state).toBe("partial");
  });

  it("no cells filled reads unanswered", () => {
    const sermon = sermonWith([{ id: "p1", text: "One" }], {});
    expect(deriveQuestionStatesFromSermon(sermon)[BODY_ID].state).toBe("unanswered");
  });

  it("an empty outline reads unanswered", () => {
    const sermon = sermonWith([], {});
    expect(deriveQuestionStatesFromSermon(sermon)[BODY_ID].state).toBe("unanswered");
  });
});
