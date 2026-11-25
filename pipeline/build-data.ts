// 화면용 데이터 생성 (SPEC 8장): data/raw → web/public/data/index.json, detail/<floor(n/100)>.json
// 분류(classify)와 상태·점수(score)는 여기서 계산한다. 계산은 순수 함수 `buildSite`, 파일 읽기·쓰기는 `buildData`.
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { classify } from "./classify";
import { isMainModule, toWebJson, writeIfChanged } from "./io";
import { isArchivedLabel, scoreOf, STATUS_WEIGHT, statusOf, type Status } from "./score";
import type { DetailFile, Feasibility, IndexFile, IndexItem, RawProposal, SyncState } from "./types";

/** 상세 답의 최대 길이(코드 포인트). 자르면 `…`를 붙인다. */
export const DETAIL_ANSWER_CHARS = 600;
/** 상세 묶음 하나에 들어가는 번호 범위 */
export const DETAIL_BUCKET = 100;

export type BuildDataOptions = {
  rawDir: string;
  statePath: string;
  outDir: string;
  /** builtAt에 넣을 시각. 바깥에서 받아서 같은 입력이면 같은 바이트가 나오게 한다. */
  now: string;
};

/** `data/raw`의 JSON 파일 이름(정렬). 폴더가 없으면 빈 목록. */
export function listRawFiles(rawDir: string): string[] {
  if (!existsSync(rawDir)) return [];
  return readdirSync(rawDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

export function readRaws(rawDir: string): RawProposal[] {
  return listRawFiles(rawDir).map((name) => {
    try {
      return JSON.parse(readFileSync(join(rawDir, name), "utf8")) as RawProposal;
    } catch (error) {
      throw new Error(`cannot read ${join(rawDir, name)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/** `data/state.json`의 lastSyncedAt. 파일이 없으면 null(`--limit` 수집 뒤 등). */
export function readLastSyncedAt(statePath: string): string | null {
  if (!existsSync(statePath)) return null;
  const state = JSON.parse(readFileSync(statePath, "utf8")) as Partial<SyncState>;
  return state.lastSyncedAt ?? null;
}

/** 화면용으로 자른다: 600자(코드 포인트)를 넘으면 자르고 `…`를 붙인다. */
export function truncateForDetail(text: string | null): string | null {
  if (text === null) return null;
  const chars = Array.from(text);
  return chars.length > DETAIL_ANSWER_CHARS ? chars.slice(0, DETAIL_ANSWER_CHARS).join("") + "…" : text;
}

export const detailBucket = (number: number): number => Math.floor(number / DETAIL_BUCKET);

export type Site = {
  index: IndexFile;
  /** 묶음 번호 → 상세 파일 */
  details: Map<number, DetailFile>;
};

/** data/raw 전체에서 화면용 데이터를 만든다. 순수 함수. 항목은 번호순. */
export function buildSite(input: { raws: readonly RawProposal[]; lastSyncedAt: string | null; now: string }): Site {
  type Prepared = { raw: RawProposal; status: Status; feasibility: Feasibility; labels: string[] };
  const prepared: Prepared[] = [];
  const evidenceOf = new Map<number, ReturnType<typeof classify>["evidence"]>();

  for (const raw of [...input.raws].sort((a, b) => a.number - b.number)) {
    const status = statusOf(raw);
    if (STATUS_WEIGHT[status] <= 0) continue; // 포함 대상: open, archived
    const result = classify(raw.answers);
    evidenceOf.set(raw.number, result.evidence);
    prepared.push({ raw, status, feasibility: result.feasibility, labels: raw.labels.filter((l) => !isArchivedLabel(l)) });
  }

  const labels = [...new Set(prepared.flatMap((p) => p.labels))].sort();
  const labelIndex = new Map(labels.map((label, position) => [label, position]));

  const items: IndexItem[] = prepared.map(({ raw, status, feasibility, labels: own }) => ({
    n: raw.number,
    t: raw.title,
    u: raw.up,
    d: raw.down,
    c: raw.comments,
    l: own.map((label) => labelIndex.get(label)!).sort((a, b) => a - b),
    st: status as IndexItem["st"],
    f: feasibility,
    s: scoreOf(raw, feasibility, status),
    a: raw.assignees > 0,
    m: raw.milestone,
    up: raw.updatedAt.slice(0, 10),
  }));

  const details = new Map<number, DetailFile>();
  for (const { raw } of prepared) {
    const bucket = detailBucket(raw.number);
    const file = details.get(bucket) ?? {};
    file[String(raw.number)] = {
      w: truncateForDetail(raw.answers.workaround),
      c: truncateForDetail(raw.answers.core),
      ev: evidenceOf.get(raw.number) ?? [],
      url: raw.url,
      fmt: raw.answers.format,
    };
    details.set(bucket, file);
  }

  return {
    index: {
      meta: { builtAt: input.now, lastSyncedAt: input.lastSyncedAt, total: input.raws.length, included: items.length },
      labels,
      items,
    },
    details,
  };
}

/** 분류 분포: 상태 × feasibility 개수 */
export function distribution(index: IndexFile): Record<IndexItem["st"], Record<Feasibility, number>> {
  const empty = (): Record<Feasibility, number> => ({ likely: 0, unclear: 0, hard: 0, noanswer: 0 });
  const result = { open: empty(), archived: empty() };
  for (const item of index.items) result[item.st][item.f]++;
  return result;
}

export type BuildDataResult = { index: IndexFile; bytes: number; detailFiles: number; removed: string[] };

export function buildData(options: BuildDataOptions): BuildDataResult {
  const site = buildSite({
    raws: readRaws(options.rawDir),
    lastSyncedAt: readLastSyncedAt(options.statePath),
    now: options.now,
  });

  const content = toWebJson(site.index);
  writeIfChanged(join(options.outDir, "index.json"), content);

  const detailDir = join(options.outDir, "detail");
  const written = new Set<string>();
  for (const [bucket, file] of site.details) {
    const name = `${bucket}.json`;
    writeIfChanged(join(detailDir, name), toWebJson(file));
    written.add(name);
  }
  // 이전 빌드에서 남은 묶음은 지운다(생성물이므로 지워도 된다).
  const removed = existsSync(detailDir)
    ? readdirSync(detailDir).filter((name) => name.endsWith(".json") && !written.has(name))
    : [];
  for (const name of removed) rmSync(join(detailDir, name));

  return { index: site.index, bytes: Buffer.byteLength(content, "utf8"), detailFiles: written.size, removed };
}

if (isMainModule(import.meta.url)) {
  const { index, bytes, detailFiles, removed } = buildData({
    rawDir: "data/raw",
    statePath: "data/state.json",
    outDir: "web/public/data",
    now: new Date().toISOString(),
  });
  console.log(
    `build:data: index.json ${bytes} bytes, included ${index.meta.included} of ${index.meta.total}, ` +
      `${index.labels.length} labels, ${detailFiles} detail files` +
      (removed.length > 0 ? `, removed ${removed.length} stale` : ""),
  );
  const dist = distribution(index);
  console.log("status \\ feasibility | likely | unclear | hard | noanswer");
  for (const status of ["open", "archived"] as const) {
    const row = dist[status];
    console.log(`${status} | ${row.likely} | ${row.unclear} | ${row.hard} | ${row.noanswer}`);
  }
}
