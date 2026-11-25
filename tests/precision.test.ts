import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  evaluate,
  exitCodeFor,
  readGolden,
  report,
  topEntries,
  writeGolden,
  type Golden,
} from "../pipeline/eval";
import { describeEntry, parseAnswer, pendingEntries, withLabel } from "../pipeline/label";
import type { RawProposal } from "../pipeline/types";

const tempDirs: string[] = [];
function tempFile(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), "panner-eval-"));
  tempDirs.push(dir);
  return join(dir, name);
}
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const LIKELY = { workaround: "Yes, with a plugin.", core: "No.", format: "form" as const };
const UNCLEAR = { workaround: "Maybe.", core: "Hard to say.", format: "form" as const };

function raw(number: number, up: number, answers = LIKELY, state: RawProposal["state"] = "OPEN"): RawProposal {
  return {
    number,
    title: `Proposal ${number}`,
    url: `https://github.com/godotengine/godot-proposals/issues/${number}`,
    state,
    stateReason: state === "CLOSED" ? "COMPLETED" : null,
    createdAt: "2022-01-01T00:00:00Z",
    updatedAt: "2022-01-02T00:00:00Z",
    closedAt: null,
    comments: 0,
    labels: state === "CLOSED" ? ["archived"] : [],
    up,
    down: 0,
    assignees: 0,
    milestone: null,
    answers,
  };
}

/** 35개 likely(추천 수 1~35) + 점수가 더 높은 unclear 하나 + 중복 */
const RAWS: RawProposal[] = [
  ...Array.from({ length: 35 }, (_, i) => raw(100 + i, i + 1)),
  raw(1, 5000, UNCLEAR),
  { ...raw(2, 5000), state: "CLOSED", stateReason: "DUPLICATE" },
];

describe("topEntries (same selection as the default view)", () => {
  const top = topEntries(RAWS);

  it("takes 30 likely items in score order, ignoring other feasibility and excluded status", () => {
    expect(top).toHaveLength(30);
    expect(top[0]!.item.n).toBe(134); // 추천 35개가 가장 높다
    expect(top.at(-1)!.item.n).toBe(105);
    expect(top.some((entry) => entry.item.n === 1 || entry.item.n === 2)).toBe(false);
  });

  it("carries the full raw answers and the evidence", () => {
    expect(top[0]!.raw.answers.workaround).toBe("Yes, with a plugin.");
    expect(top[0]!.evidence.map((e) => e.rule)).toEqual(["W1", "W2", "C1"]);
  });

  it("puts archived above open at the same votes (wStatus 1.0 vs 0.7)", () => {
    const withArchived = topEntries([raw(10, 7), raw(11, 7, LIKELY, "CLOSED")], 2);
    expect(withArchived.map((entry) => entry.item.n)).toEqual([11, 10]);
  });
});

describe("evaluate and exit codes (SPEC 10)", () => {
  const top = topEntries(RAWS);
  const labelAll = (yes: number, no: number, skip = 0): Golden => {
    const golden: Golden = {};
    top.forEach((entry, index) => {
      golden[String(entry.item.n)] = index < yes ? "yes" : index < yes + no ? "no" : index < yes + no + skip ? "skip" : "yes";
    });
    return golden;
  };

  it("exits 2 when any top item has no label", () => {
    const result = evaluate(top, {});
    expect(result).toMatchObject({ total: 30, yes: 0, no: 0, skip: 0, precision: null });
    expect(result.unlabeled).toHaveLength(30);
    expect(exitCodeFor(result)).toBe(2);
    expect(report(result).at(-1)).toMatch(/^label first: #134, /);
  });

  it("exits 2 when everything is skipped (no yes/no to measure)", () => {
    const golden = Object.fromEntries(top.map((entry) => [String(entry.item.n), "skip" as const]));
    const result = evaluate(top, golden);
    expect([result.skip, result.precision, exitCodeFor(result)]).toEqual([30, null, 2]);
  });

  it("leaves skip out of the denominator", () => {
    const result = evaluate(top, labelAll(14, 6, 10)); // 나머지 0개 → yes 14, no 6, skip 10
    expect(result).toMatchObject({ yes: 14, no: 6, skip: 10, unlabeled: [] });
    expect(result.precision).toBeCloseTo(0.7);
    expect(exitCodeFor(result)).toBe(0); // 정확히 70%는 통과
  });

  it("exits 1 below 70% and lists the no items", () => {
    const result = evaluate(top, labelAll(20, 10));
    expect(result.precision).toBeCloseTo(2 / 3);
    expect(exitCodeFor(result)).toBe(1);
    expect(result.noEntries.map((entry) => entry.item.n)).toEqual(top.slice(20, 30).map((entry) => entry.item.n));
    expect(report(result)).toContain("no:");
  });

  it("exits 0 at or above 70%", () => {
    expect(exitCodeFor(evaluate(top, labelAll(27, 3)))).toBe(0);
  });

  it("ignores labels for items that are no longer in the top 30", () => {
    const result = evaluate(top, { ...labelAll(30, 0), "999": "no" });
    expect([result.no, exitCodeFor(result)]).toEqual([0, 0]);
  });
});

describe("golden.json", () => {
  it("reads a missing file as empty and writes sorted, indented JSON", () => {
    const path = tempFile("golden.json");
    expect(readGolden(path)).toEqual({});
    writeGolden({ "120": "no", "13": "yes", "5": "skip" }, path);
    expect(readFileSync(path, "utf8")).toBe('{\n  "5": "skip",\n  "13": "yes",\n  "120": "no"\n}\n');
    expect(readGolden(path)).toEqual({ "5": "skip", "13": "yes", "120": "no" });
  });

  it("rejects bad entries with a clear message", () => {
    const path = tempFile("golden.json");
    writeFileSync(path, '{ "12": "maybe" }');
    expect(() => readGolden(path)).toThrow(/bad entry "12"/);
  });
});

describe("label helpers", () => {
  const top = topEntries(RAWS);

  it("lists only items without a label, skip included as labeled", () => {
    const golden: Golden = { [String(top[0]!.item.n)]: "yes", [String(top[1]!.item.n)]: "skip" };
    const pending = pendingEntries(top, golden);
    expect(pending).toHaveLength(28);
    expect(pending[0]!.item.n).toBe(top[2]!.item.n);
  });

  it("parses y/n/s/q answers", () => {
    expect(["y", " YES ", "n", "no", "s", "skip", "q", "quit", "", "maybe"].map(parseAnswer)).toEqual([
      "yes",
      "yes",
      "no",
      "no",
      "skip",
      "skip",
      "quit",
      "quit",
      null,
      null,
    ]);
  });

  it("adds a label without changing the original", () => {
    const golden: Golden = { "1": "yes" };
    expect(withLabel(golden, 2, "no")).toEqual({ "1": "yes", "2": "no" });
    expect(golden).toEqual({ "1": "yes" });
  });

  it("shows title, link, both answers and evidence", () => {
    const text = describeEntry(top[0]!, 1, 30);
    expect(text).toContain("[1/30] #134 Proposal 134");
    expect(text).toContain("https://github.com/godotengine/godot-proposals/issues/134");
    expect(text).toContain("W: Yes, with a plugin.");
    expect(text).toContain("C: No.");
    expect(text).toContain('evidence: W1 "plugin", W2 "yes", C1 "no"');
  });
});
