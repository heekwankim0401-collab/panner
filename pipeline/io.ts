// JSON 출력과 파일 쓰기 공용 도우미 (CLAUDE.md 규칙: 키 정렬, 같은 입력이면 같은 바이트).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** 객체 키를 재귀적으로 정렬한 복사본. 배열 순서는 그대로 둔다. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeys(source[key]);
    }
    return sorted;
  }
  return value;
}

/** `data/`용: 키 정렬, 2칸 들여쓰기, 끝 줄바꿈 1개. */
export function toDataJson(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2) + "\n";
}

/** `web/public/data/`용: 키 정렬, 들여쓰기 없음. */
export function toWebJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

/** 내용이 바뀌었을 때만 쓴다(줄 끝은 그대로 LF). 썼으면 true. */
export function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return true;
}

/** 이 모듈이 `tsx pipeline/<name>.ts`로 직접 실행됐는가. 테스트에서 import할 때는 false. */
export function isMainModule(importMetaUrl: string): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  const self = fileURLToPath(importMetaUrl);
  const target = resolve(entry);
  return process.platform === "win32" ? self.toLowerCase() === target.toLowerCase() : self === target;
}
