<!--
고도 포럼(forum.godotengine.org) 소개 글 초안. 올리기 전에 할 일:
- 사이트가 실제로 열리는지 확인한다.
- 카테고리는 "Resources" 아래 "Tools" 같은 곳이 맞다. 포럼 규칙을 확인한다.
- 숫자(제안 수, 정밀도)는 올리는 날 사이트 상단과 `npm run eval` 결과로 맞춘다.
-->

# Panner: find Godot proposals that could be add-ons

**Site:** https://heekwankim0401-collab.github.io/panner/ · **Source:** https://github.com/heekwankim0401-collab/panner

Hi everyone,

I built a small tool for people who want to make a useful add-on but don't know what to build.

Many proposals in godot-proposals end up archived because they fit better as add-ons. Many open ones say the same thing in their template answers. The proposal template asks two questions:

- *Can it be worked around with a few lines of script?*
- *Is there a reason why this should be core and not an add-on in the asset library?*

Panner reads every author's answers to those two questions. It then lists the proposals where the author says an add-on, plugin or GDExtension could do the job, ranked by upvotes.

## What it does

- Covers all ~12,000 proposals, refreshed weekly. It shows **archived** (the engine won't build them) and **open** proposals.
- Labels each one **Likely add-on**, **Unclear**, **Hard as add-on**, or **No answer**.
- Ranks by upvotes. Archived proposals get a small boost, because nobody is going to build those in core.
- Lets you filter by title, label, status and minimum upvotes. Filters stay in the URL, so you can share a view.
- Expand a row to read the author's answers with the deciding phrases highlighted, then jump to the GitHub issue.

## Please keep in mind

- **It reads what the author wrote, not what is technically possible.** The label is a starting point, not a verdict. On the top 60 of the default view, about 4 in 5 really do say "this could be an add-on" (my own check, small sample).
- **Proposals opened since 2026-01-25 have no add-on question** in their template, so they show as "No answer".
- **"Archived" also contains invalid proposals and some old duplicates.** Read the issue thread before you start, and check whether someone already made the add-on.

It is read-only: it never comments on or reacts to proposals.

## Feedback welcome

If you find a proposal that is clearly misclassified, or you have ideas for better filters, please reply here or open an issue in the repository. If you build an add-on from a proposal you found with Panner, I'd love to hear about it.
