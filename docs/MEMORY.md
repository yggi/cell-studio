# Memory

Entrypoint for humans and agents: slow-change, shared knowledge about Cell studio, and a cheatsheet for the details in `docs/`. The full hierarchy is [INDEX.md](INDEX.md). Ephemeral notes belong on the issue; see [notes/](notes/README.md).

## The project

A minimal language for music where everything is a **cell**: a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid. A browser app (Svelte, TypeScript, Tone.js) with a code editor and a graph that are two views of the same text. Built as a PWA (manifest, service worker, relative `base`): installable on Android and desktop, offline after the first visit; Tone is a lazily loaded chunk.

## Working here

Commands, the rules (which are enforced and which are judgment), the PR conventions and what an agent may decide alone are in [../AGENTS.md](../AGENTS.md); how the tests and CI fit together is in [testing.md](testing.md). A release: bump `version` in `package.json`, move the *Unreleased* entries of `CHANGELOG.md` under a new heading, tag `vX.Y.Z`.

## Pull requests: draft until ready

- **Complex work starts as a draft PR**, opened early, so others see what is being done and where it will touch their work.
- **A PR goes back to draft whenever you start putting more work on top of one that is already open**, your own or another one (a follow-up commit, a merge of main with conflicts, a rework after review). Don't leave a PR "ready" while it is moving.
- **A PR is out of draft only when it is ready to be merged**: checks green, description and CHANGELOG up to date, nothing left on your side. Then it can be reviewed and merged ([testing.md](testing.md)).

## Map of src/

- `engine/` parse, compile, realize (plan → events), edit, Shorten, physics, FM, presets (reads `examples/*.cells`; the app gets an index at build time and loads sources on demand) → [architecture.md](architecture.md)
- `layout/` pure layout of the graph, the library, wheels, labels
- `audio/` player, engine (local or Web Worker), voices (parts in `audio/voice/`), clock, offline render
- `ui/` Svelte components; `App.svelte`, `library.ts`, `theory/`
- `tools/` generators (Python) and profiling scripts → [testing.md](testing.md)

## Language cheatsheet

Details are on the linked pages; this list is only a pointer. → [language/overview.md](language/overview.md); every form at once: [language/reference.md](language/reference.md) (generated from the parser)

- `&name … ` one cell per line; steps `0 2 ~ 4@2 0!4 [0,2,4]` → [cell](language/cell.md)
- `scan(…)` `euclid(k,n)` `sin(n)`; `&t[i]` `&t[a:b]` `&t[<<n]` `&t^n` → [braid](language/braid.md)
- `over=&t` `scale(tonic,phase)` `shift=n` `cycle=n` → [tables](language/tables.md)
- `step=` `loop=` (rates, `&x`, `cycle(&x)`, `*n` `/n`), `stride=`, `laps=` → [time](language/time.md)
- `map=edo|ed(r)|ratios`, note names → [tuning](language/tuning.md)
- `free(default, lo..hi)` → [free](language/free.md)
- `[a * &voice, …]` mixes (sorts, `+` `*` commute), `map=sample` → [mix](language/mix.md)
- voices `s=` `loop=`, `env=` `pitch=` `map=adsr|amp|lin|db` → [sound](language/sound.md)
- belts, tape, resonators, FM → [physics](language/physics.md)
- `title=` `tags=` `label=` `show=` `level=` → [display](language/display.md)

## Decisions

One line each; the record has the rationale. → [decisions/](decisions/README.md)

- 001 · The wiki is dropped; `docs/` is the project memory · → decisions/001-no-wiki.md
- 002 · `scale(tonic, phase)` stays as shorthand for two unnamed cells · → decisions/002-scale-shorthand.md
- 003 · `cycle=n` has one job; grids say `map=edo` · → decisions/003-cycle-one-job.md
- 004 · Agents open PRs and never merge; the `senior` skill triages, reviews and merges with the owner's approval · → decisions/004-agents-dont-merge.md
- 005 · The audio context is `balanced` (not `playback`, not yet `interactive`), and the pictures show what is heard · → decisions/005-balanced-latency-and-heard-pictures.md
- 006 · The mix algebra: a factor's sort (pitch, volume, signal) comes from the cell, not its place; `+` and `*` commute; numbers are semitones in a sum, a gain in a product · → decisions/006-mix-algebra.md
- 007 · `pan=` is back, a balance in dough's sense, compiled into the channel gains; two chords on the sound card stay valid · → decisions/007-pan-is-back.md

## Where things are tracked

- Open work: the GitHub issues; big jobs in [roadmap.md](roadmap.md); rough edges in [limits.md](limits.md).
- Gotcha: never `pkill -f "<pattern>"` from the agent shell when the pattern also appears in the command line itself; it kills the shell. Use the PID or a port check.
