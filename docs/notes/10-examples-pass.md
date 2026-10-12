# #10, an examples pass: drums on a kit, no extra mixers

Date: 2026-10-12 · Status: open (the section mixes folded into the cards in 9 pieces, one Shorten run applied; the drums wait on the owner) · Issue: [#10](https://github.com/yggi/cell-studio/issues/10) · Follows [10-corpus.md](10-corpus.md), [gate-example.md](gate-example.md)

The owner asked for a pass over the 75 examples with the current best practices (drums go on a kit, no extra mixers, the gate spelling of [decision 023](../decisions/023-gate-spelling.md), what Shorten still suggests), and for what it teaches #10: what is open, what reads badly, what is redundant, what the true shape is. The rule for the pass: no piece may sound different. Every rewrite was checked note for note before it was kept or dropped: `tools/corpus.mjs` (voice, onset, length, frequency, gains) and a stricter scratch compare of every field of every event over 0–120 s (levels, envelopes, bends, parameters too). Read from the working tree on 2026-10-12.

## 1. What was changed

| piece | what | mixes removed | corpus: chars, lines, cells |
|---|---|---|---|
| `arrangement` | `&click … 12 0 0 0` → `12 0!3` (Shorten's run rule; tier 5 has `!n`, tier 1) | — | 0, 0, 0 |
| `baustelle` | section mixes into `&out`; `&metalPart` and `&einsturz` kept (below) | `&platePart` `&subPart` `&riffPart` `&federPart` `&grindPart` `&drillPart` `&schreiPart` (7) | −83, −4, −7 |
| `brothers` | section mixes into `&out` | `&breakPart` `&acidPart` `&riffPart` `&sirenPart` `&buildPart` `&subPart` (6) | −80, −1, −6 |
| `cellscape` | section mixes into `&out` | `&drone` `&sequence` `&leader` `&follower` `&chimes` `&pulses` `&shine` (7) | −74, −1, −7 |
| `grids` | section mixes into `&out` (tutorial, tier 6: the tier test passes) | `&edoPart` `&fifthsPart` `&justPart` (3) | −16, −1, −3 |
| `hypercell` | section mixes into `&out`; the four `&eq` reads kept, with a comment saying so | `&stabPart` `&risePart` `&rollPart` (3) | +44, −2, −3 |
| `korobeiniki` | section mixes into `&out`; `&sectionsNote` now about `(&tune &chorale)`, not the mixes | `&leadA` `&leadB` `&bassA` `&bassB` `&chordsA` `&chordsB` `&drums` (7) | −82, −1, −7 |
| `onemore` | section mixes into `&out` | `&groove` `&choppy` `&disc` `&rob` (4) | −31, −1, −4 |
| `pop` | section mixes into `&out` | `&hatsPart` `&beatPart` `&bassPart` `&keysPart` `&hookPart` `&endPart` (6; `describe.test.ts` given a mix of its own) | −101, −1, −6 |
| `zell` | section mixes into `&out` | `&ticksPart` `&beatPart` `&bassPart` `&arpPart` `&melodyPart` (5) | −102, −1, −5 |

48 mixes removed, 6 kept. Each folded mix's products are written into the card in its place, one section a line (the comma continuation), so the card still reads section by section; `baustelle`'s card has two or three sections a line. Comments that described "the parts' sound" (`pop`, `zell`, `korobeiniki`) now describe the taps only. `hypercell` grows by its new comment.

**Checked:** `node tools/corpus.mjs --check /tmp/corpus-base.json`: every piece `same notes`; `total: chars -525, lines -13, cells -48; 0 pieces changed sound unexpectedly`. The stricter compare of every field of every event: identical in all 10 pieces except the event's `instrument`, which named the outermost mix a note went through (`"instrument":"hatsPart"`) and is now absent; nothing in `audio/` plays from it. The snapshot was refreshed (`src/engine/snapshot.txt`, 9 lines): in each the `notes` column (and the count) is unchanged; `events` moved by the `instrument` field; `values` by the removed cells only (the kept cells' values at the four times are equal, checked cell by cell); `live` by the removed mixes' nodes and edges only (cells, voices, bars, beats, steps and phases equal with the removed names left out).

**Kept, and why:**

- `hypercell`: `&beat`, `&bassPart`, `&hookPart`, `&padPart`: the spectrum scope `&eq` reads them.
- `baustelle`: `&metalPart` and `&einsturz`. `src/audio/wiring.test.ts` reads them by name (*a mix's wheel hears only the notes that go through it: Baustelle's &einsturz …*, #77, which also expects `&beams`' notes in `&metalPart`): a real case of what a mix's wheel hears, so they stay until that test has a fixture of its own. (`pop`'s `&hookPart`, kept at first for `describe.test.ts`, is folded: the test now has its own mix.)

The library was already further along than the request assumed:

- **No old gate spelling is left.** No piece writes `trigger=`, `velocity=`, `gate=` or `gain=`. One piece has gates (`gate`, two of them); it already writes `play=` and `level=`.
- **Shorten finds 10 things in 3 pieces**, and only the one in `arrangement` reads better (section 2 has the other two).
- **8 pieces already play their drums through a kit**: `automaton`, `brothers`, `drums`, `idm`, `midi-out` and `sailor` as a groove of voices, `gate` by a kit gate, `metronome` by a meter read through a kit of clicks.
- **Every mix that is not a section's is needed**, and stays: it is a stereo channel (`canon`, `pertonos`), an instrument (`prelude`'s `&moog`, `waveforms`' `&bass`), what a tape records (`fiveto12`, `resonanz`, `soundtape`, `testtones`, `worn`) or what a resonator is excited by (`resonanz`'s `&echo`, `sympathy`'s `&played`).

## 2. Not changed, and why

**Drums onto one kit: blocked by per-drum gains, in 12 pieces.** The best form is one pattern for all drums, read through a kit: `&beat step=&beatBar &bd &sd &bd &sd`, then `&drums play=&beat level=… &kit` or `[&beat * .6]`. A kit had one gain for all its members when this was measured (5db16a7, *level= on a voice*, landed during the pass: section 3, item 1). Every piece that writes its drums per drum gives each one a gain of its own:

| piece | the drum products (pattern × voice × gain) |
|---|---|
| `acid` | `&kick * &bd * .8, &clap * &cp * .35, &closed * &hh * .25, &open * &oh * .2` |
| `arrangement` | `&kick * &bd * .6, &click * &rim * .1` (the click pitched: `12 0!3`) |
| `bell` | `&strokes * &gankogui * .25, &drum * &dundun * .7, &pulse * &shekere * .15` |
| `bossa` | `&rim * &click * .3, &shaker * &shh * .12` |
| `five` | `&ride * &cym * .22, &rim * &click * .3` |
| `ghosts` | `&kick * &bd * .55, &metal * &tick * .1, &glitch * &blip * .07` (the glitch pitched) |
| `hypercell` | `&beat [&kick * &bd * .8, &hats * &hh * .2, &clap * &cp * .35]`, `&roll * &sn * .25` |
| `onemore` | `&kick * &bd * .8, &clap * &cp * .3, &open * &oh * .15, &shake * &sh * .1` |
| `pop` | `&kick * &bd * .8, &snare * &sd * .4`, `&hats * &hh * .2` |
| `rhythm` | `&kick * &bd, &hats * &hh * 0.4, &shake * &sh * 0.3` (tutorial, tier 4: map=amp as gates) |
| `tape` | `&hats * &hh * .1, &kick * &bd * .5` |
| `zell` | `&kick * &bd * .8, &snare * &sd * .35`, `&ticks * &metal * .12` |

Three ways round it were measured, none note-identical:

- **Move the balance into a level pattern.** Where drums never sound together (pop's and zell's kick and snare alternate), `&beat step=&beatBar &bd &sd &bd &sd` with `level=&weight`, `&weight map=amp step=&beatBar .8 .4`, plays every note at the same onset, length and pitch, and the same product of gain and level. But the corpus compares gains, and these move from the channel gain into the note's level: pop reads `bd … 0.8000` before and `1.0000` after (with level .8). It is also what MIDI out sends as velocity, so it is a change for a synth, if not for the ear. Where drums do sound together at different gains (acid's kick and clap on 2 and 4, hypercell's, onemore's, bossa's, rhythm's, five's), no level pattern can say it: one step has one level for the chord.
- **A groove per drum** (`&kick step=&beatBar &bd ~ &bd ~`, then `[&kick * .8, &snare * .4]`). Note-identical where the line is plain hits: checked on `hypercell` (kick, hats, clap, roll: 2106 events, every field the same), `pop` (kick, snare) and `acid` (kick, clap). It is still one pattern per drum, the form the request wants gone, so it was not applied. It would make a later merge mechanical.
- **Not even that, in three cases:**
  - *Chance draws by voice.* A note's chance is keyed on its cell, **its voice**, its lap and its step (`realize.ts`, `chanceOf`). In a groove the voice is the groove's kit, so the same `?` rolls other dice: `chance` (`&hats … 0?.3` into `&hh?.3`) went from 1300 to 1340 notes, and `onemore` (`&shake … 0?`) from 3658 to 3604.
  - *A kit drum doesn't follow its clock's varispeed.* `tape` runs on a varispeed capstan: its kick, a product, bends with the tape (30.12 Hz, sliding); as a groove it is a kit member, played at pitch 0 (36.71 Hz, steady). Same for pitch modulation: a kit read takes none (`realize.ts`: `!t.output.kit`).
  - *Pitched hits.* A kit plays its member at its own pitch; a groove's voice can't be transposed (`&hh^12` is no groove). `swing`'s ride (`12!3`), `arrangement`'s click (`12 0!3`) and `ghosts`' glitch (`[0|7|12]`) stay products.

**Shorten's two other suggestions:**

- `steps`: *`loop=SAMPLE_RATE` is what the sound card turns at anyway — leave it out*. `steps` is the only piece that writes `loop=SAMPLE_RATE`, so the only one that shows the form `rate loop=NAME`, which tier 1 must cover (`ladder.ts`); its note explains it. Applied, the tier test would fail.
- `bwv847`: 8 phrases written several times (−645 characters). Applied (`shortenAll`, 14 steps), they cut the fugue's entries into fragments that are no musical unit (`&subject` becomes `&m6^$24 &m2^$24 3`, `&s11s` becomes `&m6^$27 12@2 &m15^$27 &m11^$27 12@4 10 8 7`). The hand-labelled entries read better. The subject's seven entries are not one cell because each is bent (a note changed, the last one held longer): the language has no "this motif, with this note changed".

**Two cards a piece, `&mix` and `&out`**: 19 pieces name the card `&mix`, 56 `&out`. A rename changes no note, but it is naming (#150), and the implicit `&out` is deferred ([gate-example.md](gate-example.md)): left.

## 3. Open for the language to decide

1. **A kit member's balance.** The one thing between 12 pieces and one kit each. The options, all open:
   - a gain on the voice (`&sd … level=.4`). Landed while this pass ran: 5db16a7, *level= on a voice, its own gain (a kit member's balance)*. Moving the 12 pieces onto one kit with it is the next pass, checked note for note as this one;
   - a gain per member on the kit (the spelling is open: `*` in a groove is already the ratchet, `&hh*2`);
   - accept that the balance moves into the note's level (MIDI velocity changes; the ear doesn't), and Shorten rewrites it;
   - keep one product per drum as the canonical form for a balanced kit, and the groove for one level.
2. **Chance keyed on the voice.** Respelling a line (a voice renamed, a pattern moved onto a kit) rolls new dice. Should the key be the cell and the step only? It would change every piece with `?` or `[a|b]` once (9 pieces use one of them), and never again.
3. **What a kit drum follows.** A kit read takes no pitch modulation and no varispeed: a tape stop bends the bass but not the kick. Is that the meaning of a kit (a drum has no pitch), or a gap?
4. **A section's mix: done, in the library; the form is not.** Since 016 a tap switches a section and its mix only grouped it: 54 mixes in 9 pieces, each read by the card (4 also by a scope). This pass folded 48 into their cards, note for note (section 1), as `arrangement`, the tutorial for arranging, already wrote it. What stays open: nothing stops a piece writing them again (Shorten could suggest the fold for a mix read only by the card, as it does for wrappers); the tag a section mix carried (`tags="drums"`) now lives only on its cells; and a send or a bus (#149) would be the one reason for a mix of its own. One test in `src/` still reads two of them by name (section 1).
5. **`level=` means three things.** dB on the card (75 of 75 pieces write one), a linear product on a gate, and now a voice's own gain (5db16a7, item 1): three meanings. Every piece also has a linear gain on nearly every product. The lin/log seam of decision 023, from a third side.
6. **A motif with a change.** BWV 847 writes its subject seven times because each entry bends a note or holds the last one longer. A form for "&subject, its 13th step a semitone up" (a pick written into, `&subject[$12]+1`?) would let a fugue say what it is. #141's sequence and #31's pitch spaces are where it belongs.
7. **Shorten against the tutorial.** A suggestion that removes the only use of a form a tier must show (`loop=SAMPLE_RATE` in `steps`). Either Shorten leaves tutorial pieces' required forms alone, or `rate loop=NAME` leaves tier 1.

## 4. Bad forms that should or could be improved

- **One drum hit, three spellings.** A drum line is written as volumes (`&kick map=amp step=&beatBar 1 ~ 1 ~`, 24 lines in 11 pieces, some with a level per hit), as pitches (`&kick step=&beatBar 0!4`, about 22 lines in 12 pieces) or as voices (`&groove … &bd ~ &hh`, 6 pieces). The first two then need `* &bd` in a product. A beginner meets two of them in one tier (tier 4: `drums` teaches the groove, `rhythm` the volume as a gate).
- **`0` means "the drum" and `1` means "the drum".** A pitch pattern of zeros and a volume pattern of ones say the same thing; neither names the drum.
- **The drum recipes are copied.** The kick (`s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .3 0 .05)`) and its kin (a sine with a pitch drop: toms, a dundun, a woodblock) are written 24 times in 19 pieces, with small differences; 81 envelopes are `&(map=adsr 0 d 0 r)` (a hit: no attack, no sustain); 51 voices are noise. There is no library of voices to read from. A beginner copies a line they can't read yet.
- **Envelopes are never shared.** 239 envelopes are written in place, `env=&(map=adsr …)`; not one piece names one and shares it (`env=&pluck`), the form [sound.md](../language/sound.md) shows.
- **Stereo by two chords repeats the shared part.** In 8 stereo pieces the two channels write 13 entries twice (`echotape`'s `&tune * &bell * .22` and `&far * &soft * .08` in both; `worn`'s and `soundtape`'s `&dry`). `pan=` (decision 007) places a voice; what differs per side here is a read head or a canon's entry, so both chords are written out, the common part twice.
- **A long card.** With the section mixes folded, the arranged pieces' cards hold every product (`cellscape`'s 7 lines, `korobeiniki`'s 7); the comma continuation is the only way to break them, and a section's name now lives only in its tap.
- **Boilerplate at the top.** 51 pieces start with `&bar scan(1 1 1 1)`; 14 write `label="{mode} on {tonic}"`; 20 write a mode as `scan(2 2 1 2 2 2 1)` where 20 others write `scale(major)`.

## 5. Redundant and superfluous

- **Volume pattern vs pitch pattern vs groove** for drum hits (above): three spellings, one meaning when the hits are plain.
- **Section mixes**: 54 mixes the selector no longer needed; 48 folded here (section 1), 6 kept for a scope or a test.
- **The `instrument` of an event** names the outermost mix a note passes through; nothing plays from it, so folding a mix changed it and nothing else (and moved the snapshot's `events` hash).
- **`&mix` and `&out`**: two names for the card (19 and 56 pieces).
- **`scan(…)` and `scale(…)`** for the same seven modes: 20 and 20 pieces.
- **A volume as a gate** (`[&hats * &hh]`, notes started by a `map=amp` step: 24 lines in 11 pieces) and **a gate** (`&g play=… level=…`, 1 piece): two ways to start notes from a level pattern, besides the kit gate, which does it from a pattern of numbers.
- **The card's `level=` and each product's gain**: two places for loudness, one in dB and one linear, in every piece.

## 6. The emerging true shape

The library converges on few things. **Cells** hold braids, and a braid is steps, rests, holds, chords, motifs and choices. **Clocks** are cells too: a bar (`scan(1 1 1 1)` at a tempo), its subdivisions, a swing, a meter, a belt, a tape's reel; everything moves by `step=` on one of them. **Tables** turn numbers into something: a scale into pitches (`over=`), a kit into voices, a table of taps into sections. **Voices** are sources with an envelope and parameters that move with cells. **Products** meet a pattern, its levels and a voice; named, a product is a **gate**. The **card** is the last mix, with its stereo pair and its master level.

Read that way, a drum part is a pattern read through a table of voices, exactly as a melody is a pattern read through a scale. The 8 pieces on a kit already write it so; the 12 that don't are held back mostly by one thing, the balance between drums (section 3, item 1); a few lines also by chance keys, varispeed or a pitched hit (section 2). With that settled, a piece's drums are one groove line, and `* &bd` products, zero-patterns and one-patterns as drum hits leave the library.

Arranging the same way: since 016 a section is a switched tap of the clock, so its mix is only a group. With the section mixes folded, the arranged pieces' cards read their products directly, as `arrangement` does: one table of taps, one selector, one card.

What would be left: cells and braids; clocks; tables (scales, kits, taps); voices; gates (products, named or not); the card. The volume-as-gate, the pitch pattern of zeros, the section mix (folded here), the second card name and the duplicated stereo chord are what would go. The open questions are about where loudness lives (a voice, a kit member, a note's level, a product's gain, the card's dB) and what a respelling may not change (chance keys, varispeed on a kit). Both come back to #151's canonical forms: one place for each fact, and a respelling that plays the same.
