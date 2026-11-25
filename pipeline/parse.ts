// 양식 답변 추출 (SPEC 5장). 순수 함수만 둔다.
// `form`과 `markdown`은 본문만으로 구분할 수 없어 여기서는 항상 "form"을 돌려주고,
// sync.ts가 createdAt < 2021-06-06(UTC)이면 "markdown"으로 바꾼다.
import type { Answers, Format } from "./types";

/** 답 하나의 최대 길이, 코드 포인트 기준 (SPEC 4.3) */
export const MAX_ANSWER_CHARS = 2000;

/** 두 질문 원문 (2019-09-04 ~ 2026-01-24 동안 한 글자도 바뀌지 않음) */
const QUESTIONS = {
  workaround: "If this enhancement will not be used often, can it be worked around with a few lines of script?",
  core: "Is there a reason why this should be core and not an add-on in the asset library?",
} as const;

type Field = keyof typeof QUESTIONS;

/** 2026-01-25 이후 이슈 폼의 제목 (규칙 2) */
const FORM2026_HEADINGS = ["Problem or limitation", "Proposed improvement"] as const;

/** 규칙 1: 제목 줄 */
const MARKDOWN_HEADING = /^### (.+)$/;
/** 규칙 3: 한 줄 전체가 굵은 글씨인 줄 */
const BOLD_LINE = /^\*\*(.+?)\*\*:?\s*$/;
/** 규칙 5: HTML 주석 (여러 줄 포함) */
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

/** 규칙 4: 소문자화, 영문자·숫자·공백 외 문자 삭제, 공백 정리 */
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_QUESTIONS: ReadonlyArray<readonly [Field, string]> = (Object.keys(QUESTIONS) as Field[]).map(
  (field) => [field, normalizeForCompare(QUESTIONS[field])] as const,
);
const NORMALIZED_FORM2026: readonly string[] = FORM2026_HEADINGS.map(normalizeForCompare);

/** 정리한 질문 원문이 정리한 제목 안에 들어 있으면 그 질문이다(규칙 4). */
function questionOf(heading: string): Field | null {
  const normalized = normalizeForCompare(heading);
  for (const [field, question] of NORMALIZED_QUESTIONS) {
    if (normalized.includes(question)) return field;
  }
  return null;
}

/** `### 제목` 줄이면 제목 글, 아니면 null. */
function markdownHeading(line: string): string | null {
  const text = MARKDOWN_HEADING.exec(line)?.[1];
  return text === undefined ? null : text.trim();
}

/**
 * 굵은 글씨 줄 중 안의 글이 `:` 또는 `?`로 끝나는 줄만 구획 제목이다(규칙 3).
 * `**No.**`, `**Yes!**` 같은 굵은 답 줄은 제목이 아니다.
 */
function boldHeading(line: string): string | null {
  const inner = BOLD_LINE.exec(line)?.[1]?.trim();
  if (inner === undefined) return null;
  return inner.endsWith(":") || inner.endsWith("?") ? inner : null;
}

type Section = { heading: string; body: string };

/** 제목 줄로 본문을 나눈다. 각 구획은 제목 다음 줄부터 다음 제목 전(또는 본문 끝)까지. */
function splitSections(lines: readonly string[], headingOf: (line: string) => string | null): Section[] {
  const sections: Section[] = [];
  let heading: string | null = null;
  let buffer: string[] = [];
  for (const line of lines) {
    const next = headingOf(line);
    if (next === null) {
      if (heading !== null) buffer.push(line);
      continue;
    }
    if (heading !== null) sections.push({ heading, body: buffer.join("\n") });
    heading = next;
    buffer = [];
  }
  if (heading !== null) sections.push({ heading, body: buffer.join("\n") });
  return sections;
}

/** 규칙 5와 SPEC 4.3: HTML 주석 삭제, 앞뒤 공백 삭제, 빈 값이나 `_No response_`는 null, 2,000자에서 자른다. */
export function cleanAnswer(raw: string): string | null {
  const text = raw.replace(HTML_COMMENT, "").trim();
  if (text === "" || text === "_No response_") return null;
  const chars = Array.from(text); // 코드 포인트 단위라 이모지 같은 서로게이트 쌍을 자르지 않는다
  return chars.length > MAX_ANSWER_CHARS ? chars.slice(0, MAX_ANSWER_CHARS).join("") : text;
}

/** 구획 중 두 질문에 해당하는 것의 답을 모은다. 둘 다 없으면 null. 같은 질문이 또 나오면 처음 것만 쓴다. */
function answersFrom(sections: readonly Section[], format: Format): Answers | null {
  const found = new Map<Field, string | null>();
  for (const section of sections) {
    const field = questionOf(section.heading);
    if (field !== null && !found.has(field)) found.set(field, cleanAnswer(section.body));
  }
  if (found.size === 0) return null;
  return { workaround: found.get("workaround") ?? null, core: found.get("core") ?? null, format };
}

export function extractAnswers(body: string): Answers {
  // 규칙 0: 줄 끝을 \n으로 맞춘다. 실제 본문은 대부분 \r\n이다.
  const lines = body.replace(/\r\n?/g, "\n").split("\n");

  // 규칙 1: 제목형 (form / markdown)
  const headingSections = splitSections(lines, markdownHeading);
  const fromHeadings = answersFrom(headingSections, "form");
  if (fromHeadings !== null) return fromHeadings;

  // 규칙 2: 2026-01-25 이후 새 양식. 두 질문이 없다.
  if (headingSections.some((section) => NORMALIZED_FORM2026.includes(normalizeForCompare(section.heading)))) {
    return { workaround: null, core: null, format: "form2026" };
  }

  // 규칙 3: 굵은 글씨형 (legacy)
  const fromBold = answersFrom(splitSections(lines, boldHeading), "legacy");
  if (fromBold !== null) return fromBold;

  // 규칙 6: 어디에도 해당하지 않음
  return { workaround: null, core: null, format: "unknown" };
}
