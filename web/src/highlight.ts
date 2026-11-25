// 상세 답 안에서 근거 문구를 강조한다 (SPEC 6.5). 순수 함수만 둔다.
// 근거 문구는 전처리한 글(소문자, ’→')에서 찾은 것이라, 원문에서는 대소문자를 무시하고 ’와 '를 같게 보고 찾는다.
// 못 찾으면(마크다운 기호가 끼어 있거나 잘린 뒤에 있는 경우 등) 강조만 생략한다. 위치는 저장하지 않는다.

export type Segment = { text: string; mark: boolean };

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 문구 하나를 원문에서 찾을 정규식 조각으로. `'`는 `’`와도 맞는다. */
function phrasePattern(phrase: string): string {
  return escapeRegExp(phrase).replace(/['’]/g, "['’]");
}

/** 원문을 강조할 조각들로 나눈다. 여러 문구가 겹치면 먼저 나온 것, 같은 자리면 긴 것을 강조한다. */
export function highlightSegments(text: string, phrases: readonly string[]): Segment[] {
  const unique = [...new Set(phrases.map((phrase) => phrase.trim()).filter((phrase) => phrase !== ""))];
  if (text === "" || unique.length === 0) return text === "" ? [] : [{ text, mark: false }];
  unique.sort((a, b) => b.length - a.length);
  const pattern = new RegExp(unique.map(phrasePattern).join("|"), "gi");

  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (match[0] === "") continue;
    if (start > last) segments.push({ text: text.slice(last, start), mark: false });
    segments.push({ text: match[0], mark: true });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), mark: false });
  return segments;
}
