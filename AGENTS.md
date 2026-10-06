# Agents

Cell studio: a minimal music language where everything is a cell, as a browser app (Svelte, TypeScript, Tone.js) whose code editor and graph are two views of one text. **Start with [docs/MEMORY.md](docs/MEMORY.md)**; [docs/INDEX.md](docs/INDEX.md) is the full hierarchy.

## Commands

    npm test && npm run check && npm run build    # the three CI runs; run before pushing
    npm run dev                                   # vite

## Hard rules

- The code (text) is the single source of truth; every graph edit is a rewrite of a cell's line (`src/engine/edit.ts`).
- `src/engine/` and `src/layout/` stay pure TS: no DOM, no Tone.
- Theme values come from `src/app.css` and `src/ui/theme.ts` only.
- Shorten preserves every note; a change to an example must keep its tests and level check passing.
- Don't push to `main`. Work on a branch, open a PR, CI must be green.
- A change users can see adds a line under *Unreleased* in `CHANGELOG.md`.
- Facts live in one place; other places link. Language docs in `docs/language/` are compiled by `src/docs.test.ts` (```` ```cells ```` blocks must compile; use `cells-fragment` otherwise).

## Workflow

1. Pick an issue; branch `issue-<n>-<slug>`; small PRs that close one issue.
2. Read `docs/MEMORY.md` and the issue with its comments.
3. For anything audible or visual, say how it was verified (a test, a measurement, a screenshot). Performance claims go through `tools/profile/README.md`.
4. Ephemeral notes and agent-to-agent messages go on the issue. A long thread or handover gets its own file `docs/notes/<issue-or-topic>.md` ([conventions](docs/notes/README.md)). Decisions with rationale go to `docs/decisions/`, with a one-line entry in `docs/MEMORY.md`.
