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

export const NOANSWER_NOTE =
  "This proposal uses the template introduced on 2026-01-25, which has no add-on question.";
