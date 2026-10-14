# Eternal jam: Cell studio and Jambot back together

2026-10-14 · open · #406, the handshake (decisions on [yggi/jambot#309](https://github.com/yggi/jambot/issues/309))

State: the language is [yggi/cells](https://github.com/yggi/cells) (its #2, with its history), and this app runs on it at a pinned commit (the pull request that moved it here); next, Jambot on the same pin.

Cell studio started as a spike out of [Jambot](https://github.com/yggi/jambot), to research and define the language. The owner's call (14 Oct 2026): it is time to bring the two back together, towards infrastructure for *eternal jam sessions*. This note reads the owner's shape back, says where each side stands, lists where the two decided differently, and gives the plan the owner agreed to. Its twin in Jambot is `docs/briefs/eternal-jam.md` (with the owner's brief verbatim); who Jambot is, for an agent here, is in [MEMORY.md](../MEMORY.md#the-sibling-jambot).

## The shape

One loop, four roles, one language:

- **The composer** (Jambot) runs without end: it writes the score as cells text, steered by the jam's **style vector**, keeps a fading short-term *workbench* of cells and queries a long-term **repository**.
- **The conductor** holds the session to a shared ruleset; `free()` is each performer's licence.
- **The players**, human or Jambot's own, perform the score within their licence; out as MIDI, or as instrument-level cells rendered to audio.
- **The Muse** transcribes each player into cells fragments: hashed, given metadata and style hints, sent to the repository and to the composer's workbench.

The **repository** holds cell cultures: fragments seeded from corpora, deduplicated by hash, placed in the style space, graded, found by query ("the ten most acid-house 16-step basslines"). **Everything is relative**: a fragment has no tempo, no key and no declared type, and plugs into any other at any scale. **The regulator** is homeostasis between *bored* and *confused*: repeat until it stops confusing, change when it bores, with a tolerance the style sets (techno more patient than jazz). **Left alone**, it is a radio station: a slow random walk around the tip of the jam's style vector.

Each side already holds half of it: Jambot the style space, the Muse, the fading memories and the measured bored-to-confusing edge (its #237, E22); Cell studio the language, a headless engine, MIDI → cells, and the radio and jukebox idea ([multiscale.md](https://github.com/yggi/cells/blob/main/docs/notes/multiscale.md#meta-machines-a-radio-a-jukebox), #234).

## Seven sharpenings (agreed)

1. **A fragment's style vector is not the jam's.** Jambot's seven axes include `bpm` (absolute) and `entropy` (the loop's temperature, its #237), so a fragment carries a reading without either: partial, a confidence per axis (a scale has no `sync`, a drum pattern no `harm`). Tempo and entropy belong to the jam.
2. **A role is computed, not declared.** "16-step basslines" are facets measured on the fragment (length, register, polyphony, pitched or not) and where it was last plugged in. A line is the bass by being plugged in low.
3. **Identity has three rungs**: the exact text; the canonical spelling (Normalise, #244, and α-renaming); the orbit under the operators (Jambot's `canonicalOp`: transposition, mirror, retrograde, rotation). Which merge and which only link is a choice; Jambot's E28 shows it matters (1,036 chromatic shapes against 814 by degree, over 1,646 bars).
4. **The score is a stream of pure texts.** The composer's state (machines, fading memories) stays in Jambot; what it writes is a pure cells text, a section at a time, and the single-source rule holds for each. A take goes to the memory and the repository, never back into the composer's text.
5. **Generators: cells is the output first.** Our generators make braids and events, not cells or forms; Jambot's composer is the generator now. Generators written in cells (the song machine, #234 lead 12) come later and block nothing.
6. **One clock, the host's.** The host states `&bar` (meter, tempo, swing) a section at a time; tempo-free fragments splice onto it, as `step=&bar*4` already does.
7. **The superset is the mini-notation and the parameter names** ([027](https://github.com/yggi/cells/blob/main/docs/decisions/027-on-top-of-strudel.md)), not Strudel's pattern functions (no `.every`, `.jux`, `.off`, polymeter, samples), and there is no Strudel import or export. Strudel is AGPL: Jambot's build refuses copyleft, so a shared package can't wrap it.

## Where each side stands

| Part | Cell studio | Jambot | Gap |
|---|---|---|---|
| Language | the language; `free()` on any value and on a whole braid | a score of header, harmony, drums, bass, pad, stab; lead and snare open; not in the band's path yet | two languages, drifting apart |
| Headless player | `engine/host.ts`: code in, event windows out, in a worker or in node | its own engine | Jambot can't play cells yet |
| Out | Web MIDI and clock (lifted from Jambot, #203), Tone.js, SMF export | Web MIDI, built-in synth, a dough note format | duplicated; no dough renderer |
| Generators | braid-level | the whole composer: form, themes, key, style-driven parts | as intended for now |
| Style vector | none | 7 axes, presets, glides, readers back from bars | no reading of one fragment |
| Muse, transcription | the folder, the disassembler (#364), `free()` takes | phrase reader with confidence, fading motif memory, recognition under operators | built twice, apart |
| Identity | Normalise planned (#244, #151) | `canonicalOp`; content-addressing discussed (its #287) | none built |
| Repository | pieces in `localStorage`, 77 examples, 88 Bach files (#333) | nothing outlives a song | none |
| Host and client | none | protocol 8, a lobby on Fly.io; JSON bars on the wire | the wire isn't text |
| Homeostasis | none | the observable (share of bars recognised), the knob (variation rate), each genre's edge by ear | no controller |
| Radio | the idea (#234) | the style never moves alone; the key drifts with no home | none |

## Where the two decided differently

The owner's calls. The suggestion: our spelling where it agrees with Strudel, Jambot's meaning where the question is about meaning.

| Question | Cell studio | Jambot | Suggestion |
|---|---|---|---|
| Euclid's rotation | Strudel's (027) | its `even(k,n,shift)`, 46 of 120 pairs differ (its #8) | ours in the text, `even` underneath |
| `_` | holds the note before | no onset here (its #275) | ours |
| `^` | `^n` degrees, `^$n` grid steps (015) | an octave up | ours |
| `shift` | `shift=` walks the modes | transposes (our walk is its `mode`) | one name each, settled together |
| `cycle=`, `grid=` | turns until it comes round (003, 008); the grid is the tuning | a cell's period; a bar's groups, a subdivision (its #306) | with the meter tree |
| Names | words; α-renaming keeps the cell | numbers, never reused (`&0`, its #287) | words; a hash is the identity |
| What a cell holds | an index into its table (degrees) | chromatic, degrees a view | chromatic behind the hash, degrees in the text |
| Accent grades | `* + .` (`meter()`) | `* + - .` | ours |
| Swing | a pair's ratio | an axis 0..1 on the pulses | with the meter tree |
| Loudness | a product | additive offsets | open |
| Score and playing | the text holds everything | the text holds what is composed | Jambot's, for the jam's stream |

## The plan

Each phase leans on the one before, except radio mode, which can start now.

0. **Agree** (the owner). Jambot's #287, #306, #275 and #265 stop growing a syntax of their own; their meaning is what cells has to say. Rule on the table above, and on who owns the lifted MIDI code (#203 left it "for later"). Where the code lives is ruled (D1, 2026-10-14): **[yggi/cells](https://github.com/yggi/cells)** is the shared core, the language and the repository of fragments; Cell studio is its workbench and Jambot its interactive, multi-user frontend, both consuming cells at a pinned tag.
1. **A shared base.** `src/engine` and the theory it imports (`theory/modes.ts` (in `@yggi/cells`), `tonal.ts`) move into yggi/cells with their history and are tagged; Cell studio and Jambot depend on the tag, and Cell studio deletes its copy ([yggi/cells#1](https://github.com/yggi/cells/issues/1)). A licence here (MIT, as cells). The MIDI layer gets one owner.
2. **Radio mode, alongside** (Jambot): a slow mean-reverting walk of the style around a slower anchor, through its glides.
3. **The seam.** Jambot's band writes cells a section at a time and plays it through the cells engine; its round trip moves onto cells. What porting the band will ask of the language, likely: a section's meter, harmony as numerals over a key, *open fragments* that leave `&key` and `&bar` to whoever splices them, and imports or a library by hash (we have no imports or namespaces). Here: a way to load a stream of code from outside, so Cell studio joins a jam as a client and a view (`window.cellStudio` can't load code today).
4. **A first repository.** A fragment is cells text plus an index entry: its hashes, the operator back from the canonical form, the partial style reading, facets, origin, time, id. Seeds: our examples, the folded Bach, Jambot's own output; POP909 or Lakh once licences are checked. A query tool first.
5. **The loop closed.** One transcriber: Jambot's reader hears, our capture law (`capture(play(b)) = b`) and the folder write. The Muse feeds the repository and the composer's fading workbench.
6. **The homeostat**, with the radio as its loop with nobody playing.

## Gotchas across the two

- Same sigil, different words: `^`, `_`, `shift`, `cycle=` and Euclid's rotation mean different things over there (the table). Check a form against both before porting it either way.
- Jambot is a pnpm workspace; a pre-push hook runs `pnpm verify` and blocks a failing push. Its docs are one sentence to a line, and its language design is a catalogue of claims, each with a test ([the ratchet](https://github.com/yggi/jambot/blob/main/docs/ratchet.md)): a change to its score language goes through the owner.
- Lifted files carry a header naming their source at Jambot 8cdb6b8; keep it when you change them, so the two can be merged back.
