// 화면의 필터·정렬·페이지 (SPEC 9장). 순수 함수만 둔다.
// pipeline/label.ts, eval.ts도 "기본 화면 상위 N개"를 여기서 구한다(화면과 똑같이 뽑기 위해).
import type { Feasibility, IndexItem } from "../../pipeline/types";

export type SortKey = "score" | "votes" | "updated" | "comments";
export type StatusFilter = IndexItem["st"];

export type FilterState = {
  /** 제목 검색어(대소문자 무시). 빈 문자열이면 필터 없음. */
  q: string;
  /** 고른 feasibility(OR). 빈 배열이면 필터 없음(URL `f=all`). */
  f: Feasibility[];
  /** 고른 상태(OR). 빈 배열이면 상태 전체. */
  st: StatusFilter[];
  /** 고른 라벨 이름(OR). 빈 배열이면 필터 없음. */
  lb: string[];
  /** 최소 추천 수(`u`, 👍 수) */
  min: number;
  sort: SortKey;
  /** 페이지 번호, 1부터 */
  p: number;
};

export const PAGE_SIZE = 50;

/** 기본 화면: feasibility=likely, 상태 전체, score 정렬 (SPEC 9장) */
export const DEFAULT_FILTER: Readonly<FilterState> = Object.freeze<FilterState>({
  q: "",
  f: ["likely"],
  st: [],
  lb: [],
  min: 0,
  sort: "score",
  p: 1,
});

/** 필터끼리는 AND, 한 필터 안의 다중 선택은 OR. */
export function filterItems(items: readonly IndexItem[], labels: readonly string[], state: FilterState): IndexItem[] {
  const query = state.q.trim().toLowerCase();
  const feasibilities = new Set(state.f);
  const statuses = new Set(state.st);
  const wanted = new Set(state.lb);
  return items.filter((item) => {
    if (query !== "" && !item.t.toLowerCase().includes(query)) return false;
    if (feasibilities.size > 0 && !feasibilities.has(item.f)) return false;
    if (statuses.size > 0 && !statuses.has(item.st)) return false;
    if (wanted.size > 0 && !item.l.some((index) => wanted.has(labels[index] ?? ""))) return false;
    return item.u >= state.min;
  });
}

const COMPARE: Readonly<Record<SortKey, (a: IndexItem, b: IndexItem) => number>> = {
  score: (a, b) => b.s - a.s,
  votes: (a, b) => b.u - a.u,
  updated: (a, b) => (a.up === b.up ? 0 : a.up < b.up ? 1 : -1),
  comments: (a, b) => b.c - a.c,
};

/** 모두 내림차순, 동점은 번호 오름차순. 원래 배열은 바꾸지 않는다. */
export function sortItems(items: readonly IndexItem[], sort: SortKey): IndexItem[] {
  const compare = COMPARE[sort];
  return [...items].sort((a, b) => compare(a, b) || a.n - b.n);
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** 페이지 번호를 1 ~ 마지막 페이지로 맞춰 그 페이지의 행을 돌려준다. */
export function pageItems(items: readonly IndexItem[], page: number): { items: IndexItem[]; page: number; pages: number } {
  const pages = pageCount(items.length);
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), page: current, pages };
}

/** 기본 화면(likely, 상태 전체, score순)의 상위 n개. 정밀도 평가(SPEC 10장)가 쓴다. */
export function topOfDefaultView(items: readonly IndexItem[], labels: readonly string[], n: number): IndexItem[] {
  return sortItems(filterItems(items, labels, DEFAULT_FILTER), DEFAULT_FILTER.sort).slice(0, n);
}
