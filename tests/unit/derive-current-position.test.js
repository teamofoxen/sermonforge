import { describe, it, expect } from "vitest";
import { deriveCurrentPositionFromSermon } from "../../src/utils/sermonState";
import { WALK_ORDER } from "../../src/utils/walkOrder";

// Correctness audit, finding 23 — deriveCurrentPositionFromSermon returned the
// saved last_touched_position composite WITHOUT checking it still exists in the
// walk. A stale/retired composite (a pre-v33 field, or any renamed field without
// a migration) then landed the pastor on the "this part isn't available yet"
// dead-end with no way to write. The fix validates against WALK_ORDER and
// self-heals to the first field.

const first = WALK_ORDER[0];
const firstPos = { stage: first.stage, subPhase: first.subPhase, fieldKey: first.key };

describe("deriveCurrentPositionFromSermon — stale position self-heals", () => {
  it("returns a VALID saved position unchanged", () => {
    const mid = WALK_ORDER[3];
    const ltp = `${mid.stage}/${mid.subPhase}/${mid.key}`;
    expect(deriveCurrentPositionFromSermon({ last_touched_position: ltp })).toEqual({
      stage: mid.stage, subPhase: mid.subPhase, fieldKey: mid.key,
    });
  });

  it("falls back to the first field for a RETIRED composite (e.g. a pre-v33 Assembly/Frame field)", () => {
    expect(
      deriveCurrentPositionFromSermon({ last_touched_position: "Assembly/Frame/hook" }),
    ).toEqual(firstPos);
  });

  it("falls back for a valid stage/subPhase but a nonexistent fieldKey (renamed field)", () => {
    expect(
      deriveCurrentPositionFromSermon({ last_touched_position: "Study/Observe/this_field_was_renamed" }),
    ).toEqual(firstPos);
  });

  it("falls back to the first field when there is no saved position", () => {
    expect(deriveCurrentPositionFromSermon({ last_touched_position: null })).toEqual(firstPos);
    expect(deriveCurrentPositionFromSermon({})).toEqual(firstPos);
  });
});
