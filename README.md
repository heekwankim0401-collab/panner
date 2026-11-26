# Panner

**Find Godot proposals the engine won't build — or hasn't built yet — that their authors say could be an add-on.**

Panner collects every issue in [godotengine/godot-proposals](https://github.com/godotengine/godot-proposals), reads the authors' answers to the proposal template, and ranks the ones that look buildable as an add-on, plugin or GDExtension. It is meant for people looking for a useful add-on to build.

**Live site:** https://heekwankim0401-collab.github.io/panner/

Panner is a community tool and is not affiliated with the Godot Engine project.

## What you see

- **Default view:** proposals classified as **Likely add-on**, both open and archived, sorted by score.
- **Filters:** title search, add-on feasibility, status (open / closed: archived), labels and minimum upvotes. Every filter, the sort order and the page number are kept in the URL, so you can bookmark or share a view.
- **Details:** expand a row to read the author's two template answers with the matched phrases highlighted, and open the proposal on GitHub.

## How it works

1. **Collect** (`npm run sync`): reads all issues of `godotengine/godot-proposals` through the GitHub GraphQL API, read-only, every week. Pull requests, Discussions and project boards are not included.
2. **Extract answers** (`pipeline/parse.ts`): the proposal template has asked two questions since 2019-09-04:
   - *If this enhancement will not be used often, can it be worked around with a few lines of script?*
   - *Is there a reason why this should be core and not an add-on in the asset library?*

   The parser reads the answers from every template version: issue forms, Markdown headings of any level and the older bold-text template.
3. **Classify** (`pipeline/classify.ts`): a small rule table looks for phrases in those answers. It labels each proposal as one of four classes:
   - **Likely add-on:** the author says it can be done as an add-on, for example "this could be an add-on" or "can be done with a plugin". Phrases in a negated, conditional or doubtful clause ("if …", "only …", "would be harder as an add-on") do not count.
   - **Hard as add-on:** the author says it needs engine changes, cannot be an add-on, or only partly can
   - **Unclear:** neither side wins
   - **No answer:** the proposal uses the 2026 template, which has no add-on question
4. **Score** (`pipeline/score.ts`):

   ```
   score = log2(1 + max(0, upvotes − downvotes)) × add-on weight × status weight
   ```

   - Add-on weight: likely 1.0, unclear 0.5, no answer 0.5, hard 0.1
   - Status weight: archived 1.0, open 0.7
   - Proposals closed as duplicates or closed for any other reason are not shown.
5. **Build** (`npm run build`): writes `index.json` and per-100 detail files, then builds a static Vite + Preact site for GitHub Pages.

"The engine won't build it" means the proposal is closed with the `archived` label. GitHub's own close reason is only used to detect duplicates, because it is not applied consistently.

### How accurate is it?

Precision is measured on the default view's top 30. Each proposal gets a label for one question: "did the author say this can be an add-on?" The labels were made by an AI agent that never saw the classification rules and read only the titles and answers.

- Current precision is **86.7%** on the top 30 (26 of 30) and 83.3% on the top 60 (50 of 60); see `npm run eval` and `data/golden.json`.
- The rules were tuned on most of those proposals, so the real precision is probably lower. Two checks on proposals the rules had not been tuned on:
  - Before the last tuning round, ranks 31–60 scored 20 of 30 (66.7%).
  - After it, the 7 proposals that newly entered the top 60 were all labeled yes.
  - Of 15 proposals that the new "if" filter removed from the list, 12 were labeled no and 3 yes.
- The samples are small, so treat these numbers as rough.

## Limitations

- **Proposals opened on or after 2026-01-25 have no add-on question.** The template changed that day, so these show as "No answer". Panner does not guess from the proposal text.
- **"Archived" also contains invalid proposals and old duplicates.** Proposals closed before GitHub had a duplicate close reason were archived like any other. Check the proposal before you start building.
- **The classification reads what the author wrote**, not what is technically possible. An author can be wrong, and the rules can misread an answer. Treat it as a starting list, not a verdict.
- **The weekly update can stop.** GitHub may disable scheduled workflows in public repositories after 60 days without repository activity. It is not yet known whether the bot's weekly data commits count as activity. If the data stops updating, re-enable the workflow in the Actions tab or run it manually.

## Data

- `data/raw/<number>.json` keeps one file per proposal: metadata, vote counts and the two template answers (each cut at 2,000 characters). The full proposal text is **not** stored in this repository; it stays in a local, git-ignored cache (`data/bodies/`).
- Proposal text belongs to its authors on GitHub. Panner only shows short excerpts of the template answers and links back to the original issue.
- Panner never writes to GitHub: no comments, reactions or issues.

## Run it locally

Requires Node.js 22 or later.

```sh
npm ci
npm run check            # type check + tests
npm run dev              # build screen data from data/raw and start the dev server
npm run build            # production build into dist/
```

Collecting data needs a GitHub token. A fine-grained token with read-only access to public repositories is enough:

```sh
export GITHUB_TOKEN=...          # PowerShell: $env:GITHUB_TOKEN = "..."
npm run sync -- --limit 20       # first 20 proposals only (does not write data/state.json)
npm run sync                     # full sync (about 250 pages, a few minutes)
npm run sync -- --reparse        # re-extract answers from the local cache, no network
```

Precision tools:

```sh
npm run label   # label the default view's top 30 that are not in data/golden.json yet
npm run eval    # precision of the top 30 (exit 1 below 70%, exit 2 when labels are missing)
```

On Windows PowerShell with a restricted execution policy, use `npm.cmd` instead of `npm`.

## Deployment

Two GitHub Actions workflows are included:

- `.github/workflows/ci.yml` runs `npm ci`, `npm run check` and `npm run build` on every push and pull request.
- `.github/workflows/sync.yml` runs every Monday at 03:17 KST (Sunday 18:17 UTC) and on demand. It collects, checks, builds, commits changed data as `data: weekly sync`, and deploys `dist/` to GitHub Pages.

To publish your own copy:

1. In the repository settings, under **Pages**, set the source to **GitHub Actions**.
2. Optionally add a `PANNER_TOKEN` secret. Without it, the default Actions token is used, which is enough: a full sync costs about 250 of its 1,000 GraphQL points per hour.
3. Run **Weekly sync** once from the Actions tab.

Design notes and the reasons behind each decision are in `docs/SPEC.md` and `docs/DECISIONS.md`.

## License

[MIT](LICENSE)
