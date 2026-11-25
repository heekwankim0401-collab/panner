// 수집 → 파싱 → data/raw, data/bodies (SPEC 4장).
// 매주 전체를 다시 받고, 파일은 내용이 바뀐 것만 다시 쓴다. 네트워크는 github.ts를 거친다.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  createFetchPage,
  fetchProposals,
  pageSizeFrom,
  realSleep,
  requireToken,
  type FetchPage,
  type GqlIssueNode,
  type Sleep,
} from "./github";
import { isMainModule, toDataJson, writeIfChanged } from "./io";
import { extractAnswers } from "./parse";
import type { Answers, RawProposal, SyncState } from "./types";

/** 이 시각보다 먼저 만들어진 제목형 본문은 `markdown` 시기다 (SPEC 5장 규칙 1, UTC). */
export const MARKDOWN_BEFORE = Date.parse("2021-06-06T00:00:00Z");

const STATE_REASONS: ReadonlyArray<NonNullable<RawProposal["stateReason"]>> = [
  "COMPLETED",
  "NOT_PLANNED",
  "REOPENED",
  "DUPLICATE",
];

export type DataPaths = { rawDir: string; bodiesDir: string; statePath: string };

export function dataPaths(dataDir: string): DataPaths {
  return {
    rawDir: join(dataDir, "raw"),
    bodiesDir: join(dataDir, "bodies"),
    statePath: join(dataDir, "state.json"),
  };
}

export const rawPath = (paths: DataPaths, number: number): string => join(paths.rawDir, `${number}.json`);
export const bodyPath = (paths: DataPaths, number: number): string => join(paths.bodiesDir, `${number}.md`);

/** 본문에서 답을 뽑고, 제목형이면 createdAt으로 `form`/`markdown`을 가른다. */
export function answersFor(body: string, createdAt: string): Answers {
  const answers = extractAnswers(body);
  if (answers.format === "form" && Date.parse(createdAt) < MARKDOWN_BEFORE) {
    return { ...answers, format: "markdown" };
  }
  return answers;
}

function toStateReason(value: string | null): RawProposal["stateReason"] {
  return STATE_REASONS.find((reason) => reason === value) ?? null;
}

function countReactions(groups: GqlIssueNode["reactionGroups"], content: string): number {
  return groups?.find((group) => group.content === content)?.reactors.totalCount ?? 0;
}

/** GraphQL 응답의 이슈 하나를 `data/raw` 형식으로 바꾼다 (SPEC 4.3). 순수 함수. */
export function toRawProposal(node: GqlIssueNode): RawProposal {
  const labels = (node.labels?.nodes ?? []).flatMap((label) => (label === null ? [] : [label.name])).sort();
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    stateReason: toStateReason(node.stateReason),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    closedAt: node.closedAt,
    comments: node.comments.totalCount,
    labels,
    up: countReactions(node.reactionGroups, "THUMBS_UP"),
    down: countReactions(node.reactionGroups, "THUMBS_DOWN"),
    assignees: node.assignees.totalCount,
    milestone: node.milestone?.title ?? null,
    answers: answersFor(node.body, node.createdAt),
  };
}

/** `data/raw`에 있는 제안 번호(오름차순). */
export function listRawNumbers(rawDir: string): number[] {
  if (!existsSync(rawDir)) return [];
  return readdirSync(rawDir)
    .flatMap((name) => {
      const match = /^(\d+)\.json$/.exec(name);
      return match?.[1] === undefined ? [] : [Number(match[1])];
    })
    .sort((a, b) => a - b);
}

/** 전에는 있었는데 이번 전체 수집에서 안 보인 번호(오름차순). 파일은 지우지 않는다. */
export function findVanished(existing: readonly number[], seen: ReadonlySet<number>): number[] {
  return existing.filter((number) => !seen.has(number)).sort((a, b) => a - b);
}

export type SyncSummary = {
  fetched: number;
  created: number;
  changed: number;
  unchanged: number;
  vanished: number[];
  cost: number;
  stateWritten: boolean;
};

export async function runSync(options: {
  fetchPage: FetchPage;
  paths: DataPaths;
  pageSize: number;
  limit: number | null;
  now: () => string;
  log?: (line: string) => void;
  sleep?: Sleep;
}): Promise<SyncSummary> {
  const { fetchPage, paths, pageSize, limit, now, log = () => {}, sleep = realSleep } = options;
  const existing = listRawNumbers(paths.rawDir);
  const existingSet = new Set(existing);
  const seen = new Set<number>();
  let created = 0;
  let changed = 0;
  let unchanged = 0;
  let cost = 0;

  const issues = fetchProposals(fetchPage, { pageSize, limit, sleep, log, onPage: (rateLimit) => (cost += rateLimit.cost) });
  for await (const node of issues) {
    const raw = toRawProposal(node);
    seen.add(raw.number);
    if (!writeIfChanged(rawPath(paths, raw.number), toDataJson(raw))) unchanged++;
    else if (existingSet.has(raw.number)) changed++;
    else created++;
    writeIfChanged(bodyPath(paths, raw.number), node.body);
  }

  // --limit일 때는 state.json을 쓰지 않고 사라진 번호도 검사하지 않는다 (SPEC 4.2).
  let vanished: number[] = [];
  const stateWritten = limit === null;
  if (stateWritten) {
    vanished = findVanished(existing, seen);
    for (const number of vanished) log(`#${number} is no longer in the repository; keeping data/raw/${number}.json`);
    const state: SyncState = { schemaVersion: 2, lastSyncedAt: now(), total: seen.size };
    writeIfChanged(paths.statePath, toDataJson(state));
  }

  log(`sync: ${seen.size} fetched, ${created} new, ${changed} changed, ${unchanged} unchanged, total cost ${cost}`);
  return { fetched: seen.size, created, changed, unchanged, vanished, cost, stateWritten };
}

export type ReparseSummary = { checked: number; changed: number; missingBody: number[] };

/** 네트워크 없이 `data/bodies`에서 답을 다시 뽑아 `data/raw`를 고친다 (`--reparse`). */
export function runReparse(paths: DataPaths, log: (line: string) => void = () => {}): ReparseSummary {
  const missingBody: number[] = [];
  let checked = 0;
  let changed = 0;
  for (const number of listRawNumbers(paths.rawDir)) {
    const body = bodyPath(paths, number);
    if (!existsSync(body)) {
      missingBody.push(number);
      continue;
    }
    checked++;
    const raw = JSON.parse(readFileSync(rawPath(paths, number), "utf8")) as RawProposal;
    const updated: RawProposal = { ...raw, answers: answersFor(readFileSync(body, "utf8"), raw.createdAt) };
    if (writeIfChanged(rawPath(paths, number), toDataJson(updated))) changed++;
  }
  if (missingBody.length > 0) log(`reparse: ${missingBody.length} proposals have no cached body (run npm run sync first)`);
  log(`reparse: ${checked} checked, ${changed} changed`);
  return { checked, changed, missingBody };
}

export type SyncArgs = { limit: number | null; reparse: boolean };

export function parseSyncArgs(argv: string[]): SyncArgs {
  const { values } = parseArgs({
    args: argv,
    options: { limit: { type: "string" }, reparse: { type: "boolean", default: false } },
    strict: true,
    allowPositionals: false,
  });
  let limit: number | null = null;
  if (values.limit !== undefined) {
    limit = Number(values.limit);
    if (!Number.isInteger(limit) || limit < 1) throw new Error(`--limit must be a positive integer, got "${values.limit}"`);
  }
  if (values.reparse && limit !== null) throw new Error("--reparse reads every cached body; it cannot be combined with --limit");
  return { limit, reparse: values.reparse ?? false };
}

async function main(): Promise<void> {
  const args = parseSyncArgs(process.argv.slice(2));
  const paths = dataPaths("data");
  if (args.reparse) {
    runReparse(paths, console.log);
    return;
  }
  const token = requireToken(process.env);
  await runSync({
    fetchPage: createFetchPage(token, { log: console.log }),
    paths,
    pageSize: pageSizeFrom(process.env),
    limit: args.limit,
    now: () => new Date().toISOString(),
    log: console.log,
  });
}

if (isMainModule(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
