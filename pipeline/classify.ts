// 애드온 가능성 분류 (SPEC 6장). 순수 함수만 둔다.
// 모든 문구와 가중치는 아래 "규칙 표" 한 곳에 모은다. 규칙 보정(T10)은 이 표만 고친다.
import type { Answers, Evidence, Feasibility } from "./types";

export type { Evidence, Feasibility } from "./types";

// ───────────────────────────── 규칙 표 (SPEC 6.2, 6.3, 6.4) ─────────────────────────────

/** 애드온 단어 */
export const ADDON_WORDS = ["plugin", "add-on", "addon", "gdextension", "asset library"] as const;

/** 부정 단어. 단어 단위로 찾는다(앞뒤가 영문자나 `'`가 아님). */
export const NEGATION_WORDS = [
  "not",
  "cannot",
  "can't",
  "don't",
  "won't",
  "couldn't",
  "wouldn't",
  "isn't",
  "doesn't",
  "impossible",
  "unable",
  "no way",
] as const;

/** 칸(W, C)마다 likely 합과 hard 합의 최댓값 */
export const CELL_CAP = 2;

/** 판정 기준 (6.4) */
export const LIKELY_MIN = 2;
export const HARD_MIN = 2;

export type Field = "workaround" | "core";

export type Rule = {
  id: string;
  field: Field;
  signal: "likely" | "hard";
  weight: number;
  /** 시작 판정: 전처리한 답 전체가 이 말로 시작하는가(단어 단위) */
  starts?: readonly string[];
  /** 문구: 부분 문자열로 찾는다 */
  phrases?: readonly string[];
  /** true면 문구를 부정 단어가 없는 절에서만 센다(likely 행). false면 절과 상관없이 센다(hard 행). */
  negationFree?: boolean;
};

export const RULES: readonly Rule[] = [
  { id: "W1", field: "workaround", signal: "likely", weight: 2, phrases: ADDON_WORDS, negationFree: true },
  {
    id: "W2",
    field: "workaround",
    signal: "likely",
    weight: 1,
    starts: ["yes"],
    phrases: ["can be worked around", "can be done with"],
    negationFree: true,
  },
  { id: "W3", field: "workaround", signal: "hard", weight: 1, starts: ["no", "not really"] },
  {
    id: "W4",
    field: "workaround",
    signal: "hard",
    weight: 2,
    phrases: [
      "not expose",
      "requires engine",
      "engine changes",
      "engine source",
      "engine code",
      "core change",
      "recompil",
      "c++",
      "source code",
    ],
  },
  { id: "W5", field: "workaround", signal: "hard", weight: 1, phrases: ["cannot", "can't", "not possible", "impossible"] },
  { id: "C1", field: "core", signal: "likely", weight: 1, starts: ["no", "not really"] },
  { id: "C2", field: "core", signal: "likely", weight: 2, phrases: ADDON_WORDS, negationFree: true },
  {
    id: "C3",
    field: "core",
    signal: "likely",
    weight: 1,
    phrases: ["out of the box", "usability", "convenience", "discoverab"],
    negationFree: true,
  },
  {
    id: "C4",
    field: "core",
    signal: "hard",
    weight: 2,
    phrases: [
      "cannot",
      "can't",
      "not possible",
      "impossible",
      "no way",
      "not expose",
      "requires engine",
      "engine changes",
      "internal",
      "performance",
      "source code",
    ],
  },
];

/** 이 행 중 하나가 성립해야 `likely`가 될 수 있다(6.4의 addonWord). */
export const ADDON_WORD_RULES: readonly string[] = ["W1", "C2"];

// ───────────────────────────── 전처리 (6.1) ─────────────────────────────

/**
 * 답 하나를 전처리한다. 펜스 코드 블록 삭제, 인라인 코드는 백틱만 삭제, 소문자화, `’`→`'`,
 * 마크다운 기호(`*`, `_`, `#`, `>`) 삭제, 공백 정리. 절을 나눌 때 줄바꿈이 필요하므로 줄바꿈은 남긴다.
 */
export function preprocess(answer: string): string {
  return answer
    .replace(/\r\n?/g, "\n")
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[*_#>]/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v ]+/g, " ").trim())
    .join("\n")
    .trim();
}

/** 절로 자른다: `.`, `!`, `?`, `;`, `,`, `:`, 줄바꿈, 그리고 단어 ` but `, ` however `. */
export function splitClauses(text: string): string[] {
  return text
    .split(/[.!?;,:\n]| but | however /)
    .map((clause) => clause.trim())
    .filter((clause) => clause !== "");
}

const isWordChar = (char: string | undefined): boolean => char !== undefined && /[a-z']/.test(char);

/** 단어 단위로 들어 있는가(앞뒤 글자가 영문자나 `'`가 아님). */
export function containsWord(text: string, word: string): boolean {
  for (let index = text.indexOf(word); index !== -1; index = text.indexOf(word, index + 1)) {
    if (!isWordChar(text[index - 1]) && !isWordChar(text[index + word.length])) return true;
  }
  return false;
}

/** 단어 단위로 이 말로 시작하는가. `node`, `nobody`는 `no`로 시작하지 않는다. */
export function startsWithWord(text: string, word: string): boolean {
  return text.startsWith(word) && !isWordChar(text[word.length]);
}

export function hasNegation(clause: string): boolean {
  return NEGATION_WORDS.some((word) => containsWord(clause, word));
}

// ───────────────────────────── 분류 (6.3 ~ 6.5) ─────────────────────────────

export type Classification = { feasibility: Feasibility; likely: number; hard: number; evidence: Evidence[] };

type PreparedAnswer = { text: string; flat: string; cleanClauses: string[] };

function prepare(answer: string): PreparedAnswer {
  const text = preprocess(answer);
  return {
    text,
    flat: text.replace(/\s+/g, " "), // hard 문구는 절과 상관없이 찾으므로 줄바꿈도 공백으로 본다
    cleanClauses: splitClauses(text).filter((clause) => !hasNegation(clause)),
  };
}

/** 한 행이 성립하면 근거 하나, 아니면 null. 시작 판정을 먼저 보고, 문구는 표 순서상 첫 문구를 남긴다. */
function matchRule(rule: Rule, answer: PreparedAnswer): Evidence | null {
  const base = { field: rule.field, rule: rule.id, signal: rule.signal, weight: rule.weight };
  const start = rule.starts?.find((word) => startsWithWord(answer.text, word));
  if (start !== undefined) return { ...base, phrase: start, at: "start" };
  const phrase = rule.phrases?.find((candidate) =>
    rule.negationFree
      ? answer.cleanClauses.some((clause) => clause.includes(candidate))
      : answer.flat.includes(candidate),
  );
  return phrase === undefined ? null : { ...base, phrase, at: "phrase" };
}

export function classify(answers: Answers): Classification {
  if (answers.format === "form2026") return { feasibility: "noanswer", likely: 0, hard: 0, evidence: [] };
  if (answers.workaround === null && answers.core === null) {
    return { feasibility: "unclear", likely: 0, hard: 0, evidence: [] };
  }

  const prepared: Record<Field, PreparedAnswer | null> = {
    workaround: answers.workaround === null ? null : prepare(answers.workaround),
    core: answers.core === null ? null : prepare(answers.core),
  };
  const sums: Record<Field, { likely: number; hard: number }> = {
    workaround: { likely: 0, hard: 0 },
    core: { likely: 0, hard: 0 },
  };
  const evidence: Evidence[] = [];

  for (const rule of RULES) {
    const answer = prepared[rule.field];
    if (answer === null) continue;
    const found = matchRule(rule, answer); // 행마다 한 번만 더한다
    if (found === null) continue;
    evidence.push(found);
    sums[rule.field][rule.signal] += rule.weight;
  }

  const capped = (field: Field, signal: "likely" | "hard") => Math.min(sums[field][signal], CELL_CAP);
  const likely = capped("workaround", "likely") + capped("core", "likely");
  const hard = capped("workaround", "hard") + capped("core", "hard");
  const addonWord = evidence.some((item) => ADDON_WORD_RULES.includes(item.rule));

  let feasibility: Feasibility = "unclear";
  if (likely >= LIKELY_MIN && likely > hard && addonWord) feasibility = "likely";
  else if (hard >= HARD_MIN && hard > likely) feasibility = "hard";

  return { feasibility, likely, hard, evidence };
}
