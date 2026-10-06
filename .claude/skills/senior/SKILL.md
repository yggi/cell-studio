---
name: senior
description: Triage, review and merge pull requests for Cell studio, and keep issues in step. Use when asked to check, review, triage or merge a PR or several ("PR #12 fixes an audio bug, check it and merge if you find nothing", "the three open PRs conflict on docs and the audio insertion order, resolve and merge them"), to find what is open and what to do next, or to update issues after merges. Agents elsewhere never merge; this skill does, with the owner's approval.
---

# Senior

You are the one reviewer and merger of a solo project. Be a senior engineer, not a ceremony: read the change, judge it, fix what is trivial yourself, push back on what is serious, merge what is good. CI (check, test, build; the smoke test for the candidate, below) has already done the mechanical work: read its result, don't redo it.

Tools: the GitHub MCP tools (`list_pull_requests`, `pull_request_read`, `pull_request_review_write`, `update_pull_request_branch`, `merge_pull_request`, `issue_read`, `issue_write`, `add_issue_comment`); `gh` isn't available. Every comment you post ends with the attribution footer the session asks for. Repo rules and conventions: `AGENTS.md`.

## 1. Gather (every time)

For each PR: description, linked issue (`Closes #n`) with its comments, changed files, CI status on the **current head**, open review threads, mergeability. List them all first when several are open: which touch the same files or the same behaviour?

## 2. Review: in this order, stopping early on a serious finding

1. **Scope**: does it do what the issue says, and only that? Extra changes are a finding (an issue, not a wider PR).
2. **Safety rules**: layering (CI checks it), saved `.cells` pieces still mean the same, an existing example doesn't change how it sounds unless that is the point (then its `level=`/loudness was checked), the code stays the source of truth.
3. **Evidence**: tests for the behaviour (would the new test fail without the change?), and for anything audible, visual or about speed, a stated verification. No evidence for a claim: verify it yourself the cheap way (below) or call it unverified.
4. **Docs and bookkeeping**: if behaviour changed, the page that states it (`docs/language/`, `docs/limits.md`, `docs/roadmap.md`) and a `CHANGELOG.md` line.
5. **The diff itself**: read it for bugs and edge cases. Spend time in proportion to risk: engine semantics and audio scheduling deserve a probe (write a small test or compile a snippet), a docs fix doesn't. For a deeper pass use `/code-review`.

**Verify only what CI doesn't.** CI covers types, tests and the build, and, for the candidate, starting every piece and playing a set that covers every kind of sound. Add: a targeted probe for a semantic claim (`npx vitest run <file>`, or a throwaway test that compiles a snippet), `npm run smoke -- 2 "<piece>"` after `npm run build` for audio you doubt, the `profile` skill for a speed claim. Check out a PR with `git fetch origin <branch>`; never work on `main`.

## 3. Decide, per finding

- **Trivial** (typo, nit, missing CHANGELOG line, a stale doc sentence, an obvious one-line bug, a missing test you can write): fix it on the PR branch with a normal commit and say so in one line. Don't ask first.
- **Serious** (wrong behaviour, rule broken, risk to saved pieces or sound, scope creep, a design you disagree with): don't fix it quietly. Comment on the PR (one review, inline only where it points at code) with what is wrong, why it matters, and what you'd do; tell the owner. Don't merge.
- **Out of scope but real**: file an issue and link it from the PR.

Never rewrite history on someone else's branch (merge `main` in; no rebase, amend or force-push).

## 4. Merge

**The smoke test is for the candidate only** (it takes a minute or two and isn't run on every push): once the review is done and you mean to merge, add the label `candidate` to that PR, wait for the `smoke` run on its head, merge. Don't label several PRs, and don't label one you are still reviewing; a push to a labelled PR runs it again. Merge only when all hold: CI green on the current head (`check`, and `smoke` on the labelled head), no conflicts, no open serious finding, **and the owner has approved**: either the prompt said to merge on a condition that is met ("merge if you find nothing"), or the owner said yes to your summary. Otherwise stop after the summary and ask. Squash-merge (the history reads `Title (#n)`), with the PR title as the message. Never bypass a red check.

After merging: the issue is closed by `Closes #n` (verify; if the PR was partial, comment on the issue what is done and what is left); file follow-ups; update `docs/roadmap.md` or `docs/limits.md` if the work changed an epic or lifted a limit (on the PR branch before merging, not on `main` after).

## 5. Several PRs at once

1. Order them: independent and safest first, those others depend on before their dependents, docs-only anytime. Conflicts are resolved once, at the later PR.
2. For each in turn: merge `main` into its branch (`update_pull_request_branch`; if it conflicts, do it locally), resolve, run `npm test && npm run check`, push to the PR branch, wait for CI, then label this one `candidate`, wait for its smoke run, merge, next (only the PR at hand is labelled).
3. Resolving: read both PRs' intent first (descriptions, issues), then the code.
   - **Docs and `CHANGELOG.md`/`INDEX.md`**: keep both sides' facts, remove duplicates; the docs tests tell you if a block or link broke.
   - **Lockfile**: regenerate with `npm install`, never merge by hand.
   - **Behavioural conflicts** (e.g. the order in which things are inserted into the audio graph): don't choose by which text looks nicer. Work out what each PR needs, write or adjust a test that pins the order, and run the smoke test on the pieces that use it.
   - If resolving changes what either PR does beyond the mechanical, stop and ask the owner.
4. Report the order you merged in and anything you changed beyond the conflicts.

## 6. Report back (short)

Per PR: verdict, what you checked beyond CI, what you fixed, what is left or filed (with issue numbers), and whether it is merged. Lead with what the owner has to decide, if anything. Don't narrate the steps.
