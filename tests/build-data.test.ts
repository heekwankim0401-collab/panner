import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildData,
  buildSite,
  DETAIL_ANSWER_CHARS,
  detailBucket,
  distribution,
  truncateForDetail,
} from "../pipeline/build-data";
import { toDataJson, toWebJson, writeIfChanged } from "../pipeline/io";
import type { RawProposal } from "../pipeline/types";

const NOW = "2026-11-25T00:00:00.000Z";

const tempDirs: string[] = [];
function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "panner-test-"));
  tempDirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function paths(root: string) {
  return {
    rawDir: join(root, "data", "raw"),
    statePath: join(root, "data", "state.json"),
    outDir: join(root, "web", "public", "data"),
  };
}

function raw(overrides: Partial<RawProposal> & { number: number }): RawProposal {
  return {
    title: `Proposal ${overrides.number}`,
    url: `https://github.com/godotengine/godot-proposals/issues/${overrides.number}`,
    state: "OPEN",
    stateReason: null,
    createdAt: "2022-01-01T00:00:00Z",
    updatedAt: "2022-03-04T05:06:07Z",
    closedAt: null,
    comments: 0,
    labels: [],
    up: 0,
    down: 0,
    assignees: 0,
    milestone: null,
    answers: { workaround: null, core: null, format: "form" },
    ...overrides,
  };
}

const LIKELY = { workaround: "Yes, with a plugin.", core: "No.", format: "form" as const };
const HARD = { workaround: "No. It requires engine changes.", core: "Yes, it cannot be an add-on.", format: "form" as const };

const SAMPLE: RawProposal[] = [
  raw({ number: 250, up: 7, labels: ["topic:editor"], answers: LIKELY }), // open likely
  raw({
    number: 12,
    state: "CLOSED",
    stateReason: "COMPLETED",
    labels: ["Archived", "topic:gui", "topic:editor"],
    up: 3,
    down: 1,
    comments: 4,
    assignees: 2,
    milestone: "4.x",
    answers: HARD,
  }), // archived hard
  raw({ number: 13, state: "CLOSED", stateReason: "DUPLICATE", labels: ["archived"], answers: LIKELY }), // dup: excluded
  raw({ number: 14, state: "CLOSED", stateReason: "NOT_PLANNED", answers: LIKELY }), // done: excluded
  raw({ number: 15000, answers: { workaround: null, core: null, format: "form2026" } }), // open noanswer
];

describe("io", () => {
  it("sorts keys recursively and keeps array order", () => {
    expect(toWebJson({ b: 1, a: { d: [3, 1], c: null } })).toBe('{"a":{"c":null,"d":[3,1]},"b":1}');
  });

  it("formats data JSON with 2-space indent and one trailing newline", () => {
    expect(toDataJson({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}\n');
  });

  it("writes only when the content changes", () => {
    const file = join(makeTempDir(), "nested", "a.json");
    expect(writeIfChanged(file, "1")).toBe(true);
    expect(writeIfChanged(file, "1")).toBe(false);
    expect(writeIfChanged(file, "2")).toBe(true);
    expect(readFileSync(file, "utf8")).toBe("2");
  });
});

describe("buildSite (SPEC 8)", () => {
  const site = buildSite({ raws: SAMPLE, lastSyncedAt: "2026-11-24T00:00:00Z", now: NOW });

  it("includes only open and archived proposals, in number order", () => {
    expect(site.index.items.map((item) => item.n)).toEqual([12, 250, 15000]);
    expect(site.index.meta).toEqual({ builtAt: NOW, lastSyncedAt: "2026-11-24T00:00:00Z", total: 5, included: 3 });
  });

  it("builds a sorted label dictionary without archived (any case)", () => {
    expect(site.index.labels).toEqual(["topic:editor", "topic:gui"]);
  });

  it("fills every item field", () => {
    expect(site.index.items[0]).toEqual({
      n: 12,
      t: "Proposal 12",
      u: 3,
      d: 1,
      c: 4,
      l: [0, 1],
      st: "archived",
      f: "hard",
      s: 0.16, // log2(1 + (3 - 1)) × 0.1(hard) × 1.0(archived) = 0.1585 → 0.16
      a: true,
      m: "4.x",
      up: "2022-03-04",
    });
  });

  it("scores with classify and the status weight", () => {
    const byNumber = new Map(site.index.items.map((item) => [item.n, item]));
    expect(byNumber.get(250)).toMatchObject({ st: "open", f: "likely", s: 2.1, l: [0], a: false }); // log2(8) × 1 × 0.7
    expect(byNumber.get(15000)).toMatchObject({ st: "open", f: "noanswer", s: 0 });
  });

  it("puts details in buckets of 100 with evidence, url and format", () => {
    expect([...site.details.keys()].sort((a, b) => a - b)).toEqual([0, 2, 150]);
    expect(site.details.get(2)?.["250"]).toEqual({
      w: "Yes, with a plugin.",
      c: "No.",
      ev: [
        { field: "workaround", rule: "W1", phrase: "with a plugin", at: "phrase", signal: "likely", weight: 2 },
        { field: "workaround", rule: "W2", phrase: "yes", at: "start", signal: "likely", weight: 1 },
        { field: "core", rule: "C1", phrase: "no", at: "start", signal: "likely", weight: 1 },
      ],
      url: "https://github.com/godotengine/godot-proposals/issues/250",
      fmt: "form",
    });
    expect(site.details.get(0)?.["13"]).toBeUndefined(); // 빠진 제안은 상세에도 없다
  });

  it("counts the distribution by status and feasibility", () => {
    expect(distribution(site.index)).toEqual({
      open: { likely: 1, unclear: 0, hard: 0, noanswer: 1 },
      archived: { likely: 0, unclear: 0, hard: 1, noanswer: 0 },
    });
  });

  it("builds an empty site from no data", () => {
    expect(buildSite({ raws: [], lastSyncedAt: null, now: NOW }).index).toEqual({
      meta: { builtAt: NOW, lastSyncedAt: null, total: 0, included: 0 },
      labels: [],
      items: [],
    });
  });
});

describe("truncateForDetail", () => {
  it(`cuts at ${DETAIL_ANSWER_CHARS} code points and adds …`, () => {
    expect(truncateForDetail(null)).toBeNull();
    expect(truncateForDetail("a".repeat(DETAIL_ANSWER_CHARS))).toBe("a".repeat(DETAIL_ANSWER_CHARS));
    expect(truncateForDetail("🙂".repeat(DETAIL_ANSWER_CHARS + 1))).toBe("🙂".repeat(DETAIL_ANSWER_CHARS) + "…");
  });

  it("groups numbers by hundreds", () => {
    expect([0, 99, 100, 15792].map(detailBucket)).toEqual([0, 0, 1, 157]);
  });
});

describe("buildData (files)", () => {
  it("writes items: [] without indentation when data/raw does not exist", () => {
    const p = paths(makeTempDir());
    buildData({ ...p, now: NOW });
    expect(readFileSync(join(p.outDir, "index.json"), "utf8")).toBe(
      '{"items":[],"labels":[],"meta":{"builtAt":"2026-11-25T00:00:00.000Z","included":0,"lastSyncedAt":null,"total":0}}',
    );
  });

  it("reads lastSyncedAt from state.json", () => {
    const p = paths(makeTempDir());
    mkdirSync(p.rawDir, { recursive: true });
    writeFileSync(p.statePath, toDataJson({ schemaVersion: 2, lastSyncedAt: "2026-11-23T18:17:00Z", total: 0 }));
    expect(buildData({ ...p, now: NOW }).index.meta.lastSyncedAt).toBe("2026-11-23T18:17:00Z");
  });

  it("writes index.json and detail files, and removes stale detail files", () => {
    const p = paths(makeTempDir());
    mkdirSync(p.rawDir, { recursive: true });
    for (const item of SAMPLE) writeFileSync(join(p.rawDir, `${item.number}.json`), toDataJson(item));
    mkdirSync(join(p.outDir, "detail"), { recursive: true });
    writeFileSync(join(p.outDir, "detail", "99.json"), "{}");

    const result = buildData({ ...p, now: NOW });
    expect(result).toMatchObject({ detailFiles: 3, removed: ["99.json"] });
    expect(readdirSync(join(p.outDir, "detail")).sort()).toEqual(["0.json", "150.json", "2.json"]);
    const index = readFileSync(join(p.outDir, "index.json"), "utf8");
    expect(index).not.toMatch(/\n/);
    expect(result.bytes).toBe(Buffer.byteLength(index));
    expect(existsSync(join(p.outDir, "detail", "99.json"))).toBe(false);
  });

  it("produces the same bytes for the same input", () => {
    const a = paths(makeTempDir());
    const b = paths(makeTempDir());
    for (const p of [a, b]) {
      mkdirSync(p.rawDir, { recursive: true });
      for (const item of SAMPLE) writeFileSync(join(p.rawDir, `${item.number}.json`), toDataJson(item));
      buildData({ ...p, now: NOW });
    }
    for (const file of ["index.json", "detail/0.json", "detail/2.json", "detail/150.json"]) {
      expect(readFileSync(join(a.outDir, file)), file).toEqual(readFileSync(join(b.outDir, file)));
    }
  });
});
