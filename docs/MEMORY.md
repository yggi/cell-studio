# Memory

Entrypoint for humans and agents: slow-change, shared knowledge about Cell studio, and a cheatsheet for the details in `docs/`. The full hierarchy is [INDEX.md](INDEX.md). Ephemeral notes belong on the issue; see [notes/](notes/README.md).

## The project

A minimal language for music where everything is a **cell**: a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid. A browser app (Svelte, TypeScript, Tone.js) with a code editor and a graph that are two views of the same text. Built as a PWA (manifest, service worker, relative `base`): installable on Android and desktop, offline after the first visit; Tone is a lazily loaded chunk.

## The family

- The music projects share a hub, [yggi/music-commons](https://github.com/yggi/music-commons): an atlas, a charter, a glossary, and contracts with vectors (cells' `euclid` is Bjorklund's set there, a turn of Jambot's).
- **[Jambot](https://github.com/yggi/jambot)** is a cybernetic bandleader for live events: left alone it plays an endless jam; when people join, its **Muse** hears their motifs and the band takes them up; it writes a score and plays it out as MIDI or through a small synth. Cell studio started as a spike out of it, to research and define the language.
- **The direction** (the owner, 14 Oct 2026): back together, towards *eternal jam sessions*. Cells becomes Jambot's score language and its engine Jambot's player, from a core of its own, **[yggi/cells](https://github.com/yggi/cells)**, which this app and Jambot consume at a tag ([yggi/cells#1](https://github.com/yggi/cells/issues/1)); Jambot stays the composer, driven by a **style vector**; the Muse writes cell fragments to a shared repository. The shape, what Jambot has that we don't, how to read it and where its words differ (`^`, `_`, `shift`, `cycle=`, Euclid's rotation, accents: check a form against both before porting it): [notes/eternal-jam.md](notes/eternal-jam.md); the live thread is the handshake, #406 (decisions on [yggi/jambot#309](https://github.com/yggi/jambot/issues/309)).
- **What we took from it**: the MIDI layer, the keys, pads and roll pointer, the MIDI clock, lifted at 8cdb6b8 (#203); each file's header names its source. The MIDI layer is [yggi/webmidi](https://github.com/yggi/webmidi)'s now, shared with Jambot (yggi/webmidi#3).

## Working here

Commands, the rules, the PR conventions and what an agent may decide alone are in [../AGENTS.md](../AGENTS.md); how the tests and CI fit together, and a PR's draft until it is ready, in [testing.md](testing.md). A release: bump `version` in `package.json`, gather *Unreleased* and `changes/` under a new heading (`npm run changelog -- gather X.Y.Z`), tag `vX.Y.Z`.

## Gates

Gates that show themselves only by failing, each with its fix in [testing.md](testing.md): the strictness ratchet (`tools/strict.mjs`), knip, the docs test, the examples page (`npm run docs:examples`), the layout baseline (`UPDATE_LAYOUT_BASELINE=1`), the layering and `Math.random` scans, the golden graph's coverage (`tools/gallery/golden/golden.test.ts`), the boot reading's 28 KB (`tools/reading-list.test.ts`; condense as a change of its own); and the pre-push hook, which blocks a push until `npm run verify` passes.

## Map of src/

- `@yggi/cells` (the package, not a folder here): the language, parse, compile, realize (plan → events), edit, Shorten, physics, FM, the examples and the MIDI corpus; the app gets an index of the examples at build time and loads sources on demand → [architecture.md](architecture.md)
- `@yggi/webmidi` (the package, `github:yggi/webmidi#v0.2.1`): the family's MIDI layer, `core`, `web`, `ui` (the MIDI page's components) and `testing` (the fake Web MIDI, for tests only); its changelog says what moving the pin changes → [architecture.md](architecture.md)
- `layout/` pure layout of the graph, the library, wheels, labels
- `audio/` player, engine (local or Web Worker), voices (parts in `audio/voice/`), clock, offline render
- `midi/` a played note as webmidi's `OutNote` (`played.ts`), and the tests' fake Web MIDI → [ui/midi.md](ui/midi.md)
- `ui/` Svelte components; `App.svelte`, `library.ts`, `theory/`
- `tools/` generators (Python) and profiling scripts → [testing.md](testing.md)

## The language

The cells language is its own repository, [yggi/cells](https://github.com/yggi/cells), which this app depends on at a pinned tag (`@yggi/cells` in package.json, `github:yggi/cells#v0.19.0`). Its cheatsheet, its pages (`docs/language/`), its examples and its decisions about the language are there: start with [its MEMORY.md](https://github.com/yggi/cells/blob/main/docs/MEMORY.md). A change to what the language means is a pull request there; this app takes it by moving the pin.
The cells language is its own repository, [yggi/cells](https://github.com/yggi/cells), which this app depends on at a pinned tag (`@yggi/cells` in package.json, `github:yggi/cells#v0.16.0`). Its cheatsheet, its pages (`docs/language/`), its examples and its decisions about the language are there: start with [its MEMORY.md](https://github.com/yggi/cells/blob/main/docs/MEMORY.md). A change to what the language means is a pull request there; this app takes it by moving the pin, with `npm install @yggi/cells@github:yggi/cells#vX.Y.Z` (an edit of package.json can leave the lockfile installing the old tag: `tools/pins.test.ts`, #546).

## Decisions

Each in a few words; its line, with the substance, is in [decisions/README.md](decisions/README.md), and the record has the rationale. The language's decisions (002, 003, 006–010, 012, 013, 015–020, 023, 026–033) are yggi/cells', with their numbers: [its list](https://github.com/yggi/cells/blob/main/docs/decisions/README.md).

- 001 · The wiki is dropped; `docs/` is the project memory · → decisions/001-no-wiki.md
- 004 · Agents open PRs and never merge; the `senior` skill merges with the owner's approval · → decisions/004-agents-dont-merge.md
- 005 · The audio context is `balanced`; the pictures show what is heard · → decisions/005-balanced-latency-and-heard-pictures.md
- 011 · `show=` wheels beyond the language are plugins, built in or a piece's own · → decisions/011-plugins.md
- 014 · A splice is a bulb on its braid's track · → decisions/014-splices-are-bulbs.md
- 021 · One rule for every sub-wheel: a part of a cell is a bulb on it · → decisions/021-tape-heads.md
- 022 · A gate sends notes, the sound leaves from the voice · → decisions/022-gates-send-notes.md
- 024 · A resonator is drawn as its body · → decisions/024-resonator-bodies.md
- 025 · A MIDI file opens as it is, its text in the editor · → decisions/025-midi-documents.md
- 034 · A MIDI file's graph is its machine; Convert to cells replays the fold · → decisions/034-midi-machine.md
- 035 · Labels sit on what they name · → decisions/035-labels.md
- 036 · White where another value would mean nothing · → decisions/036-one-value-is-white.md
- 037 · One frame of four slots that make room, never cover · → decisions/037-one-frame.md
- 038 · A `use` line's cells are a cluster named by its line · → decisions/038-use-groups.md
- 039 · Cell studio sounds what a MIDI card sends (superseded by cells 064) · → decisions/039-midi-cards-heard.md
- 040 · The MIDI page is webmidi's patchbay · → decisions/040-patchbay.md
- 069 · A module is one wheel, its jacks on the rim · → decisions/069-module-wheels.md

## Where things are tracked

- Open work: the GitHub issues; the target and the epics in [roadmap.md](roadmap.md), the path from here in yggi/cells' central roadmap, [yggi/cells#437](https://github.com/yggi/cells/issues/437); rough edges in [limits.md](limits.md).
