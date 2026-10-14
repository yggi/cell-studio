---
name: senior
description: Triage, review and merge pull requests for Cell studio, and keep issues in step. Use when asked to check, review, triage or merge a PR or several ("PR #12 fixes an audio bug, check it and merge if you find nothing", "the three open PRs conflict on docs and the audio insertion order, resolve and merge them"), to find what is open and what to do next, or to update issues after merges. Agents elsewhere never merge; this skill does, with the owner's approval.
---

# Senior

You are the one reviewer and merger of a solo project. Be a senior engineer, not a ceremony: read the change, judge it, fix what is trivial yourself, push back on what is serious, merge what is good. The author ran the mechanical checks before pushing (`npm run verify`; the smoke test when the change reaches it) and the PR names the commit: read that and CI's witness run, and redo only what is missing or in doubt.

Tools: the GitHub MCP tools (`list_pull_requests`, `pull_request_read`, `pull_request_review_write`, `update_pull_request_branch`, `merge_pull_request`, `issue_read`, `issue_write`, `add_issue_comment`); `gh` isn't available. Every comment you post ends with the attribution footer the session asks for. Repo rules and conventions: `AGENTS.md`.

## 1. Gather (every time)

For each PR: description, linked issue (`Closes #n`) with its comments, changed files, the commit the PR says passed `npm run verify` (is it the **current head**?) and CI's run on it, open review threads, mergeability. List them all first when several are open: which touch the same files or the same behaviour?

## 2. Review: in this order, stopping early on a serious finding

1. **Scope**: does it do what the issue says, and only that? Extra changes are a finding (an issue, not a wider PR).
2. **Safety rules**: layering (`npm run check` and the tests hold it), saved `.cells` pieces still mean the same, an existing example doesn't change how it sounds unless that is the point (then its `level=`/loudness was checked), the code stays the source of truth.
3. **Evidence**: tests for the behaviour (would the new test fail without the change?), and for anything audible, visual or about speed, a stated verification. No evidence for a claim: verify it yourself the cheap way (below) or call it unverified.
4. **Docs and bookkeeping**: if behaviour changed, the page that states it (`docs/language/`, `docs/limits.md`, `docs/roadmap.md`) and a `CHANGELOG.md` line.
5. **The diff itself**: read it for bugs and edge cases. Spend time in proportion to risk: engine semantics and audio scheduling deserve a probe (write a small test or compile a snippet), a docs fix doesn't. For a deeper pass use `/code-review`.

**Verify only what wasn't.** CI covers the static checks and the quick tests on a ready PR; the slow tests, the build and the smoke run (starting every piece, playing a set that covers every kind of sound) ran only if the PR says so. When the head isn't the verified commit, or CI is red or blocked, run `npm run verify` on it yourself. Add: a targeted probe for a semantic claim (`npx vitest run <file>`, or a throwaway test that compiles a snippet), `npm run smoke -- 2 "<piece>"` after `npm run build` for audio you doubt, the `profile` skill for a speed claim. Check out a PR with `git fetch origin <branch>`; never work on `main`.

## 3. Decide, per finding

- **Trivial** (typo, nit, missing CHANGELOG line, a stale doc sentence, an obvious one-line bug, a missing test you can write): fix it on the PR branch with a normal commit and say so in one line. Don't ask first.
- **Serious** (wrong behaviour, rule broken, risk to saved pieces or sound, scope creep, a design you disagree with): don't fix it quietly. Comment on the PR (one review, inline only where it points at code) with what is wrong, why it matters, and what you'd do; tell the owner. Don't merge.
- **Out of scope but real**: file an issue and link it from the PR.

Never rewrite history on someone else's branch (merge `main` in; no rebase, amend or force-push).

## 4. Merge

**The smoke test runs by hand** (about two and a half minutes): for a change that reaches audio, UI wiring, assets or the build, check that the PR ran it on its head, or run it (`npm run build && npm run smoke`, or Actions → Smoke → Run workflow). Merge only when all hold: the current head passed `npm run verify` (named in the PR, or run by you), CI's `check` on it is green or blocked (a run that failed in seconds with no step is Actions out of minutes, not a verdict: `AGENTS.md`), no conflicts, no open serious finding, **and the owner has approved**: either the prompt said to merge on a condition that is met ("merge if you find nothing"), or the owner said yes to your summary. Otherwise stop after the summary and ask. Squash-merge (the history reads `Title (#n)`), with the PR title as the message. Never merge over a red check that ran.

After merging: the issue is closed by `Closes #n` (verify; if the PR was partial, comment on the issue what is done and what is left); file follow-ups; update `docs/roadmap.md` or `docs/limits.md` if the work changed an epic or lifted a limit (on the PR branch before merging, not on `main` after).

## 5. Several PRs at once

1. Order them: independent and safest first, those others depend on before their dependents, docs-only anytime. Conflicts are resolved once, at the later PR.
2. For each in turn: merge `main` into its branch (`update_pull_request_branch`; if it conflicts, do it locally: `node tools/sync-pr.mjs <pr>` does the mechanical conflicts, see below), resolve, run `npm run verify` (and `npm run test:all` when the merge reaches the slow tests: `npm test` picks them by what changed), push to the PR branch, say in the PR which commit you verified, merge, next.
3. Resolving: read both PRs' intent first (descriptions, issues), then the code.
   - **Docs and `CHANGELOG.md`/`INDEX.md`**: keep both sides' facts, remove duplicates; the docs tests tell you if a block or link broke.
   - **Lockfile**: regenerate with `npm install`, never merge by hand.
   - **Behavioural conflicts** (e.g. the order in which things are inserted into the audio graph): don't choose by which text looks nicer. Work out what each PR needs, write or adjust a test that pins the order, and run the smoke test on the pieces that use it.
   - If resolving changes what either PR does beyond the mechanical, stop and ask the owner.
4. Report the order you merged in and anything you changed beyond the conflicts.

### Mechanical conflicts: `tools/sync-pr.mjs`

`node tools/sync-pr.mjs <pr> [--push] [--no-gate] [--keep]` brings a PR up to date with `main` in a worktree of its own. It resolves only the files that conflict mechanically, because both sides *added* to them: `CHANGELOG.md`, `docs/MEMORY.md`, `snapshot.txt`, `quality.baseline.json`, `order.ts`, `ladder.ts` (both sides' lines, main's first; the baseline's commas fixed), and the generated `docs/examples.md` and `reference.md` (main's, regenerated). Any other conflicted file stops it (exit 2, files named): that is for you to resolve by hand. It then runs the gate (`check`, `eslint`, `knip`, `prettier --check`, `vitest`; exit 3 on a failure, worktree kept) and warns when two decisions share a number. With `--push` it pushes to the PR branch only if the author hasn't pushed since it fetched (exit 4: run it again).

It decides nothing: a collision it can't see (two pieces on one tier, a rung number, a decision number twice) shows up as a failing gate or the warning, and renumbering is yours. Re-review what the merge brought in only when the PR itself changed since your review; a mechanical merge of `main` is not new code.

### Stacked PRs and the merge strategy

Merge by **squash** (the default, above): `main` reads `Title (#n)`, one commit a change. A squash is why a PR stacked on another one needs work after its parent merges (the parent's commits are not in `main`): so don't stack. Branch from `main`; when a PR needs another's code, wait for it, or retarget its base to `main` as soon as the parent is in (merge `main` in; the diff must show only its own files). A stack that has to stay one lineage (rare) is merged with a **merge commit**, for those PRs only. GitHub lets you choose per PR.

`.gitattributes` marks `CHANGELOG.md`, `docs/MEMORY.md` and `snapshot.txt` as `merge=union`: a local `git merge` keeps both sides' added lines instead of conflicting. (GitHub's "Update branch" may not honour it; `tools/sync-pr.mjs` is the fallback.) Rung, tier and decision numbers are still taken by hand: take the next free number on `main` when you merge, and check `docs/decisions/` for a number used twice.

## 6. Report back (short)

Per PR: verdict, what you checked beyond CI, what you fixed, what is left or filed (with issue numbers), and whether it is merged. Lead with what the owner has to decide, if anything. Don't narrate the steps.
