# Memory

Entrypoint for humans and agents: slow-change, shared knowledge about Cell studio, and a cheatsheet for the details in `docs/`. The full hierarchy is [INDEX.md](INDEX.md). Ephemeral notes belong on the issue; see [notes/](notes/README.md).

## The project

A minimal language for music where everything is a **cell**: a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid. A browser app (Svelte, TypeScript, Tone.js) with a code editor and a graph that are two views of the same text. Built as a PWA (manifest, service worker, relative `base`): installable on Android and desktop, offline after the first visit; Tone is a lazily loaded chunk.

## The sibling: Jambot

- **[Jambot](https://github.com/yggi/jambot)** is a cybernetic bandleader for live events: left alone it plays an endless jam; when people join, its **Muse** hears their motifs and the band takes them up. It writes a score and plays it out as MIDI or through a small synth. Cell studio started as a spike out of it, to research and define the language.
- **The direction** (the owner, 14 Oct 2026): back together, towards *eternal jam sessions*. Cells becomes Jambot's score language and its engine Jambot's player, from a core of its own, **[yggi/cells](https://github.com/yggi/cells)**, which this app and Jambot consume at a tag (the extraction: [yggi/cells#1](https://github.com/yggi/cells/issues/1)); Jambot stays the composer, driven by a **style vector**; the Muse writes cell fragments to a shared repository. The shape, where each side stands and the plan: [notes/eternal-jam.md](notes/eternal-jam.md); the live thread is the handshake, #406 (decisions on [yggi/jambot#309](https://github.com/yggi/jambot/issues/309)).
- **What it has that we don't**: the style space (7 axes, genres as points, glides: `packages/engine/src/style.ts`), the composer (form, themes, key, parts), the Muse (a phrase reader with a confidence, a fading motif memory, recognition under operators: `muse.ts`, `packages/theory/src/motifs.ts`), host and client sessions over a lobby (`packages/session`), and a measured bored-to-confusing edge (its #237).
- **What we took from it**: `src/midi/*`, the keys, pads and roll pointer, the MIDI clock, lifted at 8cdb6b8 (#203); each file's header names its source. Who owns them now is a handshake question (#406).
- **Same sigil, different words**: its `^` is an octave, `_` is "no onset", `shift` transposes, `cycle=` is a cell's period, Euclid rotates as its own `even(k,n,shift)`, accents are `* + - .`. Check a form against both before porting it either way.
- **The family**: Jambot, cells and the other music projects (quintenzirkel, play-aeiou, lib-aeiou, flow3r-aeiou, KO-Multitool, ep133-sysex) share a hub, [yggi/music-commons](https://github.com/yggi/music-commons): an atlas, a charter, a glossary, and contracts with vectors (cells' `euclid` is Bjorklund's set there, a turn of Jambot's).
- **Reading it**: add the repository in a cloud session and clone it beside this one; its entry is `AGENTS.md`, then `docs/MEMORY.md`. A pnpm workspace; a pre-push hook runs `pnpm verify`; docs one sentence to a line; its language design is a catalogue of claims with tests (the ratchet), and its score language changes only through the owner.

## Working here

Commands, the rules (which are enforced and which are judgment), the PR conventions and what an agent may decide alone are in [../AGENTS.md](../AGENTS.md); how the tests and CI fit together is in [testing.md](testing.md). A release: bump `version` in `package.json`, move the *Unreleased* entries of `CHANGELOG.md` under a new heading, tag `vX.Y.Z`.

## Pull requests: draft until ready

- **Complex work starts as a draft PR**, opened early, so others see what is being done and where it will touch their work.
- **A PR goes back to draft whenever you start putting more work on top of one that is already open**, your own or another one (a follow-up commit, a merge of main with conflicts, a rework after review). Don't leave a PR "ready" while it is moving.
- **A PR is out of draft only when it is ready to be merged**: its head passed `npm run verify` (the PR names the commit), description and CHANGELOG up to date, nothing left on your side. Each push to a PR out of draft runs CI once. Then it can be reviewed and merged ([testing.md](testing.md)).

## Map of src/

- `engine/` parse, compile, realize (plan → events), edit, Shorten, physics, FM, presets (reads `examples/*.cells`; the app gets an index at build time and loads sources on demand) → [architecture.md](architecture.md)
- `layout/` pure layout of the graph, the library, wheels, labels
- `audio/` player, engine (local or Web Worker), voices (parts in `audio/voice/`), clock, offline render
- `midi/` Web MIDI: access, ports, reading messages, MIDI out and its clock → [ui/midi.md](ui/midi.md)
- `ui/` Svelte components; `App.svelte`, `library.ts`, `theory/`
- `tools/` generators (Python) and profiling scripts → [testing.md](testing.md)

## Language cheatsheet

Details are on the linked pages; this list is only a pointer. → [language/overview.md](language/overview.md); every form at once: [language/reference.md](language/reference.md) (generated from the parser)

- `&name … ` one cell per line; steps `0 2 ~ 4@2 0!4 [0,2,4]` → [cell](language/cell.md)
- `scan(…)` `euclid(k,n)` `sin(n)`; `&t[i]` `&t[$i]` `&t[a:b]` `&t[<<n]` `&t^n` (degrees) `&t^$n` (grid steps) → [braid](language/braid.md)
- `over=&t` `scale(name, tonic)` `shift=n` `cycle=n` → [tables](language/tables.md)
- `step=` `loop=` (rates, `&x`, `cycle(&x)`, `*n` `/n`), `stride=`, `laps=` → [time](language/time.md)
- `map=edo|ed(r)|ratios`, note names → [tuning](language/tuning.md)
- `free(default, lo..hi)`, `free(0 2 4 ~)` a braid, recorded → [free](language/free.md)
- `[a * &voice, …]` mixes (sorts, `+` `*` commute), `map=sample` `postgain=` (its master, linear); a gate `&g play=&tune level=&a*.4 [&lead, &bell]` → [mix](language/mix.md)
- `map=midi` a MIDI card, entries channels; `midi(10)`, `midi(10, 2)` (slot 2) → [midi](language/midi.md)
- voices `s=` `loop=`, `env=` `pitch=` `map=adsr|amp|lin|db` → [sound](language/sound.md)
- belts, tape, resonators, FM → [physics](language/physics.md)
- `title=` `tags=` `label=` `show=`, loudness: the card's `postgain=` (linear); the tutorial: `tags="tutorial"` `tier=n` → [display](language/display.md); a `show=` of the piece's own → [plugins](language/plugins.md)

## Decisions

One line each; the record has the rationale. → [decisions/](decisions/README.md)

- 001 · The wiki is dropped; `docs/` is the project memory · → decisions/001-no-wiki.md
- 002 · `scale(tonic, phase)` stays as shorthand for two unnamed cells (superseded by 013) · → decisions/002-scale-shorthand.md
- 003 · `cycle=n` has one job; grids say `map=edo` · → decisions/003-cycle-one-job.md
- 004 · Agents open PRs and never merge; the `senior` skill triages, reviews and merges with the owner's approval · → decisions/004-agents-dont-merge.md
- 005 · The audio context is `balanced` (not `playback`, not yet `interactive`), and the pictures show what is heard · → decisions/005-balanced-latency-and-heard-pictures.md
- 006 · The mix algebra: a factor's sort (pitch, volume, signal) comes from the cell, not its place; `+` and `*` commute; numbers are semitones in a sum, a gain in a product · → decisions/006-mix-algebra.md
- 007 · `pan=` is back, a balance in dough's sense, compiled into the channel gains; two chords on the sound card stay valid · → decisions/007-pan-is-back.md
- 008 · A turning table comes round after its own length; `cycle=` only when it differs · → decisions/008-tables-come-round.md
- 009 · The tutorial covers every form once (a test checks); `tutorial` a kind of tag (it replaces `basics`), its own cell in the library; its rungs are superseded by 018 · → decisions/009-tutorial-ladder.md
- 010 · A canon's `[<<n]` is a copy (the score replayed); `play= at=` reads what was recorded; a tap of what was played waits for `&<` (#149) · → decisions/010-canon-copies.md
- 011 · The core stays lean: `show=` wheels beyond the language are plugins: the app ships a bundle of built-in ones (the sun first), and a piece can carry its own as a block; a piece's own runs only if the user chose it · → decisions/011-plugins.md
- 012 · A pick is a fixed tap on a turning wheel: `&x[i]` reads the cell as turned (and follows it while it plays), `&x[$i]` as written · → decisions/012-picks-are-taps.md
- 013 · `scale(name, tonic)` is a generator: a fixed mode by name over a key of its own; `shift=` walks its modes, the tonic transposes · → decisions/013-scale-generator.md
- 014 · A splice is a bulb on its braid's track (the ring and its bulbs one curve, the hand bending into them); a cell spliced into one braid only has no node of its own; one read elsewhere is a net-ref, drawn hollow · → decisions/014-splices-are-bulbs.md
- 015 · `&x^n` moves by degrees (`degree(&x, n)`, relative), `&x^$n` by grid steps (absolute, the old `^n`): `$` is the absolute frame · → decisions/015-caret-is-degrees.md
- 016 · Arranging at the input: a section is a tap of the meter's bus, declared by a stepped table of names (`&parts step=&bar &keysBar …`) and switched by the selector (it restarts when switched on; it owns only what its tap steps or loops); the selector of mixes is removed (an error that says what to write); the switch and the gate node stay two mechanisms for now · → decisions/016-arranging-at-the-input.md
- 017 · Two tools: Shorten suggests on the piece being written (shorter, and migrations of removed forms), Normalise converges a corpus to one canonical spelling per duplicate, as a command of its own, never offered while writing · → decisions/017-shorten-and-normalise.md
- 018 · `free(0 2 4 ~)` is a braid left to the performer, a cell's whole braid; its length the frame a take fills; record (a flag on the transport) takes one pass of the armed cell from the keys, quantised through its time map, held until Keep; keys off the table: one setting, allow / snap / ignore, for playing and recording · → decisions/018-free-braid.md
- 019 · MIDI out in the language: a MIDI card, `map=midi`, its entries channels; `midi(c)` one channel, `midi(c, p)` an output slot, the MIDI page's pth output (its device this browser's); a voice only on a card is sent, not heard; a piece with a card sends only what its cards name, one without keeps the default output · → decisions/019-midi-card.md
- 020 · The tutorial is nine stable tiers (`tier=n` on the card, in place of the 30 numbered rungs): a tier's pieces together show all of its forms, a variation is a new file with no renumbering, and the lowest tier has the smallest pieces · → decisions/020-tutorial-tiers.md
- 021 · One rule for every sub-wheel: a cell that is only part of another is drawn on it as a bulb, placed by the host's own coordinate (a splice by its time, a tap in its fan, a kit's voice as its piece of a drum kit, by its name, a tape's read head by `at=` of `length=`; a gate's voices are not part of it and keep their nodes); a tap's and a head's edges leave from the bulb; a tape's head bulbs stay put while the reel turns and turn with the layout's turn of the tape · → decisions/021-tape-heads.md
- 022 · A gate sends notes, the sound leaves from the voice: a gate's (and a product's junction's, an unnamed gate drawn as a small meter) one output is a note bus to its voices; each voice's sound goes into each mix it is in, one wire per mix; drawing only · → decisions/022-gates-send-notes.md
- 023 · A gate is `play=&x` (the notes), `level=&a*&b*n` (one intensity, a product) and what it plays: a voice or a kit, a chord of voices (all), several bare voices (a kit, one picked); the old `trigger=` `velocity=` `gate=` `gain=` still read, Shorten rewrites them · → decisions/023-gate-spelling.md
- 024 · A resonator is drawn as its body: its disc of its material, the body engraved over its mode rings, each exciter its body's element at its turn out to its strand (a bus through the loom, a single strand straight to it) · → decisions/024-resonator-bodies.md
- 025 · A MIDI file opens as it is: its text in the code editor (`engine/miditext.ts`), playing through its notes written out behind the scenes; Convert to cells is an action (its graph: 034) · → decisions/025-midi-documents.md
- 026 · A cell can be a copy of another, changed where it says: `&foo base=&bar =!3 12@2` (`=` keeps a step, `_` before decision 027; a value changes it, `^$n` transposes the copy), resolved when parsed · → decisions/026-base.md
- 027 · Cells sits on top of Strudel: a spelling shared with its mini-notation keeps Strudel's meaning (`[a b]` a subsequence, chords with commas; `?p` drops; `*` on a clock faster; euclid rotates as Strudel's); a clean cut, no compatibility, until the first release · → decisions/027-on-top-of-strudel.md
- 028 · The smallest piece that sounds is `&a loop=A4`: a voice alone plays its own pitch, held (the pitch identity); with no card written, a built-in card (the built-in mixer, master gain .8) hears every sound nothing reads; the blank braid's staircase saw stays · → decisions/028-the-smallest-piece.md
- 029 · A kit read only selects: the product's pitch, volumes and varispeed act on the voice it picks (decision 006's law) · → decisions/029-kits-pass-pitch.md
- 030 · FM: `fm=n` `fmh=r` with Strudel's meanings, a voice's built-in modulator; feedback from a fixed wavetable; operator cells in the algebra (`(&tune + &op) * &carrier`); built with the feedback work · → decisions/030-fm-feedback.md
- 031 · Chance is keyed on the seed, the cell, the lap and the step, not the voice: a respelling keeps its dice · → decisions/031-chance-keyed-on-time.md
- 032 · `restart=` names what switching a part on does to its time: `restart` (default), `resume`, `free`; the last two parse and warn, not yet implemented · → decisions/032-restart-policies.md
- 033 · The folder writes a converted piece in degrees of its key where that's shorter (`&key scale(minor, C)`, lines `over=&key`, phrases `&m^1`); an accidental moves with its note under `^n`; Strudel's `6s`/`7f` and `scale("C:minor")` read as ours · → decisions/033-degrees.md
- 035 · Labels sit on what they name: an edge's on its wire (along it, upright, level where steep, off the wheels), a net's name once on its trunk and each tap's change at its socket on the reader's rim, a name too long for its bulb round its rim, a node's name a pill with what it is under it (round its rim when small and crowded), a belt's along its run · → decisions/035-labels.md
- 034 · A MIDI file's graph is its machine (the cells it plays through), read only (*Convert to cells first*); Convert to cells folds first, then replays the fold's story, the code set a frame at a time, a cell coming in each (supersedes 025's waiting graph) · → decisions/034-midi-machine.md
- 034 · A MIDI file's graph is its machine (the cells it plays through), read only (*Convert to cells first*), with Convert to cells over it; a MIDI file opens on it (supersedes 025's waiting graph) · → decisions/034-midi-machine.md

## Where things are tracked

- Open work: the GitHub issues; the target and big jobs in [roadmap.md](roadmap.md), the sequence towards it in [#141](https://github.com/yggi/cell-studio/issues/141); rough edges in [limits.md](limits.md).
- Gotcha: never `pkill -f "<pattern>"` from the agent shell when the pattern also appears in the command line itself; it kills the shell. Use the PID or a port check.
