// 필터 상태 ↔ URL 쿼리 문자열 (SPEC 9장). 순수 함수만 둔다.
// 키: q, f, st, lb, min, sort, p. 기본값과 같은 값은 생략한다. `f=all`은 feasibility 필터 없음.
// 다중 선택은 쉼표로 잇고(`f=likely,unclear`), 값 안의 쉼표는 %2C로 쓴다. `lb`에는 라벨 이름을 쓴다.
import type { Feasibility } from "../../pipeline/types";
import { DEFAULT_FILTER, FEASIBILITIES, normalizeFilter, SORT_KEYS, STATUSES, type FilterState, type SortKey, type StatusFilter } from "./filter";

const encode = (value: string): string => encodeURIComponent(value);
const decode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
};

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** 상태를 쿼리 문자열로. 기본 화면이면 빈 문자열, 아니면 `?`로 시작한다. */
export function toQuery(state: FilterState): string {
  const s = normalizeFilter(state);
  const parts: string[] = [];
  if (s.q.trim() !== "") parts.push(`q=${encode(s.q)}`);
  if (!sameList(s.f, DEFAULT_FILTER.f)) parts.push(`f=${s.f.length === 0 ? "all" : s.f.join(",")}`);
  if (s.st.length > 0) parts.push(`st=${s.st.join(",")}`);
  if (s.lb.length > 0) parts.push(`lb=${s.lb.map(encode).join(",")}`);
  if (s.min > 0) parts.push(`min=${s.min}`);
  if (s.sort !== DEFAULT_FILTER.sort) parts.push(`sort=${s.sort}`);
  if (s.p > 1) parts.push(`p=${s.p}`);
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/** 쿼리 문자열을 상태로. 모르는 키나 잘못된 값은 버리고 기본값을 쓴다. */
export function fromQuery(search: string): FilterState {
  const values = new Map<string, string>();
  for (const pair of search.replace(/^\?/, "").split("&")) {
    if (pair === "") continue;
    const at = pair.indexOf("=");
    const key = decode(at === -1 ? pair : pair.slice(0, at));
    if (!values.has(key)) values.set(key, at === -1 ? "" : pair.slice(at + 1)); // 같은 키가 또 나오면 처음 것
  }
  const list = (key: string): string[] | undefined => {
    const raw = values.get(key);
    return raw === undefined || raw === "" ? undefined : raw.split(",").map(decode).filter((value) => value !== "");
  };
  const number = (key: string): number | undefined => {
    const raw = values.get(key);
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isInteger(parsed) ? parsed : undefined;
  };

  const state: FilterState = { ...DEFAULT_FILTER, f: [...DEFAULT_FILTER.f], st: [], lb: [] };
  const q = values.get("q");
  if (q !== undefined) state.q = decode(q);

  const f = list("f");
  if (f?.length === 1 && f[0] === "all") state.f = [];
  else if (f !== undefined) {
    const known = f.filter((value): value is Feasibility => (FEASIBILITIES as readonly string[]).includes(value));
    if (known.length > 0) state.f = known;
  }

  const st = list("st");
  if (st !== undefined) state.st = st.filter((value): value is StatusFilter => (STATUSES as readonly string[]).includes(value));

  const lb = list("lb");
  if (lb !== undefined) state.lb = lb;

  const min = number("min");
  if (min !== undefined && min > 0) state.min = min;

  const sort = values.get("sort");
  if (sort !== undefined && (SORT_KEYS as readonly string[]).includes(sort)) state.sort = sort as SortKey;

  const p = number("p");
  if (p !== undefined && p > 1) state.p = p;

  return normalizeFilter(state);
}
