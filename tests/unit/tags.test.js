import { describe, it, expect } from "vitest";
import { parseTags, serializeTags } from "../../src/utils/tags";

describe("parseTags — fail-soft JSON-array parse", () => {
  it("parses a stored JSON string of tags", () => {
    expect(parseTags('["money","prayer"]')).toEqual(["money", "prayer"]);
  });
  it("treats the default/empty column as no tags", () => {
    expect(parseTags("[]")).toEqual([]);
    expect(parseTags("")).toEqual([]);
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
  });
  it("fails soft on malformed JSON or non-array shapes", () => {
    expect(parseTags("{not json")).toEqual([]);
    expect(parseTags('{"a":1}')).toEqual([]);
    expect(parseTags("42")).toEqual([]);
  });
  it("trims and drops blank / non-string entries", () => {
    expect(parseTags('["  money ", "", 7, null, "grace"]')).toEqual(["money", "grace"]);
  });
  it("accepts an already-parsed array", () => {
    expect(parseTags([" prayer ", "money"])).toEqual(["prayer", "money"]);
  });
});

describe("serializeTags — trim, de-dupe (case-insensitive), JSON out", () => {
  it("serializes a clean array", () => {
    expect(serializeTags(["money", "prayer"])).toBe('["money","prayer"]');
  });
  it("drops blanks and trims", () => {
    expect(serializeTags([" money ", "", "  "])).toBe('["money"]');
  });
  it("de-dupes case-insensitively, keeping first-seen casing", () => {
    expect(serializeTags(["Money", "money", "MONEY"])).toBe('["Money"]');
  });
  it("round-trips through parseTags", () => {
    expect(parseTags(serializeTags(["Grace", "grace", " mercy "]))).toEqual(["Grace", "mercy"]);
  });
  it("empty / non-array input serializes to the default column value", () => {
    expect(serializeTags([])).toBe("[]");
    expect(serializeTags(null)).toBe("[]");
    expect(serializeTags(undefined)).toBe("[]");
  });
});
