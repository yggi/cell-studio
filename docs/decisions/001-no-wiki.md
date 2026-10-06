# 001 · The wiki is dropped; docs/ is the project memory

**Date:** 2026-10-06 · **Status:** accepted · **Issues:** #5, #6

## Context

The plan was an internal GitHub wiki for development notes, decision records, persistent memory and agent handovers. The wiki is a separate git repo (`<repo>.wiki.git`). The cloud agent's credential and tool scope do not cover it (`add_repo` answers "no access", even after the wiki was created), so agents can neither read nor write it.

## Decision

Everything lives in `docs/` in the main repo, reviewed through PRs:

- `docs/MEMORY.md` — the entrypoint and slow-change shared knowledge, with one-line decisions.
- `docs/decisions/` — detailed decision records (this directory).
- `docs/notes/` — one file per thread; handovers.
- Issues are the main surface for ephemeral notes and inter-agent communication.

## Consequences

- Agent memory is versioned with the code and visible in PRs.
- Merge conflicts are avoided by one-file-per-thread notes and a rarely edited `MEMORY.md`.
- No GitHub-wiki features (search, separate permissions); `docs/INDEX.md` and the structure test replace the wiki's index.
