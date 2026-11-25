// 상태 판정과 기회 점수 (SPEC 7장). 순수 함수만 둔다.
// 점수 가중치는 이 파일 맨 위에만 둔다(CLAUDE.md). 상태 판정은 T5 통계에서 먼저 쓰고 T7이 그대로 쓴다.
import type { Feasibility, RawProposal } from "./types";

// ───────────────────────────── 가중치 (SPEC 7장) ─────────────────────────────

export type Status = "dup" | "archived" | "done" | "open";

/** 상태별 wStatus. 0이면 화면에서 뺀다. */
export const STATUS_WEIGHT: Readonly<Record<Status, number>> = {
  dup: 0,
  archived: 1.0,
  done: 0,
  open: 0.7,
};

/** 애드온 가능성별 wAddon. */
export const ADDON_WEIGHT: Readonly<Record<Feasibility, number>> = {
  likely: 1.0,
  unclear: 0.5,
  noanswer: 0.5,
  hard: 0.1,
};

/** 점수는 소수 둘째 자리까지 반올림한다(3.456 → 3.46). */
export const SCORE_DECIMALS = 2;

/** "엔진이 안 함"을 뜻하는 라벨. 대소문자를 무시하고 비교한다. */
export const ARCHIVED_LABEL = "archived";

// ───────────────────────────── 상태 판정 ─────────────────────────────

/**
 * 위에서부터 먼저 맞는 것 (SPEC 7장 표).
 * GitHub의 닫힌 이유는 중복 판별에만 쓴다. archived 라벨 없이 NOT_PLANNED로 닫힌 것은 done이다.
 */
export function statusOf(proposal: Pick<RawProposal, "state" | "stateReason" | "labels">): Status {
  if (proposal.state === "OPEN") return "open";
  if (proposal.stateReason === "DUPLICATE") return "dup";
  if (proposal.labels.some((label) => isArchivedLabel(label))) return "archived";
  return "done";
}

export function isArchivedLabel(label: string): boolean {
  return label.toLowerCase() === ARCHIVED_LABEL;
}

// ───────────────────────────── 점수 ─────────────────────────────

/** 소수 `SCORE_DECIMALS`째 자리까지 반올림. 1.005 같은 이진수 오차를 EPSILON으로 보정한다. */
export function roundScore(value: number): number {
  const factor = 10 ** SCORE_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** score = log2(1 + max(0, up - down)) × wAddon × wStatus (SPEC 7장) */
export function scoreOf(votes: Pick<RawProposal, "up" | "down">, feasibility: Feasibility, status: Status): number {
  const net = Math.max(0, votes.up - votes.down);
  return roundScore(Math.log2(1 + net) * ADDON_WEIGHT[feasibility] * STATUS_WEIGHT[status]);
}
