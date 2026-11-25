import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { GqlIssueNode } from "../pipeline/github";
import { toDataJson } from "../pipeline/io";
import {
  answersFor,
  bodyPath,
  dataPaths,
  findVanished,
  parseSyncArgs,
  rawPath,
  runReparse,
  runSync,
  toRawProposal,
  type DataPaths,
} from "../pipeline/sync";
import { fakeFetchPage, formBody, issueNode } from "./fake-github";

const NOW = "2026-11-25T00:00:00.000Z";

const tempDirs: string[] = [];
function tempPaths(): DataPaths {
  const dir = mkdtempSync(join(tmpdir(), "panner-sync-"));
  tempDirs.push(dir);
  return dataPaths(join(dir, "data"));
}
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const sync = (paths: DataPaths, nodes: GqlIssueNode[], limit: number | null = null, log?: (line: string) => void) =>
  runSync({ fetchPage: fakeFetchPage(nodes), paths, pageSize: 2, limit, now: () => NOW, log, sleep: async () => {} });

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

describe("toRawProposal", () => {
  it("maps a GraphQL issue to the SPEC 4.3 shape", () => {
    const raw = toRawProposal(
      issueNode({
        number: 42,
        state: "CLOSED",
        stateReason: "DUPLICATE",
        closedAt: "2022-02-01T00:00:00Z",
        comments: { totalCount: 7 },
        labels: { nodes: [{ name: "topic:editor" }, null, { name: "archived" }] },
        reactionGroups: [
          { content: "HEART", reactors: { totalCount: 9 } },
          { content: "THUMBS_DOWN", reactors: { totalCount: 2 } },
          { content: "THUMBS_UP", reactors: { totalCount: 15 } },
        ],
        assignees: { totalCount: 1 },
        milestone: { title: "4.x" },
      }),
    );
    expect(raw).toEqual({
      number: 42,
      title: "Proposal 42",
      url: "https://github.com/godotengine/godot-proposals/issues/42",
      state: "CLOSED",
      stateReason: "DUPLICATE",
      createdAt: "2022-01-01T00:00:00Z",
      updatedAt: "2022-01-02T00:00:00Z",
      closedAt: "2022-02-01T00:00:00Z",
      comments: 7,
      labels: ["archived", "topic:editor"],
      up: 15,
      down: 2,
      assignees: 1,
      milestone: "4.x",
      answers: { workaround: "Yes, with a plugin.", core: "No.", format: "form" },
    });
  });

  it("uses 0 reactions, no labels and null stateReason when GitHub sends nothing or something unknown", () => {
    const raw = toRawProposal(issueNode({ number: 1, labels: null, reactionGroups: null, stateReason: "SOMETHING_NEW" }));
    expect([raw.up, raw.down, raw.labels, raw.stateReason]).toEqual([0, 0, [], null]);
  });
});

describe("answersFor (form / markdown split by createdAt, UTC)", () => {
  const body = formBody("Yes.", "No.");
  it("marks heading-style bodies before 2021-06-06 as markdown", () => {
    expect(answersFor(body, "2021-06-05T23:59:59Z").format).toBe("markdown");
  });
  it("keeps form from 2021-06-06 00:00 UTC", () => {
    expect(answersFor(body, "2021-06-06T00:00:00Z").format).toBe("form");
  });
  it("leaves other formats alone", () => {
    expect(answersFor("**Is there a reason why this should be core and not an add-on in the asset library?:**\nNo.", "2019-10-01T00:00:00Z").format).toBe("legacy");
    expect(answersFor("free text", "2019-01-01T00:00:00Z").format).toBe("unknown");
  });
});

describe("runSync", () => {
  const nodes = [1, 2, 3].map((number) => issueNode({ number }));

  it("writes raw files, bodies and state.json on a full sync", async () => {
    const paths = tempPaths();
    const summary = await sync(paths, nodes);
    expect(summary).toMatchObject({ fetched: 3, created: 3, changed: 0, unchanged: 0, stateWritten: true, cost: 2 });
    expect(readFileSync(rawPath(paths, 2), "utf8")).toBe(toDataJson(toRawProposal(nodes[1]!)));
    expect(readFileSync(bodyPath(paths, 2), "utf8")).toBe(nodes[1]!.body); // CRLF 그대로
    expect(readJson(paths.statePath)).toEqual({ schemaVersion: 2, lastSyncedAt: NOW, total: 3 });
  });

  it("reports no changes on a second run with the same data, and only real changes after that", async () => {
    const paths = tempPaths();
    await sync(paths, nodes);
    expect(await sync(paths, nodes)).toMatchObject({ created: 0, changed: 0, unchanged: 3 });

    const moreVotes = nodes.map((node) =>
      node.number === 3 ? { ...node, reactionGroups: [{ content: "THUMBS_UP", reactors: { totalCount: 99 } }] } : node,
    );
    expect(await sync(paths, moreVotes)).toMatchObject({ created: 0, changed: 1, unchanged: 2 });
    expect((readJson(rawPath(paths, 3)) as { up: number }).up).toBe(99);
  });

  it("with --limit, fetches only N, writes no state.json and does not look for vanished numbers", async () => {
    const paths = tempPaths();
    mkdirSync(paths.rawDir, { recursive: true });
    writeFileSync(rawPath(paths, 999), "{}\n");
    const logs: string[] = [];
    const summary = await sync(paths, nodes, 2, (line) => logs.push(line));
    expect(summary).toMatchObject({ fetched: 2, stateWritten: false, vanished: [] });
    expect(existsSync(rawPath(paths, 3))).toBe(false);
    expect(existsSync(paths.statePath)).toBe(false);
    expect(logs.some((line) => line.includes("#999"))).toBe(false);
  });

  it("logs numbers that vanished on a full sync but keeps their files", async () => {
    const paths = tempPaths();
    mkdirSync(paths.rawDir, { recursive: true });
    writeFileSync(rawPath(paths, 999), "{}\n");
    const logs: string[] = [];
    const summary = await sync(paths, nodes, null, (line) => logs.push(line));
    expect(summary.vanished).toEqual([999]);
    expect(existsSync(rawPath(paths, 999))).toBe(true);
    expect(logs).toContain("#999 is no longer in the repository; keeping data/raw/999.json");
  });

  it("writes byte-identical files for the same input", async () => {
    const a = tempPaths();
    const b = tempPaths();
    await sync(a, nodes);
    await sync(b, nodes);
    for (const number of [1, 2, 3]) {
      expect(readFileSync(rawPath(a, number))).toEqual(readFileSync(rawPath(b, number)));
    }
    expect(readFileSync(a.statePath)).toEqual(readFileSync(b.statePath));
  });
});

describe("runReparse", () => {
  it("re-extracts answers from cached bodies without the network", async () => {
    const paths = tempPaths();
    await sync(paths, [issueNode({ number: 1 }), issueNode({ number: 2 })]);
    writeFileSync(bodyPath(paths, 1), formBody("No, it needs engine changes.", "Yes."));
    rmSync(bodyPath(paths, 2));

    const summary = runReparse(paths);
    expect(summary).toEqual({ checked: 1, changed: 1, missingBody: [2] });
    expect((readJson(rawPath(paths, 1)) as { answers: unknown }).answers).toEqual({
      workaround: "No, it needs engine changes.",
      core: "Yes.",
      format: "form",
    });
    expect(runReparse(paths)).toMatchObject({ checked: 1, changed: 0 });
  });
});

describe("findVanished", () => {
  it("lists numbers that were not seen", () => {
    expect(findVanished([5, 1, 3], new Set([1, 5]))).toEqual([3]);
  });
});

describe("parseSyncArgs", () => {
  it("reads --limit and --reparse", () => {
    expect(parseSyncArgs([])).toEqual({ limit: null, reparse: false });
    expect(parseSyncArgs(["--limit", "20"])).toEqual({ limit: 20, reparse: false });
    expect(parseSyncArgs(["--reparse"])).toEqual({ limit: null, reparse: true });
  });

  it("rejects bad input", () => {
    expect(() => parseSyncArgs(["--limit", "0"])).toThrow(/positive integer/);
    expect(() => parseSyncArgs(["--limit", "abc"])).toThrow(/positive integer/);
    expect(() => parseSyncArgs(["--limit", "5", "--reparse"])).toThrow(/cannot be combined/);
    expect(() => parseSyncArgs(["--unknown"])).toThrow();
  });
});
