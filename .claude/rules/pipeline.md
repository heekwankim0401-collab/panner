---
paths:
  - "pipeline/**/*.ts"
  - "tests/**/*"
---

# pipeline 규칙

- 네트워크를 쓰는 코드는 `pipeline/github.ts` 한 곳에만 둔다. 나머지는 입력을 받아 값을 돌려주는 순수 함수로 짠다.
- GraphQL 쿼리는 SPEC 4.1에 적힌 필드만 요청한다. mutation은 쓰지 않는다.
- 파일 쓰기는 "내용이 바뀌었을 때만" 한다(바이트 비교). 커밋 diff를 작게 유지하기 위해서다.
- 진행 로그는 한 줄 요약 위주로: 페이지 번호, 받은 개수, rateLimit cost/remaining.
- 테스트 픽스처 `tests/fixtures/bodies/*.md`는 실제 제안 본문 형식을 흉내 낸다. 기대값은 `tests/fixtures/expected.json` 한 곳에서 관리한다. 키가 있는 항목만 검사한다(`real-*`는 `feasibility`, `likely`, `hard`가 없다).
- 파서 테스트는 픽스처를 그대로 한 번, `\r\n`으로 바꿔서 한 번 돌린다. 픽스처 파일 자체는 `\n`으로 둔다.
- 픽스처 기대값을 코드에 맞춰 바꾸지 않는다. 바꿔야 한다고 판단되면 이유를 말하고 사용자 확인을 받는다.
