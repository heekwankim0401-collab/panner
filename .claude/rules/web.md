---
paths:
  - "web/**/*"
---

# web 규칙

- Preact + TypeScript, UI 라이브러리와 CSS 프레임워크 없이 만든다. 스타일은 `web/src/styles.css` 하나.
- UI 문구는 영어.
- 필터, 정렬, 페이지 계산, URL 변환은 `web/src/filter.ts`, `web/src/url.ts`의 순수 함수로 두고 컴포넌트는 그걸 호출만 한다.
- 데이터는 `import.meta.env.BASE_URL` 기준 상대 경로로 불러온다(GitHub Pages 하위 경로). `/`로 시작하는 절대 경로를 쓰지 않는다.
- `index.json`은 한 번 불러오고, 상세 묶음(`detail/<k>.json`)은 펼칠 때만 불러와 메모리에 캐시한다.
- 색은 CSS 변수로 두고 `prefers-color-scheme`로 라이트/다크를 바꾼다.
- 행 이동과 펼치기는 키보드로도 되게 한다. 필터 입력에는 `<label>`을 붙인다.
