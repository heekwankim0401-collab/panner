import { describe, expect, it } from "vitest";
import { highlightSegments } from "../web/src/highlight";

const marked = (text: string, phrases: string[]) =>
  highlightSegments(text, phrases)
    .filter((segment) => segment.mark)
    .map((segment) => segment.text);

describe("highlightSegments (SPEC 6.5)", () => {
  it("finds phrases case-insensitively and keeps the original text", () => {
    const segments = highlightSegments("Yes, this could be an Add-On.", ["be an add-on"]);
    expect(segments).toEqual([
      { text: "Yes, this could ", mark: false },
      { text: "be an Add-On", mark: true },
      { text: ".", mark: false },
    ]);
    expect(segments.map((s) => s.text).join("")).toBe("Yes, this could be an Add-On.");
  });

  it("treats curly and straight apostrophes the same", () => {
    expect(marked("It can’t be done.", ["can't"])).toEqual(["can’t"]);
  });

  it("marks every occurrence and prefers the longer phrase at the same place", () => {
    expect(marked("A plugin works. Another plugin works too.", ["plugin works", "plugin"])).toEqual([
      "plugin works",
      "plugin works",
    ]);
  });

  it("escapes regular expression characters in phrases", () => {
    expect(marked("Needs C++ changes.", ["c++"])).toEqual(["C++"]);
  });

  it("leaves the text alone when a phrase is not found", () => {
    expect(highlightSegments("**can** be a **plugin**", ["can be a plugin"])).toEqual([
      { text: "**can** be a **plugin**", mark: false },
    ]);
    expect(highlightSegments("", ["x"])).toEqual([]);
    expect(highlightSegments("text", [])).toEqual([{ text: "text", mark: false }]);
  });
});
