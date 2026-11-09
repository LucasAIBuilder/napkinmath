import { describe, expect, it } from "vitest";
import { duplicateLine, toggleComment } from "../../src/lib/shortcuts";

describe("toggleComment", () => {
  it("comments an empty line with the caret after the marker", () => {
    expect(toggleComment("a\n", 2)).toEqual({ text: "a\n# ", caret: 4 });
  });

  it("keeps the caret on the same text, after the indent", () => {
    expect(toggleComment("  rent = 1", 6)).toEqual({ text: "  # rent = 1", caret: 8 });
    expect(toggleComment("  # rent = 1", 8)).toEqual({ text: "  rent = 1", caret: 6 });
    expect(toggleComment("// x", 4)).toEqual({ text: "x", caret: 1 });
  });

  it("leaves a caret inside the indent where it is, and never moves it into the indent", () => {
    expect(toggleComment("  x", 1)).toEqual({ text: "  # x", caret: 1 });
    expect(toggleComment("  # x", 3)).toEqual({ text: "  x", caret: 2 });
  });
});

describe("duplicateLine", () => {
  it("copies the line below with the caret at the same column", () => {
    expect(duplicateLine("ab\ncd", 1)).toEqual({ text: "ab\nab\ncd", caret: 4 });
    expect(duplicateLine("ab\ncd", 5)).toEqual({ text: "ab\ncd\ncd", caret: 8 });
  });
});
