---
name: land
description: Land a Cell studio pull request that the senior skill has reviewed and the owner has approved - merge it by squash, update main, deploy with node tools/deploy.mjs and check that the live site serves the new build. Use when asked to merge and deploy a pull request, or after a merge that has not been deployed yet.
---

# Land a pull request

Agents don't merge ([decision 004](../../../docs/decisions/004-agents-dont-merge.md)): this skill runs only on the owner's approval, after the `senior` skill's review found nothing serious.
The deploy is by hand (nothing deploys on a push), so whoever merges deploys, from a clone or in Actions (Deploy → Run workflow), and the site at <https://yggi.github.io/cell-studio/> plays what `main` holds.
Do the steps in order and stop at the first that fails.

Lifted from yggi/jambot .claude/skills/land/SKILL.md @ ef79048.

1. **The pull request is ready.**
   It is out of draft, and its *Verified* names its current head as the commit that passed the pre-push hook (`pre-push: <commit> passed npm run verify: <n> tests passed`), and the smoke test (`npm run build && npm run smoke`) where the change reaches audio, UI wiring, assets or the build.
   It has no conflicts with `main` (`node tools/sync-pr.mjs <pr>`, the `senior` skill), and CI's `check` on the head is green or blocked, never red.
2. **The owner has approved.**
   In the prompt ("merge if you find nothing", and nothing was found), or as a yes to the senior skill's summary.
   Otherwise stop and ask.
3. **Merge it by squash**, the pull request's title as the message, so `main` reads `Title (#n)`: `merge_pull_request` with `merge_method: "squash"`.
   A merge commit only for a stack that has to stay one lineage, as the senior skill's "Stacked PRs and the merge strategy" allows.
4. **The issues**, before the deploy (GitHub acts only on a `Closes #n` in this repository; the rest is by hand):
   1. **Closed as said:** every `Closes #n` in the merged pull request closed its issue (`issue_read`).
      One that didn't (an issue in another repository, a typo) is closed by hand, `state_reason: completed`, with a comment naming the pull request (`yggi/cell-studio#<pr>`).
   2. **Ticked:** a `Part of #n` epic's checklist line for this pull request is ticked (`- [x] … (#<pr>)`); an epic with no line for it gets one comment naming what landed.
   3. **Follow-ups filed:** each line of the pull request's *Not done / follow-ups* that names work becomes an issue (the `task` template), or links the one it already is, in the repository where it belongs: a question about what the language means or how it's spelled in yggi/cells, the workbench's here.
   4. **References right:** an issue or pull request the merged pull request names in another repository by a bare number is written `yggi/<repo>#n`, in its description and in the comments this step writes (a bare `#n` is always this repository's).
5. **Update `main`.**
   `git fetch origin main && git checkout main && git merge --ff-only origin/main`, in a clone whose tree is clean (the deploy refuses one with changes).
6. **Deploy.**
   `node tools/deploy.mjs` from `main`, as a background task (it runs `test:all` and a fresh build: minutes); or, with no clone at hand, Actions → Deploy → Run workflow (`deploy.yml`: the same script on `main`).
   It refuses a tree with changes or a HEAD that isn't `origin/main`, runs every check, builds `dist/` and publishes it to gh-pages ([testing.md](../../../docs/testing.md#run)).
7. **Check the live site.**
   `CHROME_PATH=/opt/pw-browsers/chromium node tools/live.mjs` (`CHROME_PATH` only in a cloud session): it waits until <https://yggi.github.io/cell-studio/> loads the module script of the `dist/index.html` just deployed (every 10 s, up to 10 min), then opens the page in Chromium and fails on any console error or uncaught exception.
8. **Say so** in a comment on the pull request: the commit deployed and the last lines `node tools/deploy.mjs` and `node tools/live.mjs` printed.
   The issues were step 4.

If the deploy or the live check fails, the merge stands: fix forward on a new branch, and say on the pull request that `main` and the site differ.
