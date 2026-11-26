// 화면에 쓰는 이름표. UI 문구는 영어(SPEC 9장).
import type { Feasibility, IndexItem } from "../../pipeline/types";
import type { SortKey } from "./filter";

export const FEASIBILITY_NAME: Readonly<Record<Feasibility, string>> = {
  likely: "Likely add-on",
  unclear: "Unclear",
  hard: "Hard as add-on",
  noanswer: "No answer",
};

export const STATUS_NAME: Readonly<Record<IndexItem["st"], string>> = {
  open: "Open",
  archived: "Closed: archived",
};

export const SORT_NAME: Readonly<Record<SortKey, string>> = {
  score: "Score",
  votes: "Upvotes",
  updated: "Recently updated",
  comments: "Comments",
};

/** GitHub 라벨 이름을 짧게 보여준다: "topic:editor" → "editor" */
export const labelName = (label: string): string => label.replace(/^topic:/, "");

export const issueUrl = (number: number): string => `https://github.com/godotengine/godot-proposals/issues/${number}`;

/**
 * ISO 시각을 보는 사람의 시간대 날짜(YYYY-MM-DD)로 바꾼다. 값이 없거나 잘못됐으면 null.
 * `timeZone`을 주면 그 시간대로 계산한다(테스트용). 안 주면 브라우저의 시간대를 쓴다.
 * 로캘 기본 형식에 기대지 않으려고 formatToParts로 조각을 뽑아 직접 잇는다.
 */
export function localDay(iso: string | null, timeZone?: string): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export const NOANSWER_NOTE =
  "This proposal uses the template introduced on 2026-01-25, which has no add-on question.";
