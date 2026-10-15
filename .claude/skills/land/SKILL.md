---
name: land
description: Land a Cell studio pull request that the senior skill has reviewed and the owner has approved - merge it by squash, update main, deploy with node tools/deploy.mjs and check that the live site serves the new build. Use when asked to merge and deploy a pull request, or after a merge that has not been deployed yet.
---

# Land a pull request

Agents don't merge ([decision 004](../../../docs/decisions/004-agents-dont-merge.md)): this skill runs only on the owner's approval, after the `senior` skill's review found nothing serious.
The deploy is by hand (CI doesn't deploy), so whoever merges deploys, and the site at <https://yggi.github.io/cell-studio/> plays what `main` holds.
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
4. **Update `main`.**
   `git fetch origin main && git checkout main && git merge --ff-only origin/main`, in a clone whose tree is clean (the deploy refuses one with changes).
5. **Deploy.**
   `node tools/deploy.mjs` from `main`, as a background task (it runs `test:all` and a fresh build: minutes).
   It refuses a tree with changes or a HEAD that isn't `origin/main`, runs every check, builds `dist/` and publishes it to gh-pages ([testing.md](../../../docs/testing.md#run)).
6. **Check the live site.**
   `CHROME_PATH=/opt/pw-browsers/chromium node tools/live.mjs` (`CHROME_PATH` only in a cloud session): it waits until <https://yggi.github.io/cell-studio/> loads the module script of the `dist/index.html` just deployed (every 10 s, up to 10 min), then opens the page in Chromium and fails on any console error or uncaught exception.
7. **Say so** in a comment on the pull request: the commit deployed and the last lines `node tools/deploy.mjs` and `node tools/live.mjs` printed.
   Then the senior skill's "After merging": the issue closed, or what is left said on it, and the follow-ups filed.

If the deploy or the live check fails, the merge stands: fix forward on a new branch, and say on the pull request that `main` and the site differ.
