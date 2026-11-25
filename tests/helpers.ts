// 테스트 픽스처 도우미 (TASKS T2).
// 기대값은 tests/fixtures/expected.json 한 곳에서 관리한다. 키가 있는 항목만 검사한다
// (real-* 항목에는 feasibility, likely, hard가 없다). 픽스처 파일 자체는 LF로 두고 바꾸지 않는다.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Answers, Feasibility, Format } from "../pipeline/types";

export const FIXTURES_DIR = fileURLToPath(new URL("./fixtures/", import.meta.url));
export const BODIES_DIR = join(FIXTURES_DIR, "bodies");
export const EXPECTED_PATH = join(FIXTURES_DIR, "expected.json");

/** expected.json의 항목 하나. format, workaround, core는 항상 있고 분류 값은 있을 때만 검사한다. */
export type FixtureExpectation = {
  format: Format;
  workaround: string | null;
  core: string | null;
  feasibility?: Feasibility;
  likely?: number;
  hard?: number;
};

export type Fixture = {
  /** 본문 파일 이름 (예: "form-likely.md") */
  name: string;
  /** 파일 그대로의 본문 (LF) */
  body: string;
  expected: FixtureExpectation;
};

/** expected.json을 읽는다. `_`로 시작하는 키(`_note` 등)는 설명이라 뺀다. */
export function loadExpected(): Record<string, FixtureExpectation> {
  const parsed = JSON.parse(readFileSync(EXPECTED_PATH, "utf8")) as Record<string, unknown>;
  const result: Record<string, FixtureExpectation> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith("_")) continue;
    result[key] = value as FixtureExpectation;
  }
  return result;
}

/** 본문 파일 이름 목록(정렬). */
export function listBodyFiles(): string[] {
  return readdirSync(BODIES_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

/**
 * 모든 픽스처를 이름순으로 읽는다.
 * 본문 파일과 기대값이 1:1로 맞지 않으면 바로 실패시켜, 한쪽만 추가하는 실수를 막는다.
 */
export function loadFixtures(): Fixture[] {
  const expected = loadExpected();
  const files = listBodyFiles();
  const missingExpected = files.filter((name) => !(name in expected));
  const missingBody = Object.keys(expected).filter((name) => !files.includes(name));
  if (missingExpected.length > 0 || missingBody.length > 0) {
    throw new Error(
      `fixtures out of sync: no expected entry for [${missingExpected.join(", ")}], no body file for [${missingBody.join(", ")}]`,
    );
  }
  return files.map((name) => {
    const entry = expected[name];
    if (entry === undefined) throw new Error(`no expected entry for ${name}`);
    return { name, body: readFileSync(join(BODIES_DIR, name), "utf8"), expected: entry };
  });
}

/** 줄 끝을 모두 `\r\n`으로 바꾼다. 이미 `\r\n`이거나 `\r`만 있는 줄도 `\r\r\n`이 되지 않게 먼저 `\n`으로 맞춘다. */
export function toCrlf(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n");
}

/** 기대값에서 분류기 입력(Answers)을 만든다. T6 분류기 테스트용. */
export function answersOf(expected: FixtureExpectation): Answers {
  return { workaround: expected.workaround, core: expected.core, format: expected.format };
}
