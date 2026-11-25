// 공용 타입 (SPEC 4.3, 5, 6, 8장).
// Feasibility, Evidence는 여기서 정의하고 classify.ts가 다시 내보낸다(DECISIONS 2026-11-25).

/** 본문 형식 (SPEC 5장). `markdown`은 `extractAnswers`가 아니라 sync.ts가 `createdAt`으로 정한다. */
export type Format = "form" | "markdown" | "legacy" | "form2026" | "unknown";

/** 양식 두 질문의 답 (SPEC 5장). 각 답은 2,000자에서 자른다. */
export type Answers = { workaround: string | null; core: string | null; format: Format };

/** `data/raw/<number>.json` 한 파일 (SPEC 4.3). 본문 전문은 담지 않는다. */
export type RawProposal = {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  stateReason: "COMPLETED" | "NOT_PLANNED" | "REOPENED" | "DUPLICATE" | null;
  createdAt: string; // ISO (UTC)
  updatedAt: string;
  closedAt: string | null;
  comments: number;
  labels: string[]; // 이름순 정렬
  up: number; // THUMBS_UP
  down: number; // THUMBS_DOWN
  assignees: number; // 담당자 수
  milestone: string | null;
  answers: Answers;
};

/** 애드온 가능성 (SPEC 6장) */
export type Feasibility = "likely" | "unclear" | "hard" | "noanswer";

/** 분류 근거 한 개 (SPEC 6.5). 성립한 규칙 행마다 하나. */
export type Evidence = {
  field: "workaround" | "core";
  rule: string; // 규칙 행 이름 (W1 … C4)
  phrase: string; // 맞은 문구. 시작 판정이면 맞은 시작 말(yes, no, not really)
  at: "start" | "phrase";
  signal: "likely" | "hard";
  weight: number;
};

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
  f: Feasibility;
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
