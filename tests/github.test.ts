import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fetchProposals,
  pageSizeFrom,
  PROPOSALS_QUERY,
  requireToken,
  withRetry,
  type GqlIssueNode,
} from "../pipeline/github";
import { fakeFetchPage, issueNode } from "./fake-github";

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

async function collect(iterable: AsyncIterable<GqlIssueNode>): Promise<number[]> {
  const numbers: number[] = [];
  for await (const node of iterable) numbers.push(node.number);
  return numbers;
}

function recordingSleep() {
  const waits: number[] = [];
  return { waits, sleep: async (ms: number) => void waits.push(ms) };
}

describe("PROPOSALS_QUERY", () => {
  it("is exactly the query in SPEC 4.1", () => {
    const spec = readFileSync(new URL("../docs/SPEC.md", import.meta.url), "utf8");
    const block = /```graphql\n([\s\S]*?)```/.exec(spec)?.[1];
    expect(block).toBeDefined();
    expect(squash(PROPOSALS_QUERY)).toBe(squash(block!));
  });

  it("is read-only", () => {
    expect(PROPOSALS_QUERY).not.toMatch(/mutation/i);
    expect(PROPOSALS_QUERY.trim().startsWith("query ")).toBe(true);
  });
});

describe("environment", () => {
  it("requires GITHUB_TOKEN with a clear message", () => {
    expect(() => requireToken({})).toThrow(/GITHUB_TOKEN is not set/);
    expect(() => requireToken({ GITHUB_TOKEN: "   " })).toThrow(/GITHUB_TOKEN is not set/);
    expect(requireToken({ GITHUB_TOKEN: " abc " })).toBe("abc");
  });

  it("reads PANNER_PAGE_SIZE with a default of 50", () => {
    expect(pageSizeFrom({})).toBe(50);
    expect(pageSizeFrom({ PANNER_PAGE_SIZE: "20" })).toBe(20);
    expect(() => pageSizeFrom({ PANNER_PAGE_SIZE: "0" })).toThrow();
    expect(() => pageSizeFrom({ PANNER_PAGE_SIZE: "abc" })).toThrow();
    expect(() => pageSizeFrom({ PANNER_PAGE_SIZE: "101" })).toThrow();
  });
});

describe("withRetry", () => {
  it("retries with exponential backoff and returns the first success", async () => {
    const { waits, sleep } = recordingSleep();
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error("boom");
        return "ok";
      },
      { sleep },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(waits).toEqual([1000, 2000]);
  });

  it("gives up after 3 retries", async () => {
    const { waits, sleep } = recordingSleep();
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error(`fail ${attempts}`);
        },
        { sleep },
      ),
    ).rejects.toThrow("fail 4");
    expect(attempts).toBe(4);
    expect(waits).toEqual([1000, 2000, 4000]);
  });
});

describe("fetchProposals", () => {
  const nodes = [1, 2, 3, 4, 5].map((number) => issueNode({ number }));

  it("pages through everything in order", async () => {
    const fetchPage = fakeFetchPage(nodes);
    expect(await collect(fetchProposals(fetchPage, { pageSize: 2 }))).toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage.calls).toEqual([
      { after: null, pageSize: 2 },
      { after: "2", pageSize: 2 },
      { after: "4", pageSize: 2 },
    ]);
  });

  it("asks for no more than the limit", async () => {
    const fetchPage = fakeFetchPage(nodes);
    expect(await collect(fetchProposals(fetchPage, { pageSize: 2, limit: 3 }))).toEqual([1, 2, 3]);
    expect(fetchPage.calls.map((call) => call.pageSize)).toEqual([2, 1]);
  });

  it("skips null nodes", async () => {
    const fetchPage = fakeFetchPage([nodes[0]!, null, nodes[1]!]);
    expect(await collect(fetchProposals(fetchPage, { pageSize: 10 }))).toEqual([1, 2]);
  });

  it("waits until resetAt when remaining drops below 100, but not after the last page", async () => {
    const { waits, sleep } = recordingSleep();
    const now = () => Date.parse("2026-11-25T00:00:00Z");
    const fetchPage = fakeFetchPage(nodes, () => ({ cost: 1, remaining: 50, resetAt: "2026-11-25T00:10:00Z" }));
    const logs: string[] = [];
    await collect(fetchProposals(fetchPage, { pageSize: 3, sleep, now, log: (line) => logs.push(line) }));
    expect(waits).toEqual([10 * 60 * 1000 + 1000]);
    expect(logs[0]).toBe("page 1: 3 issues, cost 1, remaining 50");
  });

  it("reports each page's rate limit", async () => {
    const costs: number[] = [];
    const fetchPage = fakeFetchPage(nodes, (page) => ({ cost: page, remaining: 5000, resetAt: "2026-11-25T01:00:00Z" }));
    await collect(fetchProposals(fetchPage, { pageSize: 2, onPage: (rateLimit) => costs.push(rateLimit.cost) }));
    expect(costs).toEqual([1, 2, 3]);
  });
});
