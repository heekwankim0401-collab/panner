# Panner 작업 목록 (v2)

순서대로 한다. 작업 하나 = 세션 하나(끝나면 `/clear`). 각 작업은 **완료 조건**의 명령이 통과해야 끝난다.
`[사람]`은 사람이 직접 하는 단계다. Claude는 할 일을 안내하고 멈춘다. `[사람+Claude]`는 Claude 몫만 하고 사람 몫은 안내한다.
**선행 조건**이 있는 작업은 그것부터 확인하고, 안 맞으면 안내 후 멈춘다.
사양 근거는 `docs/SPEC.md`의 장 번호로 적었다.

## 병행: 후보 읽기 (1일차부터, 사람)

Panner와 별개로 GitHub에서 `is:issue is:closed label:archived sort:reactions-+1-desc`(repo: godotengine/godot-proposals)로 후보를 읽기 시작한다. 마음에 드는 것은 `docs/CANDIDATES.md`에 번호와 한 줄 메모로 적어 둔다.

## 1주차

- [x] **T0 [사람] 사전 확인**
    - 기존 제안 뷰어(https://godot-proposals-viewer.github.io/)를 실제 화면에서 열어 archived 제안이나 애드온 가능성 필터가 있는지 본다(페이지 문구로는 열린 제안만 다룸).
    - GitHub, 고도 포럼, 레딧에서 비슷한 도구를 검색한다.
    - 완료 조건: 겹치는 도구가 없으면 진행. 있으면 그 도구에 기여하는 쪽으로 계획을 바꾼다. 결과를 `docs/DECISIONS.md`에 한 줄로 남긴다.

- [x] **T1 프로젝트 골격** (SPEC 2, 3, 8, 12장)
    - `package.json`(12장 스크립트 전부), `tsconfig.json`(strict), Vitest, Vite + Preact(`web/`가 루트, `base: './'`, 출력 `dist/`), `.gitignore`(`node_modules`, `dist`, `web/public/data`, `data/bodies`). `.gitattributes`는 이미 있으니 그대로 둔다.
    - `build:data`는 자리표시자가 아니라 최소 구현으로 둔다: `data/raw`가 없거나 비어 있으면 `items: []`인 `web/public/data/index.json`을 쓴다(SPEC 8장, 들여쓰기 없음).
    - `sync`, `label`, `eval`은 "not implemented"를 출력하고 종료 코드 1을 내는 자리표시자로 둔다.
    - 완료 조건: `npm run check` 통과(테스트 1개 이상), `npm run build`가 `dist/index.html`을 만들고 그 안의 자산 경로가 `./`로 시작한다.

- [x] **T2 타입과 픽스처 연결** (SPEC 4.3, 5, 6장)
    - `pipeline/types.ts`에 `Format`, `Answers`, `RawProposal`, `Feasibility`, `Evidence`를 정의한다.
    - `tests/helpers.ts`: `tests/fixtures/expected.json`과 본문을 읽는 도우미. 본문을 `\r\n`으로 바꿔 주는 함수도 둔다(파일은 바꾸지 않는다).
    - 완료 조건: `npm run check` 통과.

- [ ] **T3 양식 답변 파서** (SPEC 5장)
    - `pipeline/parse.ts`의 `extractAnswers`.
    - 완료 조건: 모든 픽스처의 `format`, `workaround`, `core`가 `expected.json`과 일치. **모든 픽스처를 `\r\n`으로 바꿔도 결과가 같다.** `_No response_`, HTML 주석, 굵은 답 줄(`**Yes.**`), 새 양식(`form2026`) 케이스 포함.

- [ ] **T4 수집기** (SPEC 4장)
    - `pipeline/github.ts`(쿼리, 재시도, rateLimit 대기), `pipeline/sync.ts`(응답 → `RawProposal` 변환, `createdAt`으로 `form`/`markdown` 구분, 바뀐 파일만 쓰기, `data/bodies` 쓰기, `--limit`, `--reparse`).
    - 응답 → `RawProposal` 변환은 순수 함수로 분리하고 가짜 GraphQL 응답으로 테스트한다(네트워크 없이). `createdAt < 2021-06-06`인 `form` 본문이 `markdown`으로 바뀌는 경우와 그 경계를 테스트에 넣는다.
    - `--limit`일 때는 사라진 번호 검사를 하지 않는다(SPEC 4.2).
    - 완료 조건: `npm run check` 통과. 토큰이 있으면 `npm run sync -- --limit 100`을 실행해 (1) `data/raw`에 100개 생성, (2) 재실행 시 "변경 0", (3) `state.json`이 생기지 않음, (4) 쪽당 `rateLimit.cost`를 `docs/DECISIONS.md`에 기록. 그리고 커밋하지 않는 일회성 tsx 스크립트로 #15714를 한 번 조회해 `stateReason`이 `DUPLICATE`인지 확인하고 결과를 기록한다(`gh api`는 settings에서 막혀 있다).

- [ ] **T5 [사람+Claude] 첫 전체 수집과 실제 샘플**
    - 선행 조건: `data/state.json`이 있고 `total`이 10,000 이상. 아니면 사람에게 "`GITHUB_TOKEN` 설정 후 `npm run sync` 실행, `data/` 커밋"을 안내하고 멈춘다.
    - Claude: SPEC 7장의 상태 판정 함수를 `pipeline/score.ts`에 먼저 만들고 표의 모든 행을 테스트한다(T7은 이것을 그대로 쓴다).
    - Claude: 일회성 스크립트로 시기(SPEC 5장 표)별 × `format`별 개수, 상태(SPEC 7장)별 개수, **archived 라벨 없이 `NOT_PLANNED`로 닫힌 제안 수**를 `docs/DECISIONS.md`에 기록한다. 시기와 `format`이 어긋나는 제안이 많으면 원인을 적는다. `NOT_PLANNED`만으로 닫힌 제안이 많으면 사람에게 상태 판정을 다시 볼지 묻는다.
    - Claude: `data/bodies`에서 `legacy`, `markdown`, `form2026`, `unknown` 실제 본문을 합쳐 10개 골라 `tests/fixtures/bodies/real-*.md`로 추가한다. 기대값은 `format`, `workaround`, `core`만 적는다(`feasibility`는 적지 않는다). `format`은 `extractAnswers`가 돌려주는 값이므로 `markdown` 시기 본문도 `"form"`으로 적는다(SPEC 5장 규칙 1). 사람에게 기대값을 확인받는다.
    - 완료 조건: 통계 기록, 실제 샘플 10개 추가, `npm run check` 통과.

- [ ] **T6 분류기** (SPEC 6장)
    - `pipeline/classify.ts`. 문구와 가중치는 맨 위 상수 표 하나에.
    - 완료 조건: `feasibility`, `likely`, `hard` 기대값이 있는 모든 픽스처가 일치. 부정 단어 단위(`another`), 둥근 따옴표, 코드 블록 제거, 행당 한 번 가산 테스트 포함.

## 2주차

- [ ] **T7 상태·점수와 화면용 데이터** (SPEC 7, 8장)
    - `pipeline/score.ts`(상태 판정은 T5에서 만든 함수를 쓴다), `pipeline/build-data.ts` 완성.
    - 완료 조건: 상태 판정 표의 모든 행, wAddon 모든 값, 소수 둘째 자리까지 반올림에 대한 테스트 통과. `npm run build:data`가 `index.json`과 `detail/*.json`을 들여쓰기 없이 만들고 크기와 분류 분포를 출력.

- [ ] **T8 정밀도 도구** (SPEC 9, 10장)
    - 기본 화면의 필터·정렬 함수를 `web/src/filter.ts`에 먼저 만든다(SPEC 9장 규칙 그대로). `label.ts`, `eval.ts`는 이 함수로 상위 30개를 구한다. T11은 이 함수를 이어서 쓴다.
    - `pipeline/label.ts`, `pipeline/eval.ts`.
    - 완료 조건: 상위 30개 선정, 정밀도 계산(`skip`은 분모에서 제외), 종료 코드(0/1/2, yes + no가 0이면 2)를 작은 가짜 데이터로 테스트. `npm run check` 통과.

- [ ] **T9 [사람] 상위 30개 라벨링**
    - 사람이 터미널에서 `npm run label`을 실행해 30개에 y/n을 붙이고 `data/golden.json`을 커밋한다.

- [ ] **T10 분류 규칙 보정** (SPEC 6.3, 10장)
    - `npm run eval`의 `no` 목록을 보고 `classify.ts`의 상수 표만 고친다. 고칠 때마다 픽스처 테스트가 깨지지 않게 한다. 특정 제안 번호에 맞춘 규칙은 금지.
    - 규칙을 바꿔 상위 30개에 새 항목이 들어오면 사람에게 `npm run label`을 다시 안내하고 멈춘다(종료 코드 2).
    - 완료 조건: `npm run eval` 정밀도 70% 이상(종료 코드 0), 고친 내용을 `docs/DECISIONS.md`에 기록.

- [ ] **T11 화면** (SPEC 9장)
    - 목록, 필터, 정렬, 페이지, 상세, URL 상태, 한계 안내.
    - 완료 조건: `filter.ts`, `url.ts` 테스트(기본값 생략, `f=all`, 쉼표로 이은 다중 값, `lb`는 라벨 이름, 라벨 OR, 필터 변경 시 1페이지, 왕복 변환) 통과, `npm run build` 성공. 화면 확인은 `/verify`나 브라우저 도구로 한다: 기본 화면이 뜬다, 필터를 바꾸고 새로고침해도 유지된다, 상세가 펼쳐진다. 그런 도구를 쓸 수 없으면 이 세 가지를 사람에게 확인 요청하고 멈춘다.

- [ ] **T12 워크플로** (SPEC 11장)
    - `.github/workflows/ci.yml`, `.github/workflows/sync.yml`.
    - 완료 조건: `actionlint`가 있으면 통과. 없으면 YAML 파싱 결과와 SPEC 11장 항목별 대조표를 보여준다.

- [ ] **T13 [사람+Claude] 공개**
    - Claude: 영어 `README.md`(무엇, 데이터 출처, 분류 방식, 한계: 2026-01-25 이후 제안은 답변 없음·archived에 무효와 옛 중복이 섞임·예약 실행 60일 규칙, 로컬 실행법), `LICENSE`(MIT), 고도 포럼 소개 글 초안 `docs/ANNOUNCE.md`.
    - 사람: 저장소 공개, Pages 소스를 GitHub Actions로 설정, 필요하면 `PANNER_TOKEN` 시크릿 등록, `sync` 워크플로 수동 실행.
    - 완료 조건: 배포된 페이지에서 기본 화면이 뜬다.

- [ ] **T14 [사람+Claude] 메인 후보 선정**
    - Claude: 기본 화면(likely)에서 archived를 먼저, 그다음 open을 score순으로 20개 뽑아 `docs/CANDIDATES.md` 표로 만든다. 열: 번호, 제목, 추천, 상태, 점수, 링크, 그리고 비워 둔 확인 칸 6개: 플러그인 API나 GDExtension으로 가능, 기존 애드온 없음, 담당자 없음, 로드맵에 없음, 닫힌 사유가 중복·무효 아님, 2~4주 안에 가능. 병행 읽기에서 적어 둔 후보도 같은 표에 합친다.
    - 사람: 확인 칸을 채우고 3개를 고른다.
