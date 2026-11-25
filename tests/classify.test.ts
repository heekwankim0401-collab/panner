import { describe, expect, it } from "vitest";
import {
  classify,
  containsWord,
  hasNegation,
  preprocess,
  RULES,
  splitClauses,
  startsWithWord,
} from "../pipeline/classify";
import type { Answers } from "../pipeline/types";
import { answersOf, loadFixtures } from "./helpers";

const answers = (workaround: string | null, core: string | null): Answers => ({ workaround, core, format: "form" });
const rulesOf = (a: Answers) => classify(a).evidence.map((item) => item.rule);

describe("classify on fixtures", () => {
  for (const { name, expected } of loadFixtures()) {
    if (expected.feasibility === undefined) continue; // real-* 샘플에는 분류 기대값이 없다
    it(name, () => {
      const result = classify(answersOf(expected));
      expect({ feasibility: result.feasibility, likely: result.likely, hard: result.hard }).toEqual({
        feasibility: expected.feasibility,
        likely: expected.likely,
        hard: expected.hard,
      });
    });
  }
});

describe("preprocess (6.1)", () => {
  it("removes fenced code blocks and keeps inline code text", () => {
    expect(preprocess("Not easy.\n```gdscript\nextends EditorPlugin\n```\nUse `my_plugin` instead.")).toBe(
      "not easy.\n\n\nuse myplugin instead.",
    );
  });

  it("lowercases, straightens curly apostrophes, strips markdown symbols and tidies spaces", () => {
    expect(preprocess("  **It CAN’T**   be  _done_ #here\n> quoted  ")).toBe("it can't be done here\nquoted");
  });
});

describe("splitClauses (6.1)", () => {
  it("splits on punctuation, newlines, ' but ' and ' however '", () => {
    expect(splitClauses("a, b; c: d. e! f? g\nh but i however j")).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
    ]);
  });

  it("does not split inside words", () => {
    expect(splitClauses("a butterfly however-ish")).toEqual(["a butterfly however-ish"]);
  });
});

describe("word matching (6.2)", () => {
  it("finds negation words only as whole words", () => {
    expect(containsWord("another plugin", "not")).toBe(false);
    expect(containsWord("nothing to see", "not")).toBe(false);
    expect(containsWord("it is not", "not")).toBe(true);
    expect(hasNegation("there is no way")).toBe(true);
    expect(hasNegation("there is no wayland support")).toBe(false);
    expect(hasNegation("i can't")).toBe(true);
  });

  it("checks starts as whole words", () => {
    expect(startsWithWord("no.", "no")).toBe(true);
    expect(startsWithWord("node based", "no")).toBe(false);
    expect(startsWithWord("nobody", "no")).toBe(false);
    expect(startsWithWord("not really, no", "not really")).toBe(true);
    expect(startsWithWord("not with a few lines", "no")).toBe(false);
  });
});

describe("rules (6.3)", () => {
  it("counts each row once per cell even when several phrases match", () => {
    const result = classify(answers(null, "It cannot be done, it is impossible, there is no way, it is internal."));
    expect(result.evidence.filter((item) => item.rule === "C4")).toHaveLength(1);
    expect(result.hard).toBe(2);
  });

  it("caps likely and hard at 2 per cell", () => {
    const result = classify(answers("Yes, it can be done with a plugin or an addon.", "No, an add-on gives usability."));
    expect(rulesOf(answers("Yes, it can be done with a plugin or an addon.", "No, an add-on gives usability."))).toEqual([
      "W1",
      "W2",
      "C1",
      "C2",
      "C3",
    ]);
    expect(result.likely).toBe(4);
  });

  it("counts likely phrases only in clauses without negation", () => {
    expect(rulesOf(answers("A plugin is not enough.", null))).toEqual([]);
    expect(rulesOf(answers("It's hard, but a plugin works.", null))).toEqual(["W1"]);
  });

  it("counts hard phrases regardless of clauses", () => {
    expect(rulesOf(answers("It does not require engine changes.", null))).toEqual(["W4"]);
  });

  it("finds hard phrases across line breaks", () => {
    expect(rulesOf(answers("It requires\nengine work.", null))).toEqual(["W4"]);
  });

  it("does not treat 'no' as a start inside 'node' or 'nobody'", () => {
    expect(rulesOf(answers("Node tools could help.", "Nobody knows."))).toEqual([]);
  });

  it("keeps every phrase and weight in the single RULES table", () => {
    expect(RULES.map((rule) => `${rule.id}:${rule.signal}:${rule.weight}`)).toEqual([
      "W1:likely:2",
      "W2:likely:1",
      "W3:hard:1",
      "W4:hard:2",
      "W5:hard:1",
      "C1:likely:1",
      "C2:likely:2",
      "C3:likely:1",
      "C4:hard:2",
    ]);
  });
});

describe("judgement (6.4)", () => {
  it("returns noanswer for the 2026 form", () => {
    expect(classify({ workaround: null, core: null, format: "form2026" })).toEqual({
      feasibility: "noanswer",
      likely: 0,
      hard: 0,
      evidence: [],
    });
  });

  it("returns unclear when both answers are missing", () => {
    expect(classify(answers(null, null)).feasibility).toBe("unclear");
  });

  it("needs an add-on word to be likely", () => {
    const result = classify(answers("Yes.", "No, it would improve usability."));
    expect(result.likely).toBe(3);
    expect(result.feasibility).toBe("unclear");
  });

  it("W 'no' alone cannot make hard", () => {
    const result = classify(answers("No.", null));
    expect([result.hard, result.feasibility]).toEqual([1, "unclear"]);
  });
});

describe("evidence (6.5)", () => {
  it("records one item per row with the first phrase in table order", () => {
    const fixture = loadFixtures().find((f) => f.name === "form-likely.md")!;
    expect(classify(answersOf(fixture.expected)).evidence).toEqual([
      { field: "workaround", rule: "W1", phrase: "plugin", at: "phrase", signal: "likely", weight: 2 },
      { field: "workaround", rule: "W2", phrase: "can be worked around", at: "phrase", signal: "likely", weight: 1 },
      { field: "core", rule: "C1", phrase: "no", at: "start", signal: "likely", weight: 1 },
      { field: "core", rule: "C2", phrase: "add-on", at: "phrase", signal: "likely", weight: 2 },
    ]);
  });

  it("prefers the start check when a row matches both ways, and keeps 'not really' whole", () => {
    const w2 = classify(answers("Yes, it can be worked around.", null)).evidence.find((item) => item.rule === "W2");
    expect(w2).toMatchObject({ phrase: "yes", at: "start" });
    const w3 = classify(answers("Not really, sorry.", null)).evidence.find((item) => item.rule === "W3");
    expect(w3).toMatchObject({ phrase: "not really", at: "start" });
  });

  it("works on curly apostrophes", () => {
    const fixture = loadFixtures().find((f) => f.name === "form-curly.md")!;
    expect(classify(answersOf(fixture.expected)).evidence).toEqual([
      { field: "core", rule: "C4", phrase: "can't", at: "phrase", signal: "hard", weight: 2 },
    ]);
  });
});
