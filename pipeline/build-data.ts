// 화면용 데이터 생성 (SPEC 8장).
// T1 최소 구현: `data/raw`가 없거나 비어 있으면 `items: []`인 index.json을 쓴다.
// 상태 판정·점수와 detail/*.json은 T7에서 채운다.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isMainModule, toWebJson, writeIfChanged } from "./io";
import type { IndexFile, SyncState } from "./types";

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

/** `data/state.json`의 lastSyncedAt. 파일이 없으면 null(`--limit` 수집 뒤 등). */
export function readLastSyncedAt(statePath: string): string | null {
  if (!existsSync(statePath)) return null;
  const state = JSON.parse(readFileSync(statePath, "utf8")) as Partial<SyncState>;
  return state.lastSyncedAt ?? null;
}

export function buildIndex(input: { rawCount: number; lastSyncedAt: string | null; now: string }): IndexFile {
  return {
    meta: { builtAt: input.now, lastSyncedAt: input.lastSyncedAt, total: input.rawCount, included: 0 },
    labels: [],
    items: [],
  };
}

export function buildData(options: BuildDataOptions): { index: IndexFile; bytes: number } {
  const rawFiles = listRawFiles(options.rawDir);
  const index = buildIndex({
    rawCount: rawFiles.length,
    lastSyncedAt: readLastSyncedAt(options.statePath),
    now: options.now,
  });
  const content = toWebJson(index);
  writeIfChanged(join(options.outDir, "index.json"), content);
  return { index, bytes: Buffer.byteLength(content, "utf8") };
}

if (isMainModule(import.meta.url)) {
  const { index, bytes } = buildData({
    rawDir: "data/raw",
    statePath: "data/state.json",
    outDir: "web/public/data",
    now: new Date().toISOString(),
  });
  console.log(`build:data: index.json ${bytes} bytes, included ${index.meta.included} of ${index.meta.total}`);
}
