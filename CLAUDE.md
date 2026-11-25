# Panner

godotengine/godot-proposals에서 엔진이 만들지 않기로 한 제안(archived 라벨)과 열린 제안을 모아, 작성자가 "애드온으로 가능하다"고 답한 것을 점수로 정렬해 보여주는 정적 웹 도구.
사양은 `docs/SPEC.md`, 작업 순서는 `docs/TASKS.md`, 결정의 이유는 `docs/DECISIONS.md`. 작업 전에 해당 작업과 SPEC의 관련 장만 읽는다.

## 명령

- `npm run check` — 타입 검사 + 테스트. **작업을 끝냈다고 말하기 전에 반드시 통과시키고 출력을 보여준다.**
- `npm run test -- tests/parse.test.ts` — 테스트 하나만 실행 (먼저 이걸로 돌리고 마지막에 전체)
- `npm run sync -- --limit 20` — 수집 일부만 (환경변수 `GITHUB_TOKEN` 필요, `state.json`은 안 씀)
- `npm run sync -- --reparse` — 네트워크 없이 `data/bodies`에서 답변 다시 추출
- `npm run build:data` / `npm run dev` / `npm run build`
- `npm run eval` — 상위 30개 정밀도 (70% 미만 1, 라벨 부족 2)

## 구조

- `pipeline/` Node 스크립트(수집, 파싱, 분류, 점수, 데이터 빌드) · `web/` Vite + Preact 화면 · `tests/` Vitest와 픽스처
- `data/raw/<number>.json` 수집 결과, 본문 전문 없음(커밋함) · `data/bodies/` 본문 캐시(gitignore) · `web/public/data/` 생성물(gitignore)

## 규칙

- IMPORTANT: GitHub에는 읽기만 한다. 댓글, 반응, 이슈 작성 등 쓰기 API를 호출하는 코드를 만들지 않는다.
- 테스트는 네트워크를 쓰지 않는다. GitHub 응답은 가짜 데이터로 대신한다.
- 본문은 줄 끝이 `\r\n`일 수 있다. 파싱 전에 항상 `\n`으로 맞춘다.
- "엔진이 안 함"은 `archived` 라벨로 판단한다. GitHub 닫힌 이유(완료/계획 없음)는 중복 판별에만 쓴다.
- 분류 문구와 가중치는 `pipeline/classify.ts` 맨 위 상수 표에만, 점수 가중치는 `pipeline/score.ts` 맨 위에만 둔다.
- JSON 출력은 키 정렬, 같은 입력이면 같은 바이트. `data/`의 JSON은 2칸 들여쓰기와 끝 줄바꿈, 화면용 `web/public/data/`는 들여쓰기 없이.
- 줄 끝은 LF로 쓴다(`.gitattributes`가 고정). Windows에서도 파일을 CRLF로 쓰지 않는다.
- SPEC에 없는 결정을 내렸으면 `docs/DECISIONS.md`에 한 줄로 남긴다. 새 의존성은 SPEC 2장에 없으면 추가 전에 이유를 말한다.

## 작업 방식

- `/next-task`로 다음 작업을 진행한다. 작업이 끝나면 `docs/TASKS.md` 체크박스를 체크한다.
- 여러 파일을 바꾸는 작업은 짧은 계획을 먼저 보여준다.
- 커밋은 사용자가 요청할 때만 한다. 메시지는 `<영역>: <내용>` (예: `parse: handle legacy bold format`).
- 컴팩션할 때는 바꾼 파일 목록과 마지막 `npm run check` 결과를 남긴다.
