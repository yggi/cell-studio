# 004 · Agents open PRs and never merge; the `senior` skill merges with the owner's approval

**Date:** 2026-10-06 · **Status:** accepted · **Issues:** #6

## Context

A solo project with many agent sessions. `main` is protected by a ruleset (below), deploys on every push, and nothing else gates a merge but CI. Agents work on branches the session assigns, so several PRs can be open at once and conflict (docs, the audio insertion order).

## Decision

- An agent works on its branch and opens a PR. It does not merge, and it does not push to `main`.
- Triage, review, conflict resolution between open PRs, issue updates and merging are one job: the `senior` skill (`.claude/skills/senior/SKILL.md`). It merges only with the owner's approval: given in the prompt ("merge if you find nothing"), or asked for after a summary.
- Mechanical gates are CI (check, test, build, the smoke test); the ruleset requires the `check` job, so a PR whose `check` fails can't merge (the `smoke` job is not required); the skill adds judgment on top and doesn't repeat what CI did.

## Consequences

- One reviewer voice and one place that knows merge order; agents don't block each other.
- The owner stays in the loop at the only irreversible step.
- Cost: nothing merges unattended. Auto-merge for green docs-only PRs can be added later (the CI check is now required on `main`).

## The ruleset

Repository ruleset `protect-main` (Settings → Rules), as exported from GitHub on 2026-10-06. This JSON is the ground truth: if the setting and this text differ, fix whichever is wrong and say so here. It forbids deleting `main` and force-pushing it, requires the `check` job of `ci.yml` (job name `check`; `integration_id` 15368 is GitHub Actions), and has no bypass actors, so the owner is bound too.

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
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          {
            "context": "check",
            "integration_id": 15368
          }
        ]
      }
    }
  ],
  "bypass_actors": []
}
```
