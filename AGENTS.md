# Agents

Cell studio: a minimal music language where everything is a cell, as a browser app (Svelte, TypeScript, Tone.js) whose code editor and graph are two views of one text. **Start with [docs/MEMORY.md](docs/MEMORY.md)** (project knowledge, cheatsheet, decisions); [docs/INDEX.md](docs/INDEX.md) lists every page.

## Find things

- **Work:** open issues (labels `language` `audio` `ui` `bug` …; epics in [docs/roadmap.md](docs/roadmap.md)); rough edges that are documented, not tracked, in [docs/limits.md](docs/limits.md).
- **Code:** `docs/architecture.md` says what lives where and how data flows; the `docs/language/` pages say what each attribute means.
- **Tools:** `npm test` (vitest), `npm run check` (svelte-check), `npm run smoke` (every piece started in a real browser, a set covering every kind of sound played), the `profile` skill (main-thread load), the `wheels` skill (a contact sheet of every wheel), `window.cellStudio.measure` (loudness). [docs/testing.md](docs/testing.md).

## Checks

CI runs `check`, `test` and `build` on every PR; it is the gate. The smoke test (every piece started in a browser, a covering set played) runs only on the PR labelled `candidate`, the one about to be merged ([testing.md](docs/testing.md)). Before pushing run `npm test && npm run check`. While iterating, run one file: `npx vitest run src/engine/parser.test.ts`. Don't run `build` or the full smoke test locally unless you changed what they cover (`vite.config.ts`, `index.html`, assets, audio or UI wiring: then `npm run build && npm run smoke -- 2 "<a piece>"`). Don't repeat what CI repeats.

## Rules

Enforced (a failing test or CI says so): `engine/` and `layout/` stay pure TS, no DOM, Tone, Svelte, `audio/` or `ui/` imports; docs' ```` ```cells ```` blocks compile and `docs/INDEX.md` lists every page; every example compiles with a title, tags and `level=`; Shorten preserves every note.

Judgment (nothing checks these; you do):
- The code (text) is the single source of truth; every graph edit rewrites a cell's line (`src/engine/edit.ts`).
- Theme values come from `src/app.css` and `src/ui/theme.ts` only.
- A user-visible change adds a line under *Unreleased* in `CHANGELOG.md`; mention changes that could affect saved `.cells` pieces.
- Facts live in one place; other places link.

## Working

- Work on the branch the session gives you (otherwise `issue-<n>-<slug>`); never push to `main`; **agents don't merge**. Open a PR (`Closes #n`, the template: what and why, how verified, follow-ups). One issue per PR.
- For anything audible, visual or about speed, say how you verified it (a test, `cellStudio.measure`, the profile skill, a screenshot). Unverified is fine if you say so.
- **Just do, no comment:** typos, nits, a local rename, an added test, fixing CI that you broke. **Do and say in the PR:** a fix beside your change that it needs. **File an issue instead of widening the PR:** anything out of scope you notice. **Stop, push back, recommend:** a change to the layering or the source-of-truth rule, anything that could break saved `.cells` pieces or change how an existing example sounds, a scope far beyond the issue, anything irreversible or outward-facing.
- Notes and messages between agents go on the issue. A long thread or handover gets `docs/notes/<issue-or-topic>.md` ([conventions](docs/notes/README.md)); a decision with a rationale gets `docs/decisions/NNN-slug.md` and a one-line entry in `docs/MEMORY.md`.
- Triage, review and merging of PRs: the **`senior`** skill (`.claude/skills/senior/SKILL.md`), with the owner's approval.
