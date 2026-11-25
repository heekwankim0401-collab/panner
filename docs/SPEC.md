# Panner 구현 사양 (v2)

사람이 읽는 기획서: https://claude.ai/artifact/27TbRWPzEKXSps9vGG46Rr
이 문서는 구현에 필요한 결정을 모두 담는다. 결정의 이유는 `docs/DECISIONS.md`에 있다. 여기 없는 것을 정해야 하면 가장 단순한 쪽을 고르고 `docs/DECISIONS.md`에 한 줄로 남긴다.

## 1. 한 줄 정의

godotengine/godot-proposals의 이슈를 전부 모아, 엔진이 만들지 않기로 한 제안(archived 라벨)과 열린 제안 중 작성자가 "애드온으로 가능하다"고 답한 것을 추천 수와 묶은 점수로 정렬해 보여주는 정적 웹 페이지.

## 2. 기술 스택 (결정됨)

| 영역 | 선택 |
| --- | --- |
| 언어 | TypeScript (strict) 한 가지 |
| 런타임 | Node 22 이상 LTS |
| 스크립트 실행 | `tsx` |
| GitHub API | `@octokit/graphql` |
| 테스트 | Vitest |
| 화면 | Vite + Preact + TypeScript, UI 라이브러리 없음. **Vite `base: './'`** (GitHub Pages 하위 경로에서 동작) |
| 배포 | GitHub Pages (Actions로 배포) |
| 패키지 매니저 | npm |

버전은 설치 시점의 최신 안정 버전을 쓴다. GitHub Actions의 `actions/*` 버전도 작성 시점의 최신 메이저로 확인한다.

## 3. 저장소 구조

```
panner/
  CLAUDE.md
  .gitattributes    # * text=auto eol=lf (Windows autocrlf에서도 줄 끝을 LF로 고정)
  docs/SPEC.md  docs/TASKS.md  docs/DECISIONS.md  docs/KICKOFF.md
  pipeline/
    types.ts        # 공용 타입 (4.3, 5, 6, 8장). Feasibility, Evidence도 여기 두고 classify.ts가 다시 내보낸다
    io.ts           # 키 정렬 JSON(toDataJson/toWebJson), 바뀐 경우에만 쓰기(writeIfChanged), isMainModule. 파일 출력은 모두 이것을 쓴다
    github.ts       # GraphQL 클라이언트와 쿼리 (네트워크는 여기만)
    sync.ts         # 수집 → 파싱 → data/raw, data/bodies
    parse.ts        # 양식 답변 추출 (5장)
    classify.ts     # 애드온 가능성 분류 (6장)
    score.ts        # 상태 판정과 기회 점수 (7장)
    build-data.ts   # data/raw → web/public/data (8장)
    label.ts        # 정밀도 라벨링 CLI (10장, 사람이 터미널에서 실행)
    eval.ts         # 정밀도 계산 (10장)
  web/              # Vite 루트
    index.html
    src/            # main.tsx, App.tsx, filter.ts, url.ts, styles.css, components/
    public/data/    # 생성물, gitignore
  tests/
    fixtures/bodies/*.md     # 제안 본문 샘플
    fixtures/expected.json   # 샘플별 기대값
    *.test.ts
  data/
    raw/<number>.json   # 제안 1개 = 파일 1개, 커밋함 (본문 전문 없음)
    bodies/<number>.md  # 본문 원문 로컬 캐시, gitignore
    state.json          # 마지막 전체 수집 정보, 커밋함
    golden.json         # 사람이 붙인 정밀도 라벨, 커밋함
  .github/workflows/ci.yml  .github/workflows/sync.yml
  vite.config.ts    # root web/, base './', outDir ../dist
  vitest.config.ts  # 테스트는 tests/**/*.test.ts (vite.config.ts의 root가 web/이라 따로 둔다)
```

## 4. 데이터 수집

### 4.1 쿼리

저장소 `godotengine/godot-proposals`의 `issues`만 읽는다(풀 리퀘스트, Discussions, 프로젝트 보드 제외). 쓰기 작업은 어떤 경우에도 하지 않는다.

```graphql
query Proposals($owner: String!, $name: String!, $after: String, $pageSize: Int!) {
  repository(owner: $owner, name: $name) {
    issues(first: $pageSize, after: $after, orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url body state stateReason createdAt updatedAt closedAt
        comments { totalCount }
        labels(first: 20) { nodes { name } }
        reactionGroups { content reactors { totalCount } }
        assignees(first: 1) { totalCount }
        milestone { title }
      }
    }
  }
  rateLimit { cost remaining resetAt }
}
```

- `pageSize` 기본 50, 환경변수 `PANNER_PAGE_SIZE`로 조정.
- 매 페이지마다 `rateLimit.cost`, `remaining`을 한 줄로 로그. `remaining`이 100 아래면 `resetAt`까지 기다린다.
- 토큰: 환경변수 `GITHUB_TOKEN`. 없으면 명확한 오류로 종료. 공개 저장소 읽기 권한이면 충분하다.
- 실패 시 지수 백오프로 3번 재시도.
- `stateReason`이 중복을 `DUPLICATE`로 돌려주는지 T4에서 확인한다(중복으로 닫힌 #15714로 확인). 안 오면 `stateReason(enableDuplicate: true)`로 바꾼다.
- Actions 기본 토큰의 GraphQL 한도는 저장소당 시간당 1,000점이다. 전체 수집 비용은 T4에서 실측해 `docs/DECISIONS.md`에 적는다.

### 4.2 수집 방식 (매주 전체)

추천이 늘어도 이슈의 `updatedAt`은 바뀌지 않는다. 그래서 매주 전체를 다시 받고, 파일은 내용이 바뀐 것만 다시 쓴다.

- `npm run sync`: 전체 수집. 끝에 새 파일 수, 바뀐 파일 수, 총 비용을 출력하고 `data/state.json`을 쓴다.
- `npm run sync -- --limit 20`: 앞에서 20개만(개발용). **`--limit`일 때는 `state.json`을 쓰지 않고, 사라진 번호 검사도 하지 않는다.** 생성일 오름차순이라 가장 오래된 제안(대부분 `legacy`·`unknown`)부터 받는다.
- 저장소에서 사라진 번호는 `data/raw`에서 지우지 않고 로그만 남긴다(전체 수집일 때만 검사).
- #15714 같은 단건 확인(T4)은 커밋하지 않는 일회성 tsx 스크립트로 한다. 4.1 쿼리는 바꾸지 않는다.
- 수집하면서 바로 `parse.ts`로 답변을 뽑아 `data/raw`에 저장하고, 본문 원문은 `data/bodies/<number>.md`(gitignore)에만 쓴다. 파서를 고친 뒤에는 `npm run sync -- --reparse`로 네트워크 없이 `data/bodies`에서 다시 뽑는다.

### 4.3 저장 형식

`data/raw/<number>.json` (키 정렬, 들여쓰기 2칸, 끝 줄바꿈 1개. 같은 입력이면 바이트까지 같아야 한다):

```ts
// pipeline/types.ts
export type Format = "form" | "markdown" | "legacy" | "form2026" | "unknown";
export type Answers = { workaround: string | null; core: string | null; format: Format };
export type RawProposal = {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  stateReason: "COMPLETED" | "NOT_PLANNED" | "REOPENED" | "DUPLICATE" | null;
  createdAt: string; // ISO
  updatedAt: string;
  closedAt: string | null;
  comments: number;
  labels: string[];   // 이름순 정렬
  up: number;         // THUMBS_UP
  down: number;       // THUMBS_DOWN
  assignees: number;  // 담당자 수
  milestone: string | null;
  answers: Answers;   // 5장. 각 답은 2,000자에서 자른다
};
```

`data/state.json`: `{ "schemaVersion": 2, "lastSyncedAt": ISO, "total": number }`

## 5. 양식 답변 추출 (`parse.ts`)

```ts
export function extractAnswers(body: string): Answers;
```

두 질문 원문(2019-09-04부터 2026-01-24까지 한 글자도 바뀌지 않음):

| 키 | 질문 |
| --- | --- |
| `workaround` (W) | If this enhancement will not be used often, can it be worked around with a few lines of script? |
| `core` (C) | Is there a reason why this should be core and not an add-on in the asset library? |

시기별 본문 형식 (기획서 "배경과 문제"의 표와 같다):

| 기간 | 형식 | `format` |
| --- | --- | --- |
| 2026-01-25 ~ | 이슈 폼, `### Problem or limitation` / `### Proposed improvement` / `### Proposal review` | `form2026` |
| 2021-06-06 ~ 2026-01-24 | 이슈 폼, `### 질문` + 답 | `form` |
| 2020-11-13 ~ 2021-06-05 | 마크다운 템플릿, `### 질문` + 답 | `markdown` |
| 2019-09-04 ~ 2020-11-12 | 한 줄 전체가 굵은 글씨인 질문 줄 + 다음 줄부터 답 | `legacy` |
| 2019-09 이전 | 자유 형식 | `unknown` |

규칙 (순서대로):

0. `\r\n`과 `\r`을 `\n`으로 바꾼다. 실제 본문은 줄 끝이 대부분 `\r\n`이다.
    - **코드 블록**(규칙 1~3에 공통): 펜스 코드 블록(```` ``` ```` 또는 `~~~` 세 개 이상, 들여쓰기 3칸까지) 안의 줄은 제목으로 보지 않는다(GDScript 주석 `# ...` 등). CommonMark처럼 백틱 펜스는 같은 줄에 백틱이 또 있으면 시작이 아니고(```` ```code``` ````는 인라인 코드), 닫는 줄은 여는 것과 같은 문자로 같거나 더 길고 뒤에 공백만 있어야 한다. **단 질문 제목은 코드 블록 안이라도 제목이다** — 펜스를 잘못 닫아 본문 끝까지 코드 블록이 이어진 본문에서도 답을 잃지 않게 한다.
1. **제목형**: `^#{1,6} (.+)$` 제목(`#`부터 `######`까지) 중 두 질문에 해당하는 것이 있으면, 그 제목 다음 줄부터 **같은 수준**(`#` 개수가 같은)의 다음 제목 또는 본문 끝까지가 답이다. 답 안의 다른 수준 소제목(`## Workaround 1`, `#### Details`)에서는 끊지 않는다. `form`과 `markdown`은 본문만으로 구분할 수 없으므로 `createdAt`으로 나눈다: `extractAnswers`는 `"form"`을 돌려주고, `sync.ts`가 `createdAt < 2021-06-06`(UTC)이면 `"markdown"`으로 바꾼다. 그래서 픽스처 기대값의 `format`은 `extractAnswers`가 돌려주는 값으로 적는다(`markdown` 시기 실제 본문도 `"form"`). `markdown`으로 바꾸는 부분은 `sync.ts` 변환 테스트에서 확인한다.
2. **새 양식**: 두 질문이 없고 `Problem or limitation` 또는 `Proposed improvement` 제목(수준 무관)이 있으면 `form2026`, 두 답 모두 `null`.
3. **굵은 글씨형**: 1, 2에 해당하지 않으면 굵은 글씨 구획 제목을 찾는다. 질문 제목 다음부터 다음 구획 제목 또는 본문 끝까지가 답이다. → `legacy`
    - `^\*\*(.+?)\*\*:?\s*$`처럼 한 줄 전체가 굵은 글씨이고 **안의 글이 `:` 또는 `?`로 끝나면** 구획 제목이다(`**No.**`, `**Yes!**` 같은 굵은 답 줄은 제목이 아니다).
    - 굵은 글씨로 시작하는 줄(`^\*\*(.+?)\*\*(.*)$`)의 **굵은 글씨 안에 질문이 들어 있으면**, 뒤에 글이 이어지거나 콜론이 굵은 글씨 밖에 있거나 없어도 질문 제목이다. 뒤의 글(앞의 `:`와 공백 제외)이 답의 첫 줄이다(`**질문?:** No.`). 답 속의 `**Note:** ...` 같은 줄은 질문이 없으므로 제목이 아니다.
4. 질문 비교: 소문자화, 영문자·숫자·공백 외 문자 삭제, 공백 정리 후 질문 원문이 제목 안에 들어 있으면 같은 질문이다.
5. 답 정리: HTML 주석(`<!-- -->`) 삭제, 앞뒤 공백 삭제. 빈 문자열이나 `_No response_`면 `null`.
6. 어디에도 해당하지 않으면 `unknown`, 두 답 모두 `null`.

## 6. 애드온 가능성 분류 (`classify.ts`)

```ts
export type Feasibility = "likely" | "unclear" | "hard" | "noanswer";
export type Evidence = { field: "workaround" | "core"; rule: string; phrase: string; at: "start" | "phrase"; signal: "likely" | "hard"; weight: number };
export function classify(a: Answers): { feasibility: Feasibility; likely: number; hard: number; evidence: Evidence[] };
```

`format`이 `form2026`이면 바로 `noanswer`. 두 답이 모두 `null`이면 `unclear`.

### 6.1 전처리 (답 하나씩)

1. 펜스 코드 블록(```` ``` ```` 사이)을 지운다. 인라인 코드는 백틱만 지우고 글은 남긴다.
2. 소문자화, `’`를 `'`로, 마크다운 기호(`*`, `_`, `#`, `>`)를 지우고 공백을 정리한다.
3. **절**로 자른다: `.`, `!`, `?`, `;`, `,`, `:`, 줄바꿈, 그리고 단어 ` but `, ` however `.

### 6.2 찾는 방식

- **부정 단어**(단어 단위로 찾음): `no`(T10에서 더함), `not`, `cannot`, `can't`, `don't`, `won't`, `couldn't`, `wouldn't`, `isn't`, `doesn't`, `impossible`, `unable`, `no way`. 단어 단위란 앞뒤가 영문자나 `'`가 아닌 경우다(`another`의 `not`은 부정이 아님).
- **시작 판정**(단어 단위): 전처리한 답 전체가 `yes` / `no` / `not really`로 시작하는가. `node`, `nobody`는 해당 안 됨.
- **문구**: 나머지 문구는 부분 문자열로 찾는다.
- **부정 없는 절**: likely 문구는 부정 단어가 없는 절에서 찾았을 때만 센다. hard 문구는 절과 상관없이 센다.

### 6.3 규칙 표

각 행은 칸(W, C)마다 **한 번만** 더한다(문구가 여러 개 맞아도 그 행의 가중치는 한 번). 칸마다 likely 합과 hard 합은 각각 최대 2.

**애드온 가능 표현**(T10에서 바꿈, 전체 목록은 `classify.ts`의 `ADDON_POSSIBLE_PHRASES`): 애드온 단어(`plugin`, `add-on`, `addon`, `editor plugin`, `editorplugin`, `gdextension`, `gdnative`, `extension`) 앞뒤에 가능이나 수단을 뜻하는 말이 붙은 것.
- 예: `as a plugin`, `be an add-on`, `with a plugin`, `using a gdnative`, `via a plugin`, `through an editorplugin`, `in an addon`, `small plugin`, `plugin works`, `plugin could`, `plugin already`, `existing addon`, `official add-on`, `external plugin`.
- 그냥 `editor plugin`은 넣지 않는다. "editor plugin API"처럼 주제로도 많이 나온다.
- 애드온 단어만 주제로 나오는 답(`the plugin system`, `writing an add-on`, `addon ecosystem`)은 세지 않는다.

**애드온으로는 모자란 표현**(`ADDON_FALLS_SHORT_PHRASES`): `won't work`, `wouldn't work`, `will not work`, `would not work`, `doesn't work`, `does not work`, `prototyp`

**일부만·확신 없음 표현**(`PARTIAL_OR_UNSURE_PHRASES`, C 칸에만): `except`, `some of`, `partially`, `not sure`, `unsure`, `maybe`, `would make it possible`

| 행 | 칸 | 조건 | 신호 | 가중치 |
| --- | --- | --- | --- | --- |
| W1 | W | 부정 없는 절에 애드온 가능 표현 | likely | 2 |
| W2 | W | `yes`로 시작, 또는 부정 없는 절에 `can be worked around` / `can be done with` | likely | 1 |
| W3 | W | `no` 또는 `not really`로 시작 | hard | 1 |
| W4 | W | `not expose`, `requires engine`, `engine changes`, `engine source`, `engine code`, `core change`, `recompil`, `c++`, `source code`, 애드온으로는 모자란 표현 | hard | 2 |
| W5 | W | `cannot`, `can't`, `not possible`, `impossible` | hard | 1 |
| C1 | C | `no` 또는 `not really`로 시작 | likely | 1 |
| C2 | C | 부정 없는 절에 애드온 가능 표현 | likely | 2 |
| C3 | C | 부정 없는 절에 `out of the box`, `usability`, `convenience`, `discoverab` | likely | 1 |
| C4 | C | `cannot`, `can't`, `not possible`, `impossible`, `no way`, `not expose`, `requires engine`, `engine changes`, `internal`, `performance`, `source code`, 애드온으로는 모자란 표현, 일부만·확신 없음 표현 | hard | 2 |

W 칸은 "스크립트 몇 줄로 우회되나"를 묻는다. `no`는 "몇 줄로는 안 된다"일 뿐 애드온 불가가 아니므로 W3, W5는 가중치 1이다(혼자서는 hard가 되지 못한다).

### 6.4 판정

`addonWord` = W1 또는 C2가 성립했는가(애드온 가능 표현이 부정 없는 절에 있는가).

1. `likely >= 2` 그리고 `likely > hard` 그리고 `addonWord` → `likely`
2. `hard >= 2` 그리고 `hard > likely` → `hard`
3. 그 밖 → `unclear`

### 6.5 근거(evidence)

성립한 행마다 하나씩 남긴다. `phrase`는 맞은 문구(시작 판정이면 맞은 시작 말 그대로: `yes`, `no`, `not really`), `at`은 시작 판정이면 `"start"`, 그 밖은 `"phrase"`.

- 한 행에서 문구가 여러 개 맞으면 상수 표 순서상 첫 문구를 남긴다.
- 한 행이 시작 판정과 문구로 둘 다 성립하면(W2) 시작 판정을 남긴다.
- 위치(오프셋)는 저장하지 않는다.

화면은 `at: "phrase"`인 것만 답변 안에서 강조한다. `phrase`는 전처리한 글에서 찾은 것이므로, 화면은 잘린 답 원문에서 대소문자를 무시하고 `’`와 `'`를 같게 보고 찾는다. 못 찾으면(마크다운 기호가 끼어 있거나 600자 뒤에 있는 경우 등) 강조만 생략한다.

모든 문구와 가중치는 `classify.ts` 맨 위 상수 표 하나에 모은다. 규칙 보정(T10)은 이 표만 고친다.

## 7. 상태 판정과 기회 점수 (`score.ts`)

**상태** (위에서부터 먼저 맞는 것):

| 조건 | 상태 코드 | 표시 | wStatus |
| --- | --- | --- | --- |
| CLOSED + stateReason `DUPLICATE` | `dup` | (제외) | 0 |
| CLOSED + `archived` 라벨 있음 | `archived` | Closed: archived | 1.0 |
| CLOSED + 그 밖 | `done` | (제외, 구현된 것으로 봄) | 0 |
| OPEN | `open` | Open | 0.7 |

GitHub의 닫힌 이유(완료/계획 없음)는 고도 팀이 일관되게 쓰지 않으므로 중복 판별에만 쓴다. 그래서 archived 라벨 없이 `NOT_PLANNED`로 닫힌 제안은 `done`이다. 라벨 비교는 대소문자를 무시한다.

상태 판정은 `score.ts`의 순수 함수 하나로 둔다. T5 통계가 먼저 이 함수를 만들어 쓰고, T7이 그대로 쓴다.

**점수**

```
score = log2(1 + max(0, up - down)) × wAddon × wStatus
```

| wAddon | likely 1.0 · unclear 0.5 · noanswer 0.5 · hard 0.1 |
| --- | --- |

소수 둘째 자리까지 반올림한다(예: 3.456 → 3.46). 가중치는 `score.ts` 맨 위 상수로 둔다.

## 8. 화면용 데이터 (`build-data.ts`)

입력 `data/raw/*.json` → 출력 `web/public/data/`.

- `data/raw`가 없거나 비어 있어도 실패하지 않고 `items: []`인 `index.json`을 쓴다.
- 포함 대상: wStatus가 0보다 큰 제안(`open`, `archived`).
- 출력 JSON은 키를 정렬하되 **들여쓰기 없이** 쓴다(gitignore된 생성물이라 diff와 상관없고 크기만 줄인다). 같은 입력이면 같은 바이트.
- `meta.total`은 `data/raw`의 파일 수, `meta.lastSyncedAt`은 `data/state.json`의 값(없으면 `null`). `labels` 사전은 이름순.
- `index.json` (목록용, 답변 본문 없음):

```ts
type IndexFile = {
  meta: { builtAt: string; lastSyncedAt: string | null; total: number; included: number };
  labels: string[];           // 라벨 이름 사전 (archived 제외)
  items: Array<{
    n: number; t: string;     // 번호, 제목
    u: number; d: number; c: number;   // 추천, 비추천, 댓글
    l: number[];              // labels 사전의 인덱스
    st: "open" | "archived";
    f: "likely" | "unclear" | "hard" | "noanswer";
    s: number;                // 점수
    a: boolean;               // 담당자 있음
    m: string | null;         // 마일스톤
    up: string;               // updatedAt 날짜 YYYY-MM-DD (RawProposal.up = 👍 수와 이름만 같다)
  }>;
};
```

- `detail/<floor(n/100)>.json`(100번 단위 묶음, 상세를 펼칠 때 불러옴): `{ [n]: { w: string|null, c: string|null, ev: Evidence[], url: string, fmt: Format } }`. `w`, `c`는 600자에서 자르고 `…`를 붙인다.
- 빌드가 끝나면 `index.json` 크기(바이트)와 분류 분포(feasibility × 상태 개수)를 출력.

## 9. 화면 (`web/`)

UI 문구는 영어(대상이 전 세계 고도 사용자). 한 페이지.

- 데이터는 `` `${import.meta.env.BASE_URL}data/index.json` ``처럼 BASE_URL 기준 상대 경로로 불러온다. 상세 묶음은 행을 펼칠 때 불러와 캐시한다.
- **필터**: 검색어(제목, 대소문자 무시), feasibility(다중 선택), 상태(open/archived 다중 선택), 라벨(다중 선택), 최소 추천 수(`u`, 👍 수). 다중 선택은 모두 OR(고른 값 중 하나라도 맞으면 통과)이고, 서로 다른 필터끼리는 AND.
- **정렬**: score(기본), 추천 수(`u`), 최신 갱신, 댓글 수. 모두 내림차순, 동점은 번호 오름차순.
- **기본 화면**: feasibility=likely, 상태 전체, score 정렬.
- **페이지**: 한 페이지 50행. 필터나 정렬을 바꾸면 1페이지로 돌아간다.
- **URL 상태**: 모든 필터, 정렬, 페이지를 쿼리 문자열에 담는다(`history.replaceState`). 키 `q`, `f`, `st`, `lb`, `min`, `sort`, `p`. 기본값과 같은 값은 생략한다. `f=all`은 feasibility 필터 없음을 뜻한다. 다중 선택 값은 쉼표로 잇는다(`f=likely,unclear`). `lb`에는 라벨 **이름**을 쓴다(사전 인덱스는 매주 바뀌어 공유 링크가 깨진다).
- **행**: 점수, 제목(GitHub 링크), 추천 수, 상태 배지, feasibility 배지, 담당자 배지(있을 때), 라벨 최대 3개.
- **상세**: W, C 답변(잘린 것), `at: "phrase"` 근거 문구 강조(찾는 방법은 6.5), "Open on GitHub" 링크. `noanswer`면 "This proposal uses the template introduced on 2026-01-25, which has no add-on question." 안내.
- 상단: 마지막 수집 날짜, 전체/포함/현재 표시 개수, 한계 안내 한 줄(분류는 작성자 답변 기반이며 2026-01-25 이후 제안은 답변이 없음).
- 키보드로 행 이동·펼치기, 필터에 `<label>`, 라이트/다크(`prefers-color-scheme`).
- 필터·정렬·URL 변환은 `filter.ts`, `url.ts`의 순수 함수로 두고 테스트한다. 기본 화면의 필터·정렬 함수는 `pipeline/label.ts`, `eval.ts`도 가져다 쓴다(T8에서 먼저 만든다).

## 10. 정밀도 평가

목표 지표: 기본 화면(likely, score순) **상위 30개 중 라벨을 붙인 것의 70% 이상이 "작성자가 애드온으로 가능하다고 답한 제안"이다**. 즉 분류기가 작성자 답변을 맞게 읽었는지를 잰다. 실제로 만들 수 있는지는 T14에서 사람이 확인한다.

- 판단 기준(사람): 두 답과 제목만 읽고, "작성자가 애드온이나 플러그인으로 구현 가능하다고 말했는가."
    - `yes`: 작성자가 애드온·플러그인·GDExtension(GDNative)으로 된다고 말했다. "본체가 더 낫다", "불편하다"가 붙어도 `yes`.
    - `no`: 안 된다고 했거나, 일부·시제품만 된다고 했거나, 엔진 수정이 필요하다고 했다. 애드온을 부정하려고만 언급했거나 애드온 이야기가 아예 없어도 `no`.
    - `skip`: 답이 모순되거나 너무 모호할 때만. 분모에서 빠지므로 아껴 쓴다.
    - W의 "No"는 "스크립트 몇 줄로는 안 된다"일 뿐이라 혼자서는 `no`의 근거가 아니다. 실제로 가능한지는 판단하지 않는다(T14에서 본다). 분류 근거(`evidence`)는 보지 않고 판단한다.
- 라벨은 분류 규칙을 모르는 사람이나 에이전트가 붙인다. 규칙을 만든 쪽이 붙이면 채점이 분류기 쪽으로 기운다.
- `npm run label`: `build:data`와 같은 방식으로 기본 화면 상위 30개를 구하고, `data/golden.json`에 아직 없는 것만 하나씩 보여준다(제목, W, C, 근거). `y`/`n`/`s`(건너뛰기)를 받아 바로 저장한다. 형식 `{ "<number>": "yes" | "no" | "skip" }`. 사람이 터미널에서 직접 실행한다.
- `npm run eval`: 현재 상위 30개 중 라벨이 있는 것의 정밀도 = yes / (yes + no)를 출력하고, 라벨 없는 항목 수, `skip` 개수, `no` 목록(번호, 제목, 근거)을 보여준다. `skip`은 분모에서 빠진다. 라벨 없는 항목이 있거나 yes + no가 0이면 "label 먼저"라고 안내하고 종료 코드 2. 정밀도 70% 미만이면 종료 코드 1.
- 규칙을 고치면 상위 30개가 바뀌므로, 새로 올라온 항목만 다시 라벨링한다.

## 11. 워크플로

- `ci.yml`: push, pull_request에서 `npm ci` → `npm run check` → `npm run build`(화면 빌드 오류를 push 때 잡는다. 배포는 하지 않는다).
- 배포는 `sync.yml`에서만 한다. 화면만 고친 경우 바로 반영하려면 `sync` 워크플로를 수동 실행한다.
- `sync.yml`: 매주 월요일 03:17 KST(`cron: "17 18 * * 0"`, 정각은 실행이 밀리기 쉬움) + 수동 실행.
  - job `sync`: `npm ci` → `npm run sync`(`GITHUB_TOKEN`은 `secrets.PANNER_TOKEN`이 있으면 그것, 없으면 기본 토큰) → `npm run check` → `npm run build` → `data/`에 변경이 있으면 `data: weekly sync` 커밋 후 push → `dist/`를 Pages 아티팩트로 업로드.
  - job `deploy`: `needs: sync`, `environment: github-pages`(url은 배포 단계 출력), Pages 배포 액션.
- 권한은 필요한 것만: `contents: write`, `pages: write`, `id-token: write`.
- 공개 저장소의 예약 워크플로는 60일 무활동이면 꺼질 수 있다. 봇 커밋이 활동으로 인정되는지는 확인 필요(README에 적어 둔다).

## 12. npm 스크립트

| 스크립트 | 하는 일 |
| --- | --- |
| `sync` | 수집 (4장). `--limit N`, `--reparse` |
| `build:data` | 화면용 데이터 생성 (8장) |
| `label` / `eval` | 정밀도 평가 (10장) |
| `dev` | `build:data` 후 Vite 개발 서버 |
| `build` | `build:data` 후 Vite 빌드 → `dist/` |
| `test` | `vitest run` |
| `typecheck` | `tsc --noEmit` |
| `check` | `typecheck` + `test` |

## 13. 하지 않는 것

- godot-proposals에 댓글, 반응, 이슈 작성 등 쓰기 작업.
- 프로젝트 보드 상태 수집, Discussions 수집, 다른 엔진 지원, 유료 기능, 로그인.
- 2026-01-25 이후 제안을 본문 내용으로 추측해 분류하기.
- 본문 전문을 저장소에 커밋하기.
- 테스트에서 실제 네트워크 호출.

## 14. 열린 질문 (기본값으로 진행하고, 확인되면 `DECISIONS.md`에 기록)

| 질문 | 기본값 | 언제 확인 |
| --- | --- | --- |
| 인자 없는 `stateReason`이 `DUPLICATE`를 돌려주나 | 돌려준다고 가정 | T4 |
| 전체 수집 비용이 기본 토큰 한도 안에 드나 | 든다고 가정, 모자라면 `PANNER_TOKEN` | T4, T5 |
| `markdown` 시기 본문이 `form`과 같은 규칙으로 잘 뽑히나 | 같다고 가정 | T5 실제 샘플 |
| 봇 커밋이 예약 워크플로 60일 무활동 판정을 막나 | 모름 | 공개 후 |
