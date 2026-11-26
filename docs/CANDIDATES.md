# 메인 후보 (T14)

기본 화면(Likely add-on)에서 **archived를 먼저, 그다음 open을 점수순으로** 20개 뽑았다. 데이터 기준일 2026-11-25(`data/state.json`).
likely 전체는 340개(archived 98, open 242)라 20개가 모두 archived다.

**확인 칸은 2026-11-26에 Claude 에이전트 넷이 조사해 미리 채웠다**(읽기 전용: 이슈 본문·댓글·닫힌 사유, 연결된 PR, Asset Library·Asset Store·GitHub 검색). 칸마다 근거는 아래 "조사 메모"에 링크로 남겼다. `?`는 찾은 자료로 판단이 안 선다는 뜻이고, "플러그인·GDExtension 가능"과 "2~4주"는 추정이 섞여 있다. 고르기 전에 마음에 드는 후보의 근거 링크를 직접 열어 확인한다.

## 채우는 법

- 확인 칸은 `O`(맞음) / `X`(아님) / `?`(모름)이다. 조사 결과를 고쳐도 된다. 끝에서 **3개**를 고른다.
- **평가 라벨**은 참고용이다. T9~T10에서 규칙을 모르는 에이전트가 붙인 "작성자가 애드온으로 된다고 말했나"(`data/golden.json`)이고, `—`는 라벨이 없다는 뜻이다.
- 확인 칸의 뜻
  - **플러그인·GDExtension 가능:** 플러그인 API나 GDExtension으로 만들 수 있는가(엔진 수정 없이)
  - **기존 애드온 없음:** Asset Library, Asset Store, GitHub, 포럼에 같은 애드온이 없는가
  - **담당자 없음:** 누가 맡아 작업 중이지 않은가(이슈 담당자, 연결된 PR)
  - **로드맵에 없음:** 그 뒤 엔진에 들어갔거나, 마일스톤이나 진행 중인 엔진 PR에 있지 않은가
  - **중복·무효 아님:** 닫힌 사유가 중복이나 무효가 아닌가
  - **2~4주:** 2~4주 안에 쓸 만한 첫 버전을 만들 수 있는가

## 후보

| # | 번호 | 제목 | 추천 | 상태 | 점수 | 링크 | 평가 라벨 | 플러그인·GDExtension 가능 | 기존 애드온 없음 | 담당자 없음 | 로드맵에 없음 | 중복·무효 아님 | 2~4주 | O 개수 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #4220 | Obfuscate GDScript in production export | 211 | archived | 7.45 | [GitHub](https://github.com/godotengine/godot-proposals/issues/4220) | yes | O | X | O | O | O | ? | 4 |
| 2 | #1190 | Add support for FLAC decoding | 23 | archived | 4.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/1190) | yes | O | X | O | O | O | O | 5 |
| 3 | #10051 | Add support for resource remaps based on feature tags | 11 | archived | 3.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/10051) | yes | O | X | O | O | O | O | 5 |
| 4 | #1073 | Add (optional) visual marker to Debug builds to make them easy to identify | 9 | archived | 3.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/1073) | yes | O | X | O | O | O | O | 5 |
| 5 | #1143 | Visible faces with custom color/texture for CollisionShape | 8 | archived | 3.17 | [GitHub](https://github.com/godotengine/godot-proposals/issues/1143) | — | O | ? | O | X | X | O | 3 |
| 6 | #2850 | Automatically select rename when creating a new node | 12 | archived | 3.17 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2850) | — | O | O | O | O | O | O | 6 |
| 7 | #765 | Show native documentation in a popup (in Script Editor) | 7 | archived | 3.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/765) | — | O | X | O | X | X | O | 3 |
| 8 | #11066 | Reparent nodes to the root node when they're dragged onto the empty space in scene dock | 7 | archived | 3.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/11066) | — | ? | O | O | ? | X | O | 3 |
| 9 | #504 | Programming Enhancements | 6 | archived | 2.81 | [GitHub](https://github.com/godotengine/godot-proposals/issues/504) | — | X | ? | O | X | X | X | 1 |
| 10 | #2724 | Create an official plugin for Google Play Services | 6 | archived | 2.81 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2724) | — | O | X | O | O | O | ? | 4 |
| 11 | #5218 | Provide signed distance functions (SDFs) for physics shapes/colliders | 6 | archived | 2.81 | [GitHub](https://github.com/godotengine/godot-proposals/issues/5218) | — | O | ? | O | O | O | O | 5 |
| 12 | #3965 | Implement Hybrid Frustum Traced Shadows | 5 | archived | 2.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/3965) | — | X | O | O | O | O | X | 4 |
| 13 | #2360 | Add Node extra call argument in signal connection dialog | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2360) | — | X | ? | O | X | X | ? | 1 |
| 14 | #3694 | Add the possibility of multi-user editing of projects over the network | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/3694) | — | O | X | O | O | X | X | 3 |
| 15 | #5238 | Expose static `ScriptPath` for scripts in C# for 4.0 | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/5238) | — | O | X | O | O | O | O | 5 |
| 16 | #10071 | Build a tiny RISC virtual machine which can interpret and execute native scripts | 4 | archived | 2.32 | [GitHub](https://github.com/godotengine/godot-proposals/issues/10071) | — | O | X | O | O | O | X | 4 |
| 17 | #374 | Add support for vector literals in GDScript | 8 | archived | 2.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/374) | — | X | O | O | O | O | X | 4 |
| 18 | #13796 | first class godot cpp support | 3 | archived | 2.00 | [GitHub](https://github.com/godotengine/godot-proposals/issues/13796) | — | O | X | X | X | X | X | 1 |
| 19 | #2025 | Expose more of the FileSystemDock to GDScript | 2 | archived | 1.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/2025) | — | X | ? | O | X | X | ? | 1 |
| 20 | #3547 | Implement QR code scanning in images for use with camera input | 2 | archived | 1.58 | [GitHub](https://github.com/godotengine/godot-proposals/issues/3547) | — | O | X | O | ? | O | O | 4 |

## 조사 요약

- **6개 모두 O:** #2850
- **플러그인 가능 O, 중복·무효 아님 O, 2~4주가 X 아님(1차 후보):** #2850(O 6개), #5218(O 5개), #1190(O 5개), #10051(O 5개), #1073(O 5개), #5238(O 5개), #4220(O 4개), #2724(O 4개), #3547(O 4개)
- **기존 애드온이 있어 X인 후보**도 그 애드온이 오래됐거나(예: Godot 3 시절, 몇 년간 갱신 없음) 불안정하면 새로 만들거나 이어받을 여지가 있다. 메모를 보고 판단한다.
- 엔진에 이미 들어갔거나(로드맵 X) 엔진 수정이 필요한(플러그인 X) 후보는 사실상 빠진다.

## 조사 메모

### #4220 Obfuscate GDScript in production export

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 ?

메인테이너 bruvzg가 EditorExportPlugin(_export_file, skip, add_file)으로 애드온 구현이 가능하다고 했고, GDMaim(2026-11-23 갱신, 스타 1.3k)과 dalexeev/gdscript-preprocessor가 이미 있습니다. 메인테이너가 아니라 작성자가 2026-11-07 직접 닫았고 엔진 PR은 없습니다. 기본 이름 바꾸기는 빨리 되지만 tscn과 export 변수, 문자열 기반 호출까지 다루는 범위는 판단하기 어려워 '?'로 뒀습니다.

- https://github.com/godotengine/godot-proposals/issues/4220
- https://github.com/cherriesandmochi/gdmaim
- https://github.com/dalexeev/gdscript-preprocessor
- https://github.com/tavurth/godot-gdscript-obfuscator

### #1190 Add support for FLAC decoding

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 O

aaronfranke가 플러그인 후보라고 했고, 엔진 PR #80160은 거절, #96545는 병합되지 않고 닫혀 Calinou가 이 제안을 닫았습니다. GDExtension인 xiph-audio-streams(Asset Store, Godot 4.5 이상, v0.2.0은 unstable 표시)와 godot-flac-extension(2023년 이후 갱신 없음)이 이미 있습니다.

- https://github.com/godotengine/godot-proposals/issues/1190
- https://store.godotengine.org/asset/goatchurch/xiph-audio-streams/
- https://github.com/goatchurchprime/godot-xiph-audio
- https://github.com/DeleteSystem32/godot-flac-extension
- https://github.com/godotengine/godot/pull/80160
- https://github.com/godotengine/godot/pull/96545

### #10051 Add support for resource remaps based on feature tags

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 O

KoBeWi가 EditorExportPlugin으로 가능하다고 했고, 작성자가 Resource Remaps 플러그인(Asset Library 3451)으로 제안 전체를 구현한 뒤 직접 닫았습니다. 작성자가 PoC를 약 2주 만에 만들었습니다. 엔진 PR #98251(EditorExport 노출)은 열려 있지만 작성자가 이 PR에 대한 의존을 취소선으로 지웠습니다.

- https://github.com/godotengine/godot-proposals/issues/10051
- https://godotengine.org/asset-library/asset/3451
- https://github.com/allenwp/godot-resource-remaps
- https://github.com/godotengine/godot/pull/98251

### #1073 Add (optional) visual marker to Debug builds to make them easy to identify

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 O

akien-mga가 엔진에 넣지 말고 애드온으로 하자며 닫았고, 직접 godot-debug-watermark 씬을 공개했습니다. 이 저장소는 2020-11 이후 갱신이 없고 Asset Library에서는 찾지 못했으며 Godot 4 호환은 확인하지 않았습니다. 엔진에는 창 제목 '(DEBUG)' 접미사만 있고, 기능이 작아 며칠이면 됩니다.

- https://github.com/godotengine/godot-proposals/issues/1073
- https://github.com/akien-mga/godot-debug-watermark

### #1143 Visible faces with custom color/texture for CollisionShape

플러그인·GDExtension 가능 O · 기존 애드온 없음 ? · 담당자 없음 O · 로드맵에 없음 X · 중복·무효 아님 X · 2~4주 O

Calinou가 #906의 중복으로 닫았고, #906은 4.4 마일스톤의 PR #90644(CollisionShape3D 도형별 디버그 색상과 면 채움)로 구현됐습니다. 엔진에 없는 것은 텍스처뿐이며, 애드온은 기본 디버그 그리기를 덮어쓰지 못하고 기즈모 등으로 면을 따로 그려야 합니다.

- https://github.com/godotengine/godot-proposals/issues/1143
- https://github.com/godotengine/godot-proposals/issues/906
- https://github.com/godotengine/godot/pull/90644

### #2850 Automatically select rename when creating a new node

플러그인·GDExtension 가능 O · 기존 애드온 없음 O · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 O

작성자가 PR #49521(루트 노드 생성 후 씬 독 포커스)과 Enter/F2 이름 변경으로 충분하다며 스스로 닫음(중복·무효 아님). 작성자가 몇 줄짜리 플러그인으로 가능하다고 답했고, 생성 직후 자동 이름 변경은 엔진에도 애드온에도 없음(일괄 이름 변경 도구와 루트를 파일명으로 바꾸는 플러그인만 있음).

- https://github.com/godotengine/godot-proposals/issues/2850
- https://github.com/godotengine/godot/pull/49521
- https://github.com/godotengine/godot-proposals/issues/1686
- https://github.com/CassianoBelniak/katuiche-rename-root-to-filename
- https://godotengine.org/asset-library/asset/4807

### #765 Show native documentation in a popup (in Script Editor)

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 X · 중복·무효 아님 X · 2~4주 O

#1393으로 합치며 닫혔고(사실상 중복), 그 제안은 Godot 4.4에서 PR #91060(코드 편집기 문서 툴팁)으로 엔진에 구현됨. 외부 편집기용 VS Code 확장(godot-tools)도 같은 기능을 이미 제공함.

- https://github.com/godotengine/godot-proposals/issues/765
- https://github.com/godotengine/godot-proposals/issues/1393
- https://github.com/godotengine/godot/pull/91060
- https://github.com/godotengine/godot-vscode-plugin

### #11066 Reparent nodes to the root node when they're dragged onto the empty space in scene dock

플러그인·GDExtension 가능 ? · 기존 애드온 없음 O · 담당자 없음 O · 로드맵에 없음 ? · 중복·무효 아님 X · 2~4주 O

Calinou가 열린 제안 #8825로 통합하며 닫음(중복). 편집기 내부 Tree에 끼어드는 꼼수 플러그인은 가능해 보이지만 확인하지 못했고, 4.7에 머지된 PR #112993이 Tree 드래그 앤 드롭을 바꿨으나 빈 공간 드롭은 언급하지 않아 엔진 반영 여부가 불분명함.

- https://github.com/godotengine/godot-proposals/issues/11066
- https://github.com/godotengine/godot-proposals/issues/8825
- https://github.com/godotengine/godot/pull/112993

### #504 Programming Enhancements

플러그인·GDExtension 가능 X · 기존 애드온 없음 ? · 담당자 없음 O · 로드맵에 없음 X · 중복·무효 아님 X · 2~4주 X

여러 기능을 묶은 제안이라 기능마다 따로 올리라며 닫혔고, 항목 대부분은 GDScript 언어 변경이라 애드온으로 만들 수 없음(작성자도 탭 스크립트만 가능하다고 함). 문서 생성(4.0, #41095), 코드 영역 접기(4.2, #74843), for 루프 변수 타입(4.2, #80247)은 이미 엔진에 들어감.

- https://github.com/godotengine/godot-proposals/issues/504
- https://github.com/godotengine/godot/pull/41095
- https://github.com/godotengine/godot/pull/74843
- https://github.com/godotengine/godot/pull/80247

### #2724 Create an official plugin for Google Play Services

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 ?

코어 팀 범위 밖이라 계획 없음으로 닫혔고 Android 플러그인으로 가능하다는 답을 받았지만, 커뮤니티가 관리하는 godot-play-game-services(godot-sdk-integrations)가 이미 있음. 메인테이너는 큰 작업이라고 했고, 로그인·업적·리더보드만 담은 첫 버전이라면 2~4주에 들어갈 수도 있음.

- https://github.com/godotengine/godot-proposals/issues/2724
- https://github.com/godot-sdk-integrations/godot-play-game-services
- https://github.com/cgisca/PGSGP

### #5218 Provide signed distance functions (SDFs) for physics shapes/colliders

플러그인·GDExtension 가능 O · 기존 애드온 없음 ? · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 O

작성자가 직접 애드온으로 가능하다고 했고, 2026-05에 '관심이 적고 Quilez 거리 함수로 쉽게 다시 만들 수 있다'며 닫음(중복 아님). 물리 형상 전반을 다루는 SDF 질의 애드온은 못 찾았지만, rsandfield/gravity가 캡슐·박스·토러스 중력이라는 원래 동기를 일부 다루고 GitHub 검색 결과가 미덥지 않아 '?'로 둠.

- https://github.com/godotengine/godot-proposals/issues/5218
- https://iquilezles.org/articles/distfunctions/
- https://github.com/rsandfield/gravity
- https://godotengine.org/asset-library/asset/4604

### #3965 Implement Hybrid Frustum Traced Shadows

플러그인·GDExtension 가능 X · 기존 애드온 없음 O · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 X

HFTS에는 conservative rasterization이 필요한데 RenderingDevice에는 아직 없음(PR #97933, 제안 #10927 모두 열림). 그림자 파이프라인을 바꿀 통로도 없어 지금은 애드온으로 만들 수 없음. 작성자가 다른 기법(레이트레이싱, 가상 섀도맵)을 이유로 직접 닫았고, Godot용 HFTS 애드온은 찾지 못함.

- https://github.com/godotengine/godot-proposals/issues/3965
- https://github.com/godotengine/godot/pull/97933
- https://github.com/godotengine/godot-proposals/issues/10927
- https://developer.nvidia.com/hybrid-frustum-traced-shadows-0

### #2360 Add Node extra call argument in signal connection dialog

플러그인·GDExtension 가능 X · 기존 애드온 없음 ? · 담당자 없음 O · 로드맵에 없음 X · 중복·무효 아님 X · 2~4주 ?

작성자가 #702(아직 열림)의 중복이라며 닫았고, 애드온으로는 제대로 만들기 어렵다고 답함. 제안한 'NodePath 추가 인자'는 이미 엔진에 들어감: 연결 창에 모든 타입 추가(#60543), NodePath 인자 수정(#107013). Object/Node 타입만 빠져 있음.

- https://github.com/godotengine/godot-proposals/issues/2360
- https://github.com/godotengine/godot-proposals/issues/702
- https://github.com/godotengine/godot/pull/60543
- https://github.com/godotengine/godot/pull/107013

### #3694 Add the possibility of multi-user editing of projects over the network

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 X · 2~4주 X

Calinou가 #851(열림, 담당자·마일스톤 없음)의 중복으로 닫음. GodotWithU, Godot Team Create 같은 실시간 공동 편집 애드온이 이미 있어서 애드온으로 가능하다는 건 확인됨. 제안 범위(씬·스크립트 동시 편집, 잠금, 기록)는 2~4주를 넘음.

- https://github.com/godotengine/godot-proposals/issues/3694
- https://github.com/godotengine/godot-proposals/issues/851
- https://godotengine.org/asset-library/asset/4870
- https://godotengine.org/asset-library/asset/5451

### #5238 Expose static `ScriptPath` for scripts in C# for 4.0

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 O

메인테이너 raulsntos가 직접 소스 생성기를 만들어 쓰라고 안내했고, 작성자가 닫는 댓글 없이 스스로 닫음(중복·무효 아님). GodotSharp.SourceGenerators의 [SceneTree]가 TscnFilePath와 정적 Instantiate를 이미 만들어 주므로 기존 애드온이 사용 사례를 다룸.

- https://github.com/godotengine/godot-proposals/issues/5238
- https://github.com/Cat-Lips/GodotSharp.SourceGenerators
- https://github.com/godotengine/godot/pull/46713

### #10071 Build a tiny RISC virtual machine which can interpret and execute native scripts

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 X

제안자(fire)가 직접 GDExtension 'godot-sandbox'로 구현해 v0.17 출시 후 완료로 닫았고, 에셋 라이브러리에도 올라가 있다. 코어 통합은 '나중에 새 제안'이라고만 했고 엔진 PR은 없다.

- https://github.com/godotengine/godot-proposals/issues/10071
- https://github.com/libriscv/godot-sandbox
- https://github.com/libriscv/godot-sandbox/releases/tag/v0.17
- https://godotengine.org/asset-library/asset/3192

### #374 Add support for vector literals in GDScript

플러그인·GDExtension 가능 X · 기존 애드온 없음 O · 담당자 없음 O · 로드맵에 없음 O · 중복·무효 아님 O · 2~4주 X

GDScript 토크나이저/파서를 고쳐야 하는 문법 변경이라 애드온으로는 불가능하다. 지지 부족(논란)으로 닫혔고, 관련 엔진 PR이나 애드온은 찾지 못했다.

- https://github.com/godotengine/godot-proposals/issues/374

### #13796 first class godot cpp support

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 X · 로드맵에 없음 X · 중복·무효 아님 X · 2~4주 X

Calinou가 #3367로 통합하며 닫았고(사실상 중복), 이를 구현하는 엔진 PR #90979가 4.x 마일스톤에 열려 있다. C++ 스크립팅은 이미 J.E.N.O.V.A, godot-sandbox 같은 GDExtension이 제공한다.

- https://github.com/godotengine/godot-proposals/issues/13796
- https://github.com/godotengine/godot-proposals/issues/3367
- https://github.com/godotengine/godot/pull/90979
- https://github.com/Jenova-Framework/J.E.N.O.V.A
- https://github.com/libriscv/godot-sandbox

### #2025 Expose more of the FileSystemDock to GDScript

플러그인·GDExtension 가능 X · 기존 애드온 없음 ? · 담당자 없음 O · 로드맵에 없음 X · 중복·무효 아님 X · 2~4주 ?

제안 자체가 엔진 API 공개 요청이고, 범위가 너무 모호하다는 지적(텍스트 파일은 #677과 중복)을 받고 작성자가 스스로 닫았다. 이후 TextFile 지원, 파일시스템 독 컨텍스트 메뉴 플러그인, 선택 시그널 등이 코어에 일부 들어갔다.

- https://github.com/godotengine/godot-proposals/issues/2025
- https://github.com/godotengine/godot-proposals/issues/677
- https://github.com/godotengine/godot/pull/53025
- https://github.com/godotengine/godot/pull/97185
- https://github.com/godotengine/godot/pull/107275

### #3547 Implement QR code scanning in images for use with camera input

플러그인·GDExtension 가능 O · 기존 애드온 없음 X · 담당자 없음 O · 로드맵에 없음 ? · 중복·무효 아님 O · 2~4주 O

메인테이너가 '플러그인으로 하는 게 낫다'며 닫았고, 이미 qrnative-cpp(GDExtension, Image 디코드)와 Android/iOS QR 플러그인(이미지에서 스캔)이 있다. 코어에는 OpenXR 마커 추적(QR 포함, #107391)이 들어갔지만, 임의 이미지에서 QR을 디코드하는 기능은 없다.

- https://github.com/godotengine/godot-proposals/issues/3547
- https://github.com/fenix-hub/qrnative-cpp
- https://godotengine.org/asset-library/asset/4693
- https://github.com/godot-mobile-plugins/godot-qr
- https://github.com/godotengine/godot/pull/107391

## 병행 읽기에서 적어 둔 후보

(아직 없음. 병행 읽기에서 적은 후보가 있으면 여기에 같은 열로 더한다.)

## 고른 3개

1.
2.
3.
