// 정밀도 계산 (SPEC 10장). 기본 화면 상위 30개 중 사람이 라벨을 붙인 것의 정밀도 = yes / (yes + no).
// 종료 코드: 라벨 없는 항목이 있거나 yes + no가 0이면 2("label 먼저"), 70% 미만이면 1, 그 밖은 0.
// label.ts도 상위 30개 구하기와 golden.json 읽기·쓰기를 여기서 가져다 쓴다.
import { existsSync, readFileSync } from "node:fs";
import { topOfDefaultView } from "../web/src/filter";
import { buildSite, readRaws } from "./build-data";
import { isMainModule, toDataJson, writeIfChanged } from "./io";
import type { Evidence, IndexItem, RawProposal } from "./types";

export const TOP_N = 30;
export const PRECISION_TARGET = 0.7;
export const GOLDEN_PATH = "data/golden.json";
export const RAW_DIR = "data/raw";

export type Label = "yes" | "no" | "skip";
/** `data/golden.json`: `{ "<number>": "yes" | "no" | "skip" }` */
export type Golden = Record<string, Label>;

const LABELS: readonly Label[] = ["yes", "no", "skip"];

export function readGolden(path: string = GOLDEN_PATH): Golden {
  if (!existsSync(path)) return {};
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const golden: Golden = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!/^\d+$/.test(key) || !LABELS.includes(value as Label)) {
      throw new Error(`${path}: bad entry "${key}": ${JSON.stringify(value)} (expected "yes", "no" or "skip")`);
    }
    golden[key] = value as Label;
  }
  return golden;
}

/** 키 정렬, 2칸 들여쓰기, 끝 줄바꿈(`data/` 규칙). 내용이 같으면 쓰지 않는다. */
export function writeGolden(golden: Golden, path: string = GOLDEN_PATH): void {
  writeIfChanged(path, toDataJson(golden));
}

/** 상위 항목 하나와 사람이 판단할 때 볼 것(전체 답, 근거). */
export type TopEntry = { item: IndexItem; raw: RawProposal; evidence: Evidence[] };

/** build:data와 같은 방식(buildSite)으로 기본 화면 상위 n개를 구한다. 파일은 쓰지 않는다. */
export function topEntries(raws: readonly RawProposal[], n: number = TOP_N): TopEntry[] {
  const site = buildSite({ raws, lastSyncedAt: null, now: "" });
  const byNumber = new Map(raws.map((raw) => [raw.number, raw]));
  return topOfDefaultView(site.index.items, site.index.labels, n).map((item) => ({
    item,
    raw: byNumber.get(item.n)!,
    evidence: site.details.get(Math.floor(item.n / 100))?.[String(item.n)]?.ev ?? [],
  }));
}

export type EvalResult<T> = {
  total: number;
  yes: number;
  no: number;
  skip: number;
  /** 라벨이 없는 번호 */
  unlabeled: number[];
  /** yes / (yes + no). 둘 다 0이면 null. */
  precision: number | null;
  noEntries: T[];
};

export function evaluate<T extends { item: { n: number } }>(top: readonly T[], golden: Golden): EvalResult<T> {
  const result: EvalResult<T> = { total: top.length, yes: 0, no: 0, skip: 0, unlabeled: [], precision: null, noEntries: [] };
  for (const entry of top) {
    const label = golden[String(entry.item.n)];
    if (label === undefined) result.unlabeled.push(entry.item.n);
    else if (label === "yes") result.yes++;
    else if (label === "no") {
      result.no++;
      result.noEntries.push(entry);
    } else result.skip++;
  }
  const judged = result.yes + result.no;
  result.precision = judged === 0 ? null : result.yes / judged;
  return result;
}

export function exitCodeFor(result: Pick<EvalResult<unknown>, "unlabeled" | "precision">): 0 | 1 | 2 {
  if (result.unlabeled.length > 0 || result.precision === null) return 2;
  return result.precision < PRECISION_TARGET ? 1 : 0;
}

export const formatEvidence = (evidence: readonly Evidence[]): string =>
  evidence.length === 0 ? "(none)" : evidence.map((e) => `${e.rule} "${e.phrase}"`).join(", ");

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export function report(result: EvalResult<TopEntry>): string[] {
  const lines = [
    `eval: top ${result.total} of the default view — yes ${result.yes}, no ${result.no}, skip ${result.skip}, unlabeled ${result.unlabeled.length}`,
  ];
  if (result.precision !== null) {
    lines.push(
      `precision: ${percent(result.precision)} (${result.yes}/${result.yes + result.no}), target ${percent(PRECISION_TARGET)}`,
    );
  }
  if (result.noEntries.length > 0) {
    lines.push("no:");
    for (const { item, evidence } of result.noEntries) lines.push(`  #${item.n} ${item.t} — ${formatEvidence(evidence)}`);
  }
  if (result.unlabeled.length > 0 || result.precision === null) {
    lines.push(
      `label first: ${result.unlabeled.length > 0 ? result.unlabeled.map((n) => `#${n}`).join(", ") : "no yes/no labels yet"} — run npm run label`,
    );
  }
  return lines;
}

if (isMainModule(import.meta.url)) {
  const result = evaluate(topEntries(readRaws(RAW_DIR)), readGolden());
  for (const line of report(result)) console.log(line);
  process.exitCode = exitCodeFor(result);
}
