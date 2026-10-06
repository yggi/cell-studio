# Examples

The pieces that ship with Cell studio, one plain-text file each in `examples/*.cells` (52 of them), grouped here by what they show. Open one from the title in the header ([ui/library.md](ui/library.md)). The table is written by hand; generating it from the files' `title=`, `tags=` and `label=` is still to do (#8).

## The language, small

| example | shows |
|---|---|
| Metronome: any meter | the smallest piece: a bar, an instrument, and a beat (a volume stepped by the bar, the first louder); the tempo a slider |
| Key and mode: one theme, two wheels | a theme read through two wheels you can turn |
| Meter and rhythm: the tresillo | meters as `scan()`, `euclid()`, ratios (`&bar/2`) |
| Motifs and reuse: Twinkle Twinkle | three motifs make a whole tune; a shifted table reuses one |
| A table that turns: the circle of fifths | `step=cycle(&tune) stride=7`: round the circle of fifths |
| Canon: Frère Jacques | one theme, four voices, each `[<<]` further |
| Sound: voices, waveforms, envelopes | waveforms from braids, `map=`, a vibrato added to the pitch |
| Stereo: Mary Had a Little Lamb | two mixes for the two channels |
| Bell and scale: 12/8, one scan for both | the West African standard bell (x.x.xx.x.x.x) has the major scale's intervals — one `scan(2 2 1 2 2 2 1)` is the bell's rhythm and the melody's scale at once |
| Royal theme: all keys and modes, Canon per tonos | stepped keys and modes; a canon at the fifth that climbs |
| Viennese waltz: oom-pah-pah, Drunken Sailor | motifs reading through their player; a kit |
| Lullaby: Brahms, Wiegenlied | a music box in 3/4; the second phrase is the first, a step lower |

## Tunings

| example | shows |
|---|---|
| Alpha: Carlos' scale without octaves | `map=ed(3/2)`, nine steps to the fifth: triads that ring true |
| Study after Studie II: 25 steps to 5:1 | Stockhausen's system from 100 Hz, mixtures of five sines, durations from the same series; a retrograde eight steps higher |
| Just intonation: pure and tempered | a ratios grid: the same chords pure (left) and tempered (right); ii's fifth, 40/27, out of tune |

## Classical and jazz

| example | shows |
|---|---|
| Bach, Prelude in C: for Wendy | one figure reading a table of chords that turns a bar at a time (`stride=5`), on a resonant saw over a square |
| Bach, Prelude and Fugue in C minor: for Wendy | BWV 847 in full, from the CCARH Humdrum encoding, written as its structure: the prelude's bars 1–24 as one figure read through two tables of four notes a bar that turn each bar, then its *Presto*, *Adagio*, *Allegro*; the fugue as subject and countersubject entered in each voice at their transpositions (`over=&tones[>>7]`), the free counterpoint between as cells. `tools/bwv847.py` writes it; the tests check every note against the encoding |
| Pachelbel, Canon in D: a ground and three violins | a ground and three violins: one line of three variations, each violin a variation later (`[<<]`) and entering a ground later |
| Ricercar: a study in counterpoint | the King's theme, a pass per stage from strict to free: alone · first species above · below · second · third · free in three voices — every line written by the rules (`tools/counterpoint.py`) and checked by them in the tests |
| Coltrane changes: keys a major third apart | three keys, B G Eb: the key turns `stride=-4 cycle=12`; a line of 1-2-3-5 then the next key's V7 |
| Swing blues: 12 bars in C | the blues scale and the minor pentatonic as scans; swung eighths as a meter of their own (`scan(free(2, 1..3) 1)`); the changes moving the walking bass and the comping |
| Bossa nova: the clave | the clave as a meter, `scan(3 3 4 3 3)`, five strokes a bar; the guitar strums on its strokes |
| Five: an original tune in 5/4 | felt 3 + 2 (after Take Five): the blues' swing meter and pentatonic; the harmony turning on beat 4; the answer a step up the scale |
| Pop song: four chords, arranged | I–V–vi–IV as scale-degree chords; a hook reused a step up; arranged by a selector |

## Electronic and pop

| example | shows |
|---|---|
| 8-bit: Korobeiniki, in Tetris form | a 25% pulse as the braid `0 0 0 1`, a stepped triangle, chords as `pitch=` arpeggios, noise drums; arranged by a selector: A · A · B · B · A |
| IDM: drill, after Aphex Twin | a breakbeat through a kit, every other bar retrograde; ratchets (`2*3`); hats seven against four; triplet bleeps in Lydian |
| Acid-Cell: everybody needs a 303 | a resonant saw whose filter envelope opens on every note, accents, slow knobs, a dotted-eighth echo, a drum machine |
| Zelluläre Aktivität | in the manner of Kraftwerk: it builds layer by layer, breaks, returns, ends; Am–F–C–G; the arpeggio read on each chord's step of the scale |
| Cell Tines | FM after the DX7: an electric piano of two pairs (1:1 body, 14:1 tine), bells at 3.5:1, an FM bass |
| Cell Phase | after Steve Reich's Piano Phase: one pattern, two pianos, the right one at 81 notes to the left's 80, drifting through all twelve alignments; `euclid(5, 12)` on wood |
| Cell in Focus | slow, serene, looping (after Aphex Twin): four chords breathing through a filter, a bell arpeggio thinning by chance |
| Hypercell | 90s happy hardcore at 160: offbeat bass, rave stabs, a hook on two detuned saws, risers and rolls; fifteen sections, three minutes, ends |
| One more Cell | French filter house: one maj7 shape chopped and moved F G A B♭, one long filter sweep, disco octaves, a robot lead |
| Cellular Brothers | big beat: a crushed breakbeat, acid, a distorted riff, a siren, builds; ends after 2:34 |
| Ghost-Cells | dark, looping: a piano phrase of seven eighths over eight, drifting; distorted drone, crushed noise on prime periods |
| DTMF: a telephone keypad | type a number (default 867 5309 ABCD .#) and it's dialled: each key a row's sine and a column's |

## Ambient and experimental

| example | shows |
|---|---|
| Cellscape | an ambient cycle of twelve scenes, a fifth apart in Lydian; one score (`&scenes`) read by two barrels, one for each ear |
| Cellscape II feat. Stockhausen | no octaves (25 steps to 5:1), no beat (every layer its own clock, a prime number of steps), no instruments (sines and noise) |
| 5 to 12 | a day of music, anchored to the clock (11:55): 12 modes, 144 keys, five dimensions in counterpoint — `law=fiveto12` (`src/engine/fiveto12.ts`). The sun shows the day; a tape keeps memories and messages; strings on every semitone ring with it |

## Physical cells

See [language/physics.md](language/physics.md).

| example | shows |
|---|---|
| Harmonograph | two forks, a tonic and its fifth, struck together; each drives one axis of an oscilloscope: a 3 : 2 Lissajous figure |
| Kalimba | eight tines, each a resonator, all coupled to one shared box; tap them to play along |
| Two Tuning Forks | one struck, the other — never struck — begins to sing; detune it and they beat |
| Baustelle | in the manner of Einstürzende Neubauten: beams, pipes and plates tuned to their own partials (`map=ratios`: a beam rings 1 : 2.76 : 5.40 : 8.93), a sub-bass kick, a crushed riff; it builds, breaks, returns, collapses, ends |
| Baustelle II: Resonanz | the building site's metal rings: a plate, a beam, a wire, a kicked spring; a tape loop of the site drives two pipes |
| Test Tones on Tape | in the spirit of Hainbach: sine generators, a beeping oscillator and noise swells on worn tape — three heads, hiss, print-through, dropouts, a tape stop |
| Sound on Tape | a plucked tune and a pad on a 4-second tape loop on a wowing reel: every lap darker and warmer; hold the reel and the tape bends down |
| Echo Tape | a tune on a tape loop: three read heads echo it, older passes fading to ghosts |
| Tape Machine | a tape loop on a machine that spins up, wows, the hats on a slack belt; at the end the tape stops |
| Automaton | a mechanical band on belts: bells taut and exact, a drummer slack and swinging, a woodblock that slips |
| Music Box | a clockwork box: wound, it spins up, plays, and as the spring runs down it slows and stops |
