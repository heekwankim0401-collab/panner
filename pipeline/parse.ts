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

/** 규칙 1: 마크다운 제목 줄 (`#`부터 `######`까지, 뒤에 공백 하나 이상) */
const MARKDOWN_HEADING = /^(#{1,6})[ \t]+(.+)$/;
/** 펜스 코드 블록의 시작·끝 줄 후보 (``` 또는 ~~~ 세 개 이상, 들여쓰기 3칸까지) */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
/** 규칙 3: 한 줄 전체가 굵은 글씨인 줄 */
const BOLD_LINE = /^\*\*(.+?)\*\*:?\s*$/;
/** 규칙 3: 굵은 글씨로 시작하는 줄 (같은 줄에 답이 이어질 수 있음) */
const BOLD_START = /^\*\*(.+?)\*\*(.*)$/;
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

/**
 * 줄마다 펜스 코드 블록 안(펜스 줄 포함)인지 표시한다. 그 안의 줄은 제목으로 보지 않는다.
 * CommonMark처럼, 백틱 펜스는 같은 줄에 백틱이 또 있으면 시작이 아니다(```` ```code``` ````는 인라인 코드).
 * 닫는 줄은 여는 것과 같은 문자로 같거나 더 길고, 뒤에 공백만 있어야 한다.
 */
function fencedLines(lines: readonly string[]): boolean[] {
  let open: { char: string; length: number } | null = null;
  return lines.map((line) => {
    const match = FENCE.exec(line);
    const marker = match?.[1];
    const rest = match?.[2] ?? "";
    if (open === null) {
      if (marker === undefined || (marker.startsWith("`") && rest.includes("`"))) return false;
      open = { char: marker.charAt(0), length: marker.length };
      return true;
    }
    if (marker !== undefined && marker.startsWith(open.char) && marker.length >= open.length && rest.trim() === "") {
      open = null;
    }
    return true;
  });
}

/** 제목 하나. `inline`은 제목 줄 안에서 제목 뒤에 이어진 답(굵은 글씨형에서만 생긴다). */
type Heading = { index: number; level: number; text: string; inline: string };

/**
 * 코드 블록 안의 제목 줄은 버린다(GDScript 주석 `# ...` 등). 다만 질문 제목은 코드 블록 안이라도 남긴다:
 * 펜스를 잘못 닫아(```` ```markdown ```` 등) 본문 끝까지 코드 블록이 이어진 본문에서도 답을 잃지 않게 한다.
 */
function keepHeading(heading: Heading, fenced: readonly boolean[]): boolean {
  return !fenced[heading.index] || questionOf(heading.text) !== null;
}

/** 마크다운 제목들 (`keepHeading` 기준). */
function markdownHeadings(lines: readonly string[], fenced: readonly boolean[]): Heading[] {
  const headings: Heading[] = [];
  lines.forEach((line, index) => {
    const match = MARKDOWN_HEADING.exec(line);
    const hashes = match?.[1];
    const text = match?.[2];
    if (hashes === undefined || text === undefined) return;
    const heading: Heading = { index, level: hashes.length, text: text.trim(), inline: "" };
    if (keepHeading(heading, fenced)) headings.push(heading);
  });
  return headings;
}

/**
 * 굵은 글씨형 구획 제목 (규칙 3).
 * - 한 줄 전체가 굵은 글씨이고 안의 글이 `:`나 `?`로 끝나면 제목이다. `**No.**` 같은 굵은 답 줄은 제목이 아니다.
 * - 굵은 글씨 안에 질문이 들어 있으면, 뒤에 글이 이어져도 제목이다. 그 뒤의 글은 답의 첫 줄이다.
 */
function boldHeading(line: string): { text: string; inline: string } | null {
  const whole = BOLD_LINE.exec(line)?.[1]?.trim();
  if (whole !== undefined && (whole.endsWith(":") || whole.endsWith("?"))) return { text: whole, inline: "" };
  const start = BOLD_START.exec(line);
  const inner = start?.[1];
  if (inner !== undefined && questionOf(inner) !== null) {
    return { text: inner.trim(), inline: (start?.[2] ?? "").replace(/^\s*:?\s*/, "") };
  }
  return null;
}

/** 굵은 글씨형 제목들 (`keepHeading` 기준). 수준은 모두 같다(1). */
function boldHeadings(lines: readonly string[], fenced: readonly boolean[]): Heading[] {
  const headings: Heading[] = [];
  lines.forEach((line, index) => {
    const found = boldHeading(line);
    if (found === null) return;
    const heading: Heading = { index, level: 1, ...found };
    if (keepHeading(heading, fenced)) headings.push(heading);
  });
  return headings;
}

/** 규칙 5와 SPEC 4.3: HTML 주석 삭제, 앞뒤 공백 삭제, 빈 값이나 `_No response_`는 null, 2,000자에서 자른다. */
export function cleanAnswer(raw: string): string | null {
  const text = raw.replace(HTML_COMMENT, "").trim();
  if (text === "" || text === "_No response_") return null;
  const chars = Array.from(text); // 코드 포인트 단위라 이모지 같은 서로게이트 쌍을 자르지 않는다
  return chars.length > MAX_ANSWER_CHARS ? chars.slice(0, MAX_ANSWER_CHARS).join("") : text;
}

/**
 * 질문 제목마다 답을 모은다. 답은 제목 줄 안의 이어진 글과, 다음 줄부터 **같은 수준**(`#` 개수가 같은)의
 * 다음 제목 전까지다. 답 안의 다른 수준 소제목(`## Workaround 1`, `#### Details`)에서는 끊지 않는다.
 * 둘 다 없으면 null. 같은 질문이 또 나오면 처음 것만 쓴다.
 */
function answersFrom(lines: readonly string[], headings: readonly Heading[], format: Format): Answers | null {
  const found = new Map<Field, string | null>();
  headings.forEach((heading, position) => {
    const field = questionOf(heading.text);
    if (field === null || found.has(field)) return;
    const next = headings.slice(position + 1).find((later) => later.level === heading.level);
    const body = [heading.inline, ...lines.slice(heading.index + 1, next?.index ?? lines.length)].join("\n");
    found.set(field, cleanAnswer(body));
  });
  if (found.size === 0) return null;
  return { workaround: found.get("workaround") ?? null, core: found.get("core") ?? null, format };
}

export function extractAnswers(body: string): Answers {
  // 규칙 0: 줄 끝을 \n으로 맞춘다. 실제 본문은 대부분 \r\n이다.
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const fenced = fencedLines(lines);

  // 규칙 1: 제목형 (form / markdown)
  const headings = markdownHeadings(lines, fenced);
  const fromHeadings = answersFrom(lines, headings, "form");
  if (fromHeadings !== null) return fromHeadings;

  // 규칙 2: 2026-01-25 이후 새 양식. 두 질문이 없다.
  if (headings.some((heading) => NORMALIZED_FORM2026.includes(normalizeForCompare(heading.text)))) {
    return { workaround: null, core: null, format: "form2026" };
  }

  // 규칙 3: 굵은 글씨형 (legacy)
  const fromBold = answersFrom(lines, boldHeadings(lines, fenced), "legacy");
  if (fromBold !== null) return fromBold;

  // 규칙 6: 어디에도 해당하지 않음
  return { workaround: null, core: null, format: "unknown" };
}
