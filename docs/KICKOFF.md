# Claude Code로 시작하기 (v2)

## 준비

1. 이 폴더를 새 저장소로 쓴다: `git init` 후 첫 커밋. 첫 커밋 전에 `.gitattributes`(줄 끝 LF 고정)가 있는지 확인하고, 키트 zip(`panner-claude-code-kit-v2.zip`)은 지우거나 커밋에서 뺀다.
2. Node 22 이상이 깔려 있는지 확인한다: `node -v`
3. 수집(T4부터)에 쓸 GitHub 토큰을 만든다. 파인 그레인드 토큰, 공개 저장소 읽기 전용이면 충분하다(프로젝트 보드는 쓰지 않으므로 추가 권한 불필요). 터미널에서 `export GITHUB_TOKEN=...` (Windows PowerShell은 `$env:GITHUB_TOKEN = "..."`)
4. T0(사전 확인)은 사람이 먼저 한다. 후보 읽기도 오늘부터 병행한다. 둘 다 `docs/TASKS.md` 맨 위에 있다.

## 첫 세션: 사양 점검

저장소 폴더에서 `claude`를 실행하고 아래를 그대로 보낸다.

```
CLAUDE.md, docs/SPEC.md, docs/TASKS.md, docs/DECISIONS.md를 읽어. 아직 구현은 하지 마.
사양에서 애매한 곳, 서로 모순되는 곳, 내가 정해야 하는 것만 번호 목록으로 알려줘.
```

답을 보고 필요한 부분을 `docs/SPEC.md`에 반영한다.

## 그다음부터: 작업 하나씩

```
/clear
/next-task T1
```

- 작업이 끝날 때마다 `/clear` 후 `/next-task` (번호를 생략하면 다음 미완료 작업).
- 작업 서너 개마다 범위를 지정해 검토받는다. 예: 작업마다 커밋했다면 `/code-review HEAD~4..HEAD`. 범위 없이 실행하면 마지막 커밋 정도만 볼 수 있다.
- 같은 문제로 두 번 넘게 고쳐도 안 되면 `/clear` 후 무엇이 안 됐는지 적어서 다시 시작한다.

## 파일 안내

| 파일 | 역할 |
| --- | --- |
| `CLAUDE.md` | 매 세션 자동으로 읽는 짧은 규칙과 명령 |
| `docs/SPEC.md` | 구현 사양 v2 (결정 사항 전부) |
| `docs/TASKS.md` | 작업 순서, 선행 조건, 완료 조건 |
| `docs/DECISIONS.md` | 결정과 그 이유 (외부 검토 반영분 포함) |
| `.claude/skills/next-task/SKILL.md` | `/next-task` 명령 |
| `.claude/rules/*.md` | `pipeline/`, `web/` 파일을 다룰 때만 읽히는 규칙 |
| `.claude/settings.json` | 자주 쓰는 명령 사전 허용(Bash), GitHub 쓰기 명령 차단(Bash, PowerShell — PowerShell 규칙은 새 세션에서 동작 확인 필요) |
| `.gitattributes` | 줄 끝을 LF로 고정 (Windows `core.autocrlf=true`에서도 바이트가 같게) |
| `tests/fixtures/` | 파서·분류기 테스트용 샘플 본문 14개와 기대값 |
