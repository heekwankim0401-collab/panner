# 메인 후보 (T14)

기본 화면(Likely add-on)에서 **archived를 먼저, 그다음 open을 점수순으로** 20개 뽑았다. 데이터 기준일 2026-11-25(`data/state.json`).
likely 전체는 340개(archived 98, open 242)라 20개가 모두 archived다.

## 채우는 법

- 확인 칸 6개를 `O`(맞음) / `X`(아님) / `?`(모름)으로 채우고, 끝에서 **3개**를 고른다.
- **평가 라벨**은 참고용이다. T9~T10에서 규칙을 모르는 에이전트가 붙인 "작성자가 애드온으로 된다고 말했나"(`data/golden.json`)이고, `—`는 라벨이 없다는 뜻이다. `no`는 분류기가 잘못 고른 것일 수 있으니 먼저 의심한다.
- 확인 칸의 뜻
  - **플러그인·GDExtension 가능:** 플러그인 API나 GDExtension으로 만들 수 있는가(엔진 수정 없이)
  - **기존 애드온 없음:** Asset Library, GitHub, 포럼에 같은 애드온이 없는가
  - **담당자 없음:** 누가 맡아 작업 중이지 않은가(이슈 담당자, 연결된 PR)
  - **로드맵에 없음:** 엔진 로드맵이나 진행 중인 PR에 없는가
  - **중복·무효 아님:** 닫힌 사유가 중복이나 무효가 아닌가(이슈 마지막 댓글 확인)
  - **2~4주:** 2~4주 안에 쓸 만한 첫 버전을 만들 수 있는가

## 후보

| # | 번호 | 제목 | 추천 | 상태 | 점수 | 링크 | 평가 라벨 | 플러그인·GDExtension 가능 | 기존 애드온 없음 | 담당자 없음 | 로드맵에 없음 | 중복·무효 아님 | 2~4주 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #4220 | Obfuscate GDScript in production export | 211 | archived | 7.45 | [GitHub](https://github.com/godotengine/godot-proposals/issues/4220) | yes |  |  |  |  |  |  |
| 2 | #1190 | Add support for FLAC decoding | 23 | archived | 4.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/1190) | yes |  |  |  |  |  |  |
| 3 | #10051 | Add support for resource remaps based on feature tags | 11 | archived | 3.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/10051) | yes |  |  |  |  |  |  |
| 4 | #1073 | Add (optional) visual marker to Debug builds to make them easy to identify | 9 | archived | 3.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/1073) | yes |  |  |  |  |  |  |
| 5 | #1143 | Visible faces with custom color/texture for CollisionShape | 8 | archived | 3.17 | [GitHub](https://github.com/godotengine/godot-proposals/issues/1143) | — |  |  |  |  |  |  |
| 6 | #2850 | Automatically select rename when creating a new node | 12 | archived | 3.17 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2850) | — |  |  |  |  |  |  |
| 7 | #765 | Show native documentation in a popup (in Script Editor) | 7 | archived | 3.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/765) | — |  |  |  |  |  |  |
| 8 | #11066 | Reparent nodes to the root node when they're dragged onto the empty space in scene dock | 7 | archived | 3.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/11066) | — |  |  |  |  |  |  |
| 9 | #504 | Programming Enhancements | 6 | archived | 2.81 | [GitHub](https://github.com/godotengine/godot-proposals/issues/504) | — |  |  |  |  |  |  |
| 10 | #2724 | Create an official plugin for Google Play Services | 6 | archived | 2.81 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2724) | — |  |  |  |  |  |  |
| 11 | #5218 | Provide signed distance functions (SDFs) for physics shapes/colliders | 6 | archived | 2.81 | [GitHub](https://github.com/godotengine/godot-proposals/issues/5218) | — |  |  |  |  |  |  |
| 12 | #3965 | Implement Hybrid Frustum Traced Shadows | 5 | archived | 2.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/3965) | — |  |  |  |  |  |  |
| 13 | #2360 | Add Node extra call argument in signal connection dialog | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2360) | — |  |  |  |  |  |  |
| 14 | #3694 | Add the possibility of multi-user editing of projects over the network | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/3694) | — |  |  |  |  |  |  |
| 15 | #5238 | Expose static `ScriptPath` for scripts in C# for 4.0 | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/5238) | — |  |  |  |  |  |  |
| 16 | #10071 | Build a tiny RISC virtual machine which can interpret and execute native scripts | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/10071) | — |  |  |  |  |  |  |
| 17 | #374 | Add support for vector literals in GDScript | 8 | archived | 2.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/374) | — |  |  |  |  |  |  |
| 18 | #13796 | first class godot cpp support | 3 | archived | 2.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/13796) | — |  |  |  |  |  |  |
| 19 | #2025 | Expose more of the FileSystemDock to GDScript | 2 | archived | 1.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2025) | — |  |  |  |  |  |  |
| 20 | #3547 | Implement QR code scanning in images for use with camera input | 2 | archived | 1.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/3547) | — |  |  |  |  |  |  |

## 병행 읽기에서 적어 둔 후보

(아직 없음. 1일차부터 하기로 한 병행 읽기에서 적은 후보가 있으면 여기에 같은 열로 더한다.)

## 고른 3개

1.
2.
3.
