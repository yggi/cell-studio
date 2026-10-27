# 004 · Agents open PRs and never merge; the `senior` skill merges with the owner's approval

**Date:** 2026-10-06 · **Status:** accepted · **Issues:** #6

## Context

A solo project with many agent sessions. `main` is protected by a ruleset (below) and deployed by each merge (`deploy.yml` runs `node tools/deploy.mjs`, #481); a merge is gated by the checks run before the push, which the PR names, with CI as their witness ([testing.md](../testing.md#run)). Agents work on branches the session assigns, so several PRs can be open at once and conflict (docs, the audio insertion order).

## Decision

- An agent works on its branch and opens a PR. It does not merge, and it does not push to `main`.
- Triage, review, conflict resolution between open PRs, issue updates and merging are one job: the `senior` skill (`.claude/skills/senior/SKILL.md`). It merges only with the owner's approval: given in the prompt ("merge if you find nothing"), or asked for after a summary.
- Mechanical gates are `npm run verify` before every push, named in the PR, and CI's one job on a ready PR as their witness (the smoke test and the slow tests by hand, when a change reaches them). No check is required to merge: a required check that Actions can't run (its minutes used up) would stop every merge. The skill adds judgment on top and doesn't repeat what was verified.

## Consequences

- One reviewer voice and one place that knows merge order; agents don't block each other.
- The owner stays in the loop at the only irreversible step.
- Cost: nothing merges unattended. Auto-merge for docs-only PRs would need a required check, which a month without Actions minutes would block.

## The ruleset

Repository ruleset `protect-main` (Settings → Rules), as read from GitHub on 2026-10-14. This JSON is the ground truth: if the setting and this text differ, fix whichever is wrong and say so here. It forbids deleting `main` and force-pushing it, and has no bypass actors, so the owner is bound too. It requires no status check: the `check` of `ci.yml` was required until 2026-10-10, when Actions was blocked for the rest of the month (#300) and the requirement came off; it stays off, since the gate is the verify before the push.

```json
{
  "id": 24564953,
  "name": "protect-main",
  "target": "branch",
  "source_type": "Repository",
  "source": "yggi/cell-studio",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "exclude": [],
      "include": [
        "~DEFAULT_BRANCH"
      ]
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    }
  ],
  "bypass_actors": []
}
```
