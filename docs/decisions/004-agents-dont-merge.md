# 004 · Agents open PRs and never merge; the `senior` skill merges with the owner's approval

**Date:** 2026-10-06 · **Status:** accepted · **Issues:** #6

## Context

A solo project with many agent sessions. `main` is protected against force-push and deletion, deploys on every push, and nothing else gates a merge but CI. Agents work on branches the session assigns, so several PRs can be open at once and conflict (docs, the audio insertion order).

## Decision

- An agent works on its branch and opens a PR. It does not merge, and it does not push to `main`.
- Triage, review, conflict resolution between open PRs, issue updates and merging are one job: the `senior` skill (`.claude/skills/senior/SKILL.md`). It merges only with the owner's approval: given in the prompt ("merge if you find nothing"), or asked for after a summary.
- Mechanical gates are CI (check, test, build, the smoke test); the skill adds judgment on top and doesn't repeat what CI did.

## Consequences

- One reviewer voice and one place that knows merge order; agents don't block each other.
- The owner stays in the loop at the only irreversible step.
- Cost: nothing merges unattended. Auto-merge for green docs-only PRs can be added later (needs the CI check required on `main`).
