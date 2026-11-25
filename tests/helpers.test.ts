import { describe, expect, it } from "vitest";
import type { Evidence, Format, RawProposal } from "../pipeline/types";
import { answersOf, listBodyFiles, loadExpected, loadFixtures, toCrlf } from "./helpers";

const FORMATS: readonly Format[] = ["form", "markdown", "legacy", "form2026", "unknown"];
const FEASIBILITIES = ["likely", "unclear", "hard", "noanswer"];

describe("fixture helpers", () => {
  it("pairs every body file with exactly one expected entry", () => {
    const names = loadFixtures().map((fixture) => fixture.name);
    expect(names).toEqual(listBodyFiles());
    expect(names).toEqual(Object.keys(loadExpected()).sort());
    expect(names).toHaveLength(24); // 합성 14 + T5 실제 본문 10
  });

  it("keeps classification values out of real-* entries", () => {
    const real = loadFixtures().filter((fixture) => fixture.name.startsWith("real-"));
    expect(real).toHaveLength(10);
    for (const { name, expected } of real) {
      expect([expected.feasibility, expected.likely, expected.hard], name).toEqual([undefined, undefined, undefined]);
    }
  });

  it("skips the _note key in expected.json", () => {
    expect(Object.keys(loadExpected()).some((key) => key.startsWith("_"))).toBe(false);
  });

  it("keeps fixture bodies as LF on disk", () => {
    for (const { name, body } of loadFixtures()) {
      expect(body.includes("\r"), `${name} should not contain \\r`).toBe(false);
    }
  });

  it("has well-formed expected values", () => {
    for (const { name, expected } of loadFixtures()) {
      expect(FORMATS, name).toContain(expected.format);
      for (const answer of [expected.workaround, expected.core]) {
        expect(answer === null || typeof answer === "string", name).toBe(true);
      }
      if (expected.feasibility !== undefined) {
        expect(FEASIBILITIES, name).toContain(expected.feasibility);
        expect(typeof expected.likely, name).toBe("number");
        expect(typeof expected.hard, name).toBe("number");
      }
    }
  });

  it("builds classifier input from an expected entry", () => {
    const fixture = loadFixtures().find((f) => f.name === "form2026.md");
    expect(fixture).toBeDefined();
    expect(answersOf(fixture!.expected)).toEqual({ workaround: null, core: null, format: "form2026" });
  });
});

describe("toCrlf", () => {
  it("turns every LF into CRLF", () => {
    expect(toCrlf("a\nb\n\nc")).toBe("a\r\nb\r\n\r\nc");
  });

  it("does not double existing CRLF or lone CR", () => {
    expect(toCrlf("a\r\nb\rc\n")).toBe("a\r\nb\r\nc\r\n");
    expect(toCrlf(toCrlf("x\ny"))).toBe("x\r\ny");
  });

  it("round-trips every fixture body", () => {
    for (const { name, body } of loadFixtures()) {
      const crlf = toCrlf(body);
      expect(crlf.replace(/\r\n/g, "\n"), name).toBe(body);
      expect(/[^\r]\n/.test(crlf), `${name} has a bare LF`).toBe(false);
    }
  });
});

describe("types (compile-time)", () => {
  it("accepts a RawProposal shaped like SPEC 4.3", () => {
    const evidence: Evidence = { field: "core", rule: "C2", phrase: "add-on", at: "phrase", signal: "likely", weight: 2 };
    const raw = {
      number: 1,
      title: "Example",
      url: "https://github.com/godotengine/godot-proposals/issues/1",
      state: "CLOSED",
      stateReason: "NOT_PLANNED",
      createdAt: "2019-09-04T00:00:00Z",
      updatedAt: "2019-09-05T00:00:00Z",
      closedAt: "2019-09-05T00:00:00Z",
      comments: 0,
      labels: ["archived"],
      up: 3,
      down: 0,
      assignees: 0,
      milestone: null,
      answers: { workaround: null, core: "No, this could be an add-on.", format: "legacy" },
    } satisfies RawProposal;
    expect(raw.answers.format).toBe("legacy");
    expect(evidence.weight).toBe(2);
  });
});
