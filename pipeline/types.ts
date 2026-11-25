// 공용 타입 (SPEC 4.3, 5, 6, 8장).
// T1에서는 build-data에 필요한 것만 둔다. Format, Answers, RawProposal, Feasibility, Evidence는 T2에서 더한다.

/** `data/state.json` (SPEC 4.3) */
export type SyncState = { schemaVersion: 2; lastSyncedAt: string; total: number };

/** `index.json`의 목록 한 행 (SPEC 8장). 이름은 크기를 줄이려고 짧게 둔다. */
export type IndexItem = {
  n: number; // 번호
  t: string; // 제목
  u: number; // 추천(👍)
  d: number; // 비추천
  c: number; // 댓글 수
  l: number[]; // labels 사전의 인덱스
  st: "open" | "archived";
  f: "likely" | "unclear" | "hard" | "noanswer";
  s: number; // 점수
  a: boolean; // 담당자 있음
  m: string | null; // 마일스톤
  up: string; // updatedAt 날짜 YYYY-MM-DD (RawProposal.up = 👍 수와 이름만 같다)
};

/** `web/public/data/index.json` (SPEC 8장) */
export type IndexFile = {
  meta: { builtAt: string; lastSyncedAt: string | null; total: number; included: number };
  labels: string[]; // 라벨 이름 사전 (archived 제외, 이름순)
  items: IndexItem[];
};
