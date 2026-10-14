# Agents

Cell studio: a minimal music language where everything is a cell, as a browser app (Svelte, TypeScript, Tone.js) whose code editor and graph are two views of one text. **Start with [docs/MEMORY.md](docs/MEMORY.md)** (project knowledge, cheatsheet, decisions); [docs/INDEX.md](docs/INDEX.md) lists every page.

## Find things

- **Work:** open issues (labels `language` `audio` `ui` `bug` …; epics in [docs/roadmap.md](docs/roadmap.md)); rough edges that are documented, not tracked, in [docs/limits.md](docs/limits.md).
- **Code:** `docs/architecture.md` says what lives where and how data flows; the language's pages (`docs/language/` in [yggi/cells](https://github.com/yggi/cells), which this app depends on) say what each attribute means.
- **Tools:** `npm run verify` (the gate before a push: `check`, `lint`, `format:check`, `knip`, then `npm test`), `npm test` (vitest: the quick tests, and the slow ones only when the change reaches them; `npm run test:all` for every one), `npm run check` (svelte-check), `npm run lint` (ESLint), `npm run format` (Prettier), `npm run knip` (unused code), `npm run smoke` (every piece started in a real browser, a set covering every kind of sound played), the `profile` skill (main-thread load), the `gallery` skill (contact sheets of every wheel and every edge, design mock-ups), the `probe` skill (a design question measured over the whole library), `window.cellStudio.measure` (loudness), `node tools/sync-pr.mjs <pr>` (merge `main` into a PR whose conflicts are mechanical: the `senior` skill). [docs/testing.md](docs/testing.md).

## Checks

**The gate is the checks you run before pushing; CI is a witness.** The PR names the commit that passed them and what ran (*Verified*): that is the evidence a reviewer weighs, with or without a CI run beside it. CI (one job) runs `check`, `lint`, `format:check`, `knip` and the quick tests once per push to a PR that is ready, so keep a PR a draft while you push to it; the slow tests, `build`, the smoke test (every piece started in a browser, a covering set played) and the repeatable renders run by hand or locally ([testing.md](docs/testing.md#run)). No check is required to merge. A run that fails in seconds without a step is Actions blocked (the account's minutes used up), not a verdict: re-run it once when minutes are back ([CI-BUDGET.md](https://github.com/yggi/music-commons/blob/main/CI-BUDGET.md); `node tools/measure/actions.mjs --status yggi/cell-studio` there tells which). `node tools/deploy.mjs` is the deploy (CI doesn't deploy). Before pushing, run the checks your change reaches:
- **Docs only:** `npx vitest run src/docs.test.ts` and `npx prettier --check` on the changed files.
- **Code:** `npm run verify`: `check`, `lint`, `format:check` (`npm run format` fixes it), `knip`, then `npm test`, which picks the slow tests the change reaches.

While iterating, run one file: `npx vitest run src/layout/library.test.ts`. Don't run `build` or the full smoke test locally unless you changed what they cover (`vite.config.ts`, `index.html`, assets, audio or UI wiring: then `npm run build && npm run smoke -- 2 "<a piece>"`, and say so in the PR).

## Rules

Enforced (a failing test or CI says so): `layout/` stays pure TS, no DOM, Tone, Svelte, `audio/` or `ui/` imports (the language, `@yggi/cells`, is pure by its own gate); docs' ```` ```cells ```` blocks compile and `docs/INDEX.md` lists every page; every example compiles with a title and tags, its card's level a `postgain=` (or no card: the built-in one), and Shorten preserves every note (both checked in yggi/cells, where the examples and Shorten live); the code is formatted by Prettier, has no ESLint errors and no unused exports or files (knip).

Judgment (nothing checks these; you do):
- The code (text) is the single source of truth; every graph edit rewrites a cell's line (`engine/edit.ts` in `@yggi/cells`).
- **The language is [yggi/cells](https://github.com/yggi/cells)**, pinned in `package.json` at a tag (`#v0.1.0`): its parser, compiler, engine, examples and MIDI corpus, its docs and its decisions. A change to what the language means is a pull request there, and this app takes it by moving the pin; a change here never edits `node_modules/@yggi/cells`.
- Don't hand-format: Prettier owns whitespace and line breaks (`.prettierrc.json`). A commit that only reformats goes in `.git-blame-ignore-revs`. ESLint opt-outs say why, in `eslint.config.js` or on the line.
- Theme values come from `src/app.css` and `src/ui/theme.ts` only (a plugin carries its own colours in its manifest: [decision 011](docs/decisions/011-plugins.md)).
- A user-visible change adds a line under *Unreleased* in `CHANGELOG.md`; mention changes that could affect saved `.cells` pieces.
- Facts live in one place; other places link.

## Working

- Work on the branch the session gives you (otherwise `issue-<n>-<slug>`); never push to `main`; **agents don't merge**. Open a PR (`Closes #n`, the template: what and why, how verified, follow-ups). One issue per PR. Don't stack PRs; if one is, merge `main` into it (`node tools/sync-pr.mjs <pr>`) as soon as its parent is squashed in, before asking for review (#361: a reviewer can't push to it).
- For anything audible, visual or about speed, say how you verified it (a test, `cellStudio.measure`, the profile skill, a screenshot). Unverified is fine if you say so.
- **Just do, no comment:** typos, nits, a local rename, an added test, fixing CI that you broke. **Do and say in the PR:** a fix beside your change that it needs. **File an issue instead of widening the PR:** anything out of scope you notice. **Stop, push back, recommend:** a change to the layering or the source-of-truth rule, anything that could change how an existing example sounds (saved `.cells` pieces don't bind the language until the first release: [decision 027](https://github.com/yggi/cells/blob/main/docs/decisions/027-on-top-of-strudel.md)), a scope far beyond the issue, anything irreversible or outward-facing.
- Notes and messages between agents go on the issue. A long thread or handover gets `docs/notes/<issue-or-topic>.md` ([conventions](docs/notes/README.md)); a decision with a rationale gets `docs/decisions/NNN-slug.md` and a one-line entry in `docs/MEMORY.md`.
- Triage, review and merging of PRs: the **`senior`** skill (`.claude/skills/senior/SKILL.md`), with the owner's approval.
