import { describe, expect, it } from "vitest";
import { cleanAnswer, extractAnswers, MAX_ANSWER_CHARS, normalizeForCompare } from "../pipeline/parse";
import { loadFixtures, toCrlf } from "./helpers";

const W = "If this enhancement will not be used often, can it be worked around with a few lines of script?";
const C = "Is there a reason why this should be core and not an add-on in the asset library?";

/** 이슈 폼 모양의 본문을 만든다. */
function form(sections: Record<string, string>): string {
  return Object.entries(sections)
    .map(([heading, answer]) => `### ${heading}\n\n${answer}\n`)
    .join("\n");
}

describe("extractAnswers on fixtures", () => {
  const fixtures = loadFixtures();

  const variants: Array<[string, (body: string) => string]> = [
    ["as stored (LF)", (body) => body],
    ["with CRLF line endings", toCrlf],
    ["with lone CR line endings", (body) => body.replace(/\n/g, "\r")],
  ];

  for (const [label, transform] of variants) {
    describe(label, () => {
      for (const { name, body, expected } of fixtures) {
        it(name, () => {
          expect(extractAnswers(transform(body))).toEqual({
            workaround: expected.workaround,
            core: expected.core,
            format: expected.format,
          });
        });
      }
    });
  }
});

describe("extractAnswers rules", () => {
  it("rule 1: matches a heading that contains the question after normalization", () => {
    const body = form({ [`${W} (optional)`]: "Yes, with a plugin.", [C.toUpperCase()]: "No." });
    expect(extractAnswers(body)).toEqual({ workaround: "Yes, with a plugin.", core: "No.", format: "form" });
  });

  it("rule 1: returns null for a question that is missing", () => {
    const body = form({ "Describe the project you are working on": "A game.", [C]: "No." });
    expect(extractAnswers(body)).toEqual({ workaround: null, core: "No.", format: "form" });
  });

  it("rule 1: uses the first section when a question repeats", () => {
    const body = form({ [W]: "First." }) + "\n" + form({ [W]: "Second." });
    expect(extractAnswers(body).workaround).toBe("First.");
  });

  it("rule 1: an answer runs to the end of the body when no heading follows", () => {
    expect(extractAnswers(`### ${C}\n\nLine one.\n\nLine two.`).core).toBe("Line one.\n\nLine two.");
  });

  it("rule 1: #### sub-headings inside an answer do not end it", () => {
    expect(extractAnswers(`### ${W}\n\nYes.\n#### Details\nMore.\n### ${C}\n\nNo.`).workaround).toBe(
      "Yes.\n#### Details\nMore.",
    );
  });

  it("rule 2: new 2026 form without the two questions", () => {
    expect(extractAnswers("### Proposed improvement\n\nSomething.\n")).toEqual({
      workaround: null,
      core: null,
      format: "form2026",
    });
  });

  it("rule 2 does not apply when a question heading is present", () => {
    const body = form({ "Problem or limitation": "Slow.", [C]: "No, a plugin works." });
    expect(extractAnswers(body)).toEqual({ workaround: null, core: "No, a plugin works.", format: "form" });
  });

  it("rule 3: a bold line counts as a heading only when its text ends with : or ?", () => {
    const body = `**${W}**\n**No!**\nStill the answer.\n**${C}:**\nNo.`;
    expect(extractAnswers(body)).toEqual({ workaround: "**No!**\nStill the answer.", core: "No.", format: "legacy" });
  });

  it("rule 3: a line with bold text and more text is not a heading", () => {
    const body = `**${W}:**\n**Yes**, easily: a plugin.\n**Other section:**\nx`;
    expect(extractAnswers(body).workaround).toBe("**Yes**, easily: a plugin.");
  });

  it("rule 1: accepts question headings of any level from # to ######", () => {
    for (const hashes of ["#", "##", "####", "######"]) {
      expect(extractAnswers(`${hashes} ${W}\nYes.\n${hashes} ${C}\nNo.`), hashes).toEqual({
        workaround: "Yes.",
        core: "No.",
        format: "form",
      });
    }
  });

  it("rule 1: an answer ends only at the next heading of the same level", () => {
    const body = `### ${W}\nSee below.\n## Workaround 1\nA plugin.\n# Workaround 2\nA script.\n### ${C}\nNo.`;
    expect(extractAnswers(body)).toEqual({
      workaround: "See below.\n## Workaround 1\nA plugin.\n# Workaround 2\nA script.",
      core: "No.",
      format: "form",
    });
  });

  it("rule 1: ignores headings inside fenced code blocks (``` and ~~~)", () => {
    const body = `### ${W}\n\`\`\`gdscript\n### not a heading\n# a comment\n\`\`\`\n~~~\n### also code\n~~~\nAfter.\n### ${C}\nNo.`;
    expect(extractAnswers(body).workaround).toBe(
      "```gdscript\n### not a heading\n# a comment\n```\n~~~\n### also code\n~~~\nAfter.",
    );
  });

  it("rule 1: a line with ```inline``` code does not open a fenced block", () => {
    const body = `### ${W}\n\`\`\`@export_tool_button("Go")\`\`\`\n### ${C}\nNo.`;
    expect(extractAnswers(body)).toEqual({ workaround: '```@export_tool_button("Go")```', core: "No.", format: "form" });
  });

  it("rule 1: question headings still count inside a fence that never closes properly", () => {
    const body = `### ${W}\nYes.\n\`\`\`gdscript\nx = 1\n\`\`\`markdown\n### ${C}\nNo.`;
    expect(extractAnswers(body)).toEqual({
      workaround: "Yes.\n```gdscript\nx = 1\n```markdown",
      core: "No.",
      format: "form",
    });
  });

  it("rule 2: new form headings of other levels are still the new form", () => {
    expect(extractAnswers("## Problem or limitation\n\nSlow.\n\n## Proposed improvement\n\nFaster.").format).toBe("form2026");
  });

  it("rule 3: takes an answer written on the same line as a bold question", () => {
    const body = `**Describe the project you are working on:** A game.\n**${W}:** No, but a plugin could.\nMore detail.\n**${C}:** Yes.`;
    expect(extractAnswers(body)).toEqual({
      workaround: "No, but a plugin could.\nMore detail.",
      core: "Yes.",
      format: "legacy",
    });
  });

  it("rule 3: accepts a colon outside the bold text or none at all", () => {
    const W_BARE = W.slice(0, -1); // 물음표 없이
    expect(extractAnswers(`**${W_BARE}**: No.\n**${C}**\nYes.`)).toEqual({ workaround: "No.", core: "Yes.", format: "legacy" });
  });

  it("rule 3: a bold label with text after it inside an answer is not a heading", () => {
    const body = `**${W}:**\nYes.\n**Note:** a plugin already exists.\n**${C}:**\nNo.`;
    expect(extractAnswers(body).workaround).toBe("Yes.\n**Note:** a plugin already exists.");
  });

  it("rule 6: headings without the questions or the new form are unknown", () => {
    expect(extractAnswers("### Something else\n\ntext\n**Also not it:**\nmore")).toEqual({
      workaround: null,
      core: null,
      format: "unknown",
    });
  });

  it("rule 6: an empty body is unknown", () => {
    expect(extractAnswers("")).toEqual({ workaround: null, core: null, format: "unknown" });
  });
});

describe("cleanAnswer (rule 5 and SPEC 4.3)", () => {
  it("removes multi-line HTML comments and trims", () => {
    expect(cleanAnswer("\n<!-- a\nb -->\n  Yes.  \n<!-- c -->\n")).toBe("Yes.");
  });

  it("returns null for empty answers and _No response_", () => {
    expect(cleanAnswer("   \n")).toBeNull();
    expect(cleanAnswer("<!-- only a comment -->")).toBeNull();
    expect(cleanAnswer("\n_No response_\n")).toBeNull();
  });

  it(`cuts answers at ${MAX_ANSWER_CHARS} code points without splitting surrogate pairs`, () => {
    const long = "🙂".repeat(MAX_ANSWER_CHARS + 5);
    const cut = cleanAnswer(long);
    expect(cut).not.toBeNull();
    expect(Array.from(cut!)).toHaveLength(MAX_ANSWER_CHARS);
    expect(cut!.endsWith("🙂")).toBe(true);
    expect(cleanAnswer("a".repeat(MAX_ANSWER_CHARS))).toHaveLength(MAX_ANSWER_CHARS);
  });
});

describe("normalizeForCompare (rule 4)", () => {
  it("lowercases, drops symbols and collapses spaces", () => {
    expect(normalizeForCompare("  Is there an ADD-ON?\n  (asset   library)  ")).toBe("is there an addon asset library");
  });
});
