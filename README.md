# Cell studio

A minimal language for music where everything is a **cell**: a helix (pitch
classes over octaves, beats over bars) with a **braid** sitting in its grid.

    npm install
    npm run dev       # vite
    npm test          # vitest (pure TS: theory, parser, compiler, realize, layout)
    npm run check     # svelte-check
    npm run build     # dist/index.html, one self-contained file

## The language

One cell per line; attributes go anywhere.

    &bar agogic(4,4) step=84bpm                    # the clock, bent * . + .
    &key step=cycle(&theme) stride=7                 # the 12; a fifth per pass of &theme
    &scale over=&key even(7,12,2) step=cycle(&key)   # Aeolian; a degree per circle of keys
    &theme over=&scale step=&bar 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2

    &lead s=saw loop=261.63 lpf=2200 decay=.3        # a voice
    &vibrato loop=5 0 .1 .15 .1 0 -.1 -.15 -.1       # a pitch, ±0.15 semitones, 5 times a second
    &mix [(&theme + &vibrato) * &lead]
    &out loop=SAMPLE_RATE map=sample &mix &mix

Everything is indexing and moving a helix:

- **over=&t** — a number x means entry x of &t; past the end it climbs a lap.
  `over=scale(tonic, phase)` is shorthand for two unnamed cells — exactly
  `over=&(scan(…) over=&(shift=tonic))` with the scan of `phase`: `scale(0,2)` is C Aeolian,
  `scale(2,3)` D Dorian, `scale(7,5)` G Ionian (phase is the Bresenham phase of
  `even(7,12,phase)`, darkest 0 to brightest 6). Write the key and scale as
  named cells when you want to turn or step them.
  Without over=, a cell reads through the table of whoever splices it.
- **shift=n** — rotate the braid by n (wrapped entries climb a lap).
- **&t[i]**, **&t[a:b]**, **&t[a:b:step]** — pick from the braid *as written*
  (rotation ignored), Python-style: `&x[0]` first, `&x[-1]` last, `&x[1:3]`,
  `&x[:-1]`; `&x[::-1]` is the retrograde (backwards), `&x[::2]` every other.
  A pick keeps each token's modifiers and length.
- **&t[<<n]**, **&t[>>n]** — &t shifted back / forward by n (default 1), on
  top of its own rotation; wrapped entries climb a lap. `&john[<<]` is the
  theme one unit behind; `over=&scale[<<]` reads one step lower. In `out`
  the brackets keep shifts apart from pitch arithmetic:
  `(&alto[<<] - 7) * &cello` — a bar behind, a fifth below.
  (Slices rotate too, without the climb: `&x[-1:] &x[:-1]`.)

  Picks and shifts go where a braid is used — braids, `out`, and (shifts
  only) `over=`; `step=` and `map=` take whole cells.
- **Note names** are rates from the environment, tuned from `A4` (440 by
  default): `loop=C4`, `loop=F#3`, `loop=Bb2`.
- **step= / loop=** — what moves it. `step` counts single steps, `loop` whole
  turns of the braid (a k-step braid: `loop=r` is `step=r·k`):

  |          | rate (`1`, `84bpm`, `440hz`) | `&x`               | `cycle(&x)`            |
  |----------|------------------------------|--------------------|------------------------|
  | `step=`  | one step per second          | one per step of &x | one per cycle of &x    |
  | `loop=`  | whole braid per second       | whole braid per step of &x | whole braid per cycle of &x |

  Driven forms take a chain of `*n` (once per n) and `/n` (n per one), read
  left to right, n any positive number: `step=&bar*2/3` is triplets — three
  steps per two.
- **stride=n** — each step moves a stepped table n places (`stride=7`: fifths).
- **free(default, lo..hi)** — a number left to the performer: a slider on the
  node, and moving it rewrites the `free(…)` in the code. Anywhere a number goes:
  a rate (`step=free(90bpm, 60..240)` — the tempo), `shift=free(0, 0..6)` (a mode
  selector; turning the wheel moves it too), `stride=`, a gain in a mix
  (`&strings * free(.4, 0..1)` — a fader). A tempo marking is its range, centred:
  `step=free(adagio)` (largo larghetto adagio andante moderato allegro vivace presto).
- **Turning climbs**, like every other shift: a stepped table goes up a lap
  each time round. **cycle=n** has one job everywhere — how many before it
  comes round: `&key … stride=7 cycle=12` goes round the circle of fifths;
  per tonos' `&key … stride=2 cycle=24` rises two octaves, then starts again.
- **Grids** say so with **map=edo**: `&edo19 cycle=19 map=edo` turns positions
  into frequencies, 19 equal steps per octave. The default grid is
  `&fifths12TET cycle=12 map=edo`. A grid reads nothing and has no braid.
- **map=ed(r)** divides any ratio, not just the octave: `cycle=25 map=ed(5)`
  is Stockhausen's Studie II scale (25 steps to 5:1), `cycle=9 map=ed(3/2)`
  Wendy Carlos' alpha (nine steps to a pure fifth, no octave), `cycle=13
  map=ed(3)` Bohlen–Pierce. `map=edo` is `map=ed(2)`. Climbing a lap
  multiplies by r.
- **map=ratios** — a grid whose braid lists one period's tones as ratios, the
  last the period: `&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`. Numbers can
  be fractions anywhere (`9/8`).
- **Colour follows the voice's grid**: a rainbow per period, by position (on
  12 to the octave: C red, D yellow, G light blue …) — in braids, in the
  spectrum wheels (from the voice's pitch 0), on the edges. A voice on another
  grid names its note by position on it, with the nearest 12-tone note and its
  distance in cents (`0 · G2 +35¢`).
- **&( … )** — an unnamed cell, written where it's used, with the same body as
  a declaration: `over=&(even(7,12,5) over=&(shift=7))`, `&(4 5)[<<]` in a
  braid, `(&theme + &(loop=5 0 .1 0 -.1)) * &lead` in a mix.
- **off** — switched off: silences it and everything that reads through it or plays it.

A played braid's moving shift is its playhead; a table's moving shift turns
what reads through it, looping within its cycle. A generated meter (`agogic`,
`even`) places its steps within the bar; other clocks step evenly.

**Mixes and the sound card.** Output is cells too. A chord of sounds is a mix:

    &mix [(&theme + &vibrato) * &lead * 1.2,
          &pedal * &bass * 0.8]
    &out loop=SAMPLE_RATE map=sample &mix &mix      # the sound card: two channels, the same mix

Two kinds of things in a mix: *pitches* (semitone streams — melodies,
vibratos — and numbers inside a pitch sum) and *signals* (voices):

- pitch + pitch → pitch: semitones add (`-` subtracts); `(&pedal + 12)` transposes
- signal + signal → signal: voices mix (`,` inside the chord does the same)
- pitch * signal → signal: the voice plays at that pitch, rate × 2^(p/12)
- a number in a product is a gain: `&theme * &lead * 1.2`

The voice is the last non-number factor of a product. Two laws make grouping
safe: `(a + b) * s = a * (b * s)` and `a * (s + t) = a * s + a * t`.

**map=sample** makes a cell the sound card (it can hold its mix directly:
`&mix loop=SAMPLE_RATE map=sample [&tune * &lead, &bass * 0.5]` — one chord
is mono, two chords `[…] [left] […] [right]` are stereo): `loop=SAMPLE_RATE` turns its
braid once per sample (`SAMPLE_RATE` is provided by the environment: the audio
device's rate, 48000 until audio starts; plain numbers like `44.1k` work too), and its entries are the channels — one (mono) or two (left,
right). Different mixes per channel are stereo:

    &left  [&theme * &reed, &alto[<<] * &cello * 0.4]
    &right [&theme * &reed * 0.6, &alto[<<] * &cello]
    &out loop=SAMPLE_RATE map=sample &left &right

A line ending in `,` `[` `+` or `*` continues on the next.

**Articulation.** Among the pitches acting on a voice, the one with `step=`
timing starts notes; `loop=` terms bend them while they sound (vibrato);
terms that don't move transpose.

**Volume streams.** (`map=db` takes decibels: 0 full, −6 about half.) A cell with `map=amp` in a product is a volume, not a
pitch: its values multiply the level while notes sound (1 full, 0 silent; a
rest is silence). `&accent map=amp step=&bar/2 1 .3 .6 .3` accents eighths;
`&env map=amp loop=&theme 1 .7 .5 .3 0` is an envelope — one shape per note.
With no moving pitch, a volume with `step=` starts the notes itself (a gate):
`&mix [&hats * &hh]` plays a hi-hat on its steps, at their levels. (Planned: `gate(&rhythm) * …` to articulate
explicitly.)

**Voices.** A voice is a cell looped at audio rate: `loop=440` plays its braid
440 times a second. Its braid is the waveform — values hold for their step,
then **map=** makes them sound:

- `amp` (default) — lerp the braid's own range onto −1…1: `0 1` is a square;
  a sine is the braid `sin(12)`
- `lin` — the same, ramping from each value to the next: `0 1` is a triangle,
  the default braid a saw
- `&table` — look each value up first, then amp

**A voice's own: env= and pitch=.** Envelopes are cells — the attack/decay/
sustain/release parameters are gone. A cell with `map=adsr` holds attack,
decay, sustain and release (seconds; sustain a level). A voice carries it with
`env=` — a volume acting on every note it plays — and its vibrato with
`pitch=`, added to every note:

    &lead s=saw loop=C4 env=&(map=adsr .01 .3 .4 .4) pitch=&(map=lin loop=5 0 .15 0 -.15 0)

Written in place they hang as petals of the voice; named, one envelope serves
several voices (`&pluck map=adsr .005 .3 0 .2`, then `env=&pluck`). They're
exactly what the same cells would be in the mix (`&tune * &env * &lead`,
`(&tune + &vibrato) * &lead`) — written once, on the instrument. As
a factor it shapes each note it multiplies, from the note's start through its
release. A mix can be used like a voice — an instrument: the pitches, volumes
and gain acting on it act on each of its voices (`a * (s + t) = a * s + a * t`):

    &bass [&(map=adsr .04 .3 .6 .5) * &saw, &sub * 0.6]   # an instrument with its envelope
    &mix loop=SAMPLE_RATE map=sample [&tune * &lead, &roots * &bass]

**map=lin everywhere.** Values ramp to the next instead of holding: a voice's
waveform (round its cycle), a volume (a fade, a swell — the last value holds
until the braid starts again), a pitch (a gliding vibrato). In a product a
`map=lin` cell is a volume; inside a pitch sum, `(&theme + &vibrato)`, it's a
pitch.

With no braid a voice holds 0…11 of the 12 grid: a 12-step saw. Or name a
built-in waveform with dough's `s=` (sine tri saw square pulse white pink
brown). Sound parameters use dough's names: `lpf lpq hpf hpq penv pdec room delay`
(levels and stereo are the mix's job; envelopes are cells, `map=adsr`). A
voice with no envelope in its product plays quick and full. A braid of voices
(`&kit &bd &sd &hh`) is a table of voices: a pattern read through it,
`&drums over=&kit step=&bar/2 0 2 1 2`, is a signal — mix it as it is,
`[&drums * 0.6]`; its numbers pick the drum. Rendering uses Tone.js.

Braids: a list of steps, a generator, or blank (the identity of the table
below). Steps: numbers (`.5` ok), `~`, `[0,2,4]`, `&cell`, `&cell[i]`, `&cell[a:b]`; modifiers `!n`
`*n` `@n`; accidentals `6#` `3b`. Generators: `scan(intervals)` — running totals, its lap their sum (an interval
can be `geo(r, n, k …)`: r^(k/n) for each k, a geometric series; `x!n` repeats
it n times):
`scan(2 2 1 2 2 2 1)` is the major scale (0 2 4 5 7 9 11, lap 12), `scan(3 3 2)`
the tresillo (lap 8), `scan(27 23 26 24)` a bent 4/4 bar (beats at 0 27 50 76 %
of a lap of 100); turning a scan walks its modes — and `sin(n)`. A root is a bare grid: `&edo19 cycle=19`.

## Examples, and your pieces

Tap the title in the header to choose a piece: every example and every piece
you've saved, as cards with their graph in miniature, filtered by tag (exercise,
étude, caprice, fantasy, rhythm, harmony, jazz, baroque, electronic, tuning …)
and by words. There you can open a file, save to a file (`.cells`, plain text),
or save in this browser (where the browser allows it).

**A piece's card** is a note with a title: the first note with `title=` names
the piece, its label describes it, `tags=` tags it —

    &piece title="Swing blues" tags="jazz, blues, caprice" label="A 12-bar blues in C, swung …"

It's an ordinary note in the graph; the picker reads it, and a saved piece is
saved under its title.

Every piece is shown as one node — the same in the list, its details and the
library's graph: a wheel with its graph inside and its tags round the rim, its
facts as petals (how many cells; how long, or how often round), its label
beneath. The graph opens fitted; pinch (or ctrl + wheel) to zoom; labels show
when there's room, or on hover and press-and-hold. Every piece is shown as one wheel — its own graph in miniature inside, its tags
round the rim, named along their arcs where there's room — on its card, in its
details, and in the library's graph. Each says how long it is: when it ends, or
its cycle (every layer — melodies, meters, what oscillates, selects or turns —
back together: the least common multiple of their periods), and whether chance
makes every time round different.

The first view, **Select**, is the library (Select · Graph · Code are the tabs; on a
wide screen, Select covers both panes): as a graph by default, or as cards. The five
genres — classical, jazz, electronic, experimental, world — are the rim of one large
cell wheel, a braid of five named arcs at even angles (tap one to light its pieces); the
pieces and the other tags sit on the disc within, the tags as quiet words. The rim keeps
every colour (a tag's angle) in place; a tag's
saturation grows with its distance from the centre; tags one piece alone carries step
back when zoomed out; the tag chips belong to the cards. The library shows, one level up: every
piece a wheel and every
tag a node the size of how many carry it, laid out by the same physics as a
piece's graph — without its ranks, held together both ways: a cloud where
pieces that share tags gather. Tap a tag to light its pieces; tap a piece for
its card (description, tags, Open). A tag's colour is its angle round the
cloud's centre — the cloud is a colour wheel by construction — and each tag
washes its surroundings in its colour; the same colours everywhere tags appear.

| example | shows |
|---|---|
| Metronome (any meter) | the smallest piece: a bar, an instrument, and a beat (a volume stepped by the bar, the first louder); the tempo a slider |
| Key and mode | a theme read through two wheels you can turn |
| Meter and rhythm | `agogic()`, `even()`, ratios (`&bar/2`) |
| Motifs and reuse | three motifs make a whole tune; a shifted table reuses one |
| A table that turns | `step=cycle(&tune) stride=7`: round the circle of fifths |
| Canon | one theme, four voices, each `[<<]` further |
| Sound | waveforms from braids, `map=`, a vibrato added to the pitch |
| Stereo | two mixes for the two channels |
| Bell and scale | 12/8: the West African standard bell (x.x.xx.x.x.x) has the major scale's intervals — one `scan(2 2 1 2 2 2 1)` is the bell's rhythm and the melody's scale at once |
| Bach, Prelude in C | for Wendy Carlos: one figure reading a table of chords that turns a bar at a time (`stride=5`), on a resonant saw over a square |
| 8-bit: Korobeiniki, in Tetris form | arranged by a selector: A · A · B · B · A, and round (B, slower, is our own);  the folk song as a console would play it: a 25% pulse as the braid `0 0 0 1`, a 32-step stepped triangle, chords as `pitch=` arpeggios, noise drums |
| Coltrane changes | three keys a major third apart, B G Eb: the key turns `stride=-4 cycle=12`; a line of 1-2-3-5 then the next key's V7 |
| Bossa nova | the clave as a meter, `scan(3 3 4 3 3)`, five strokes a bar; the guitar strums on its strokes |
| Alpha | Carlos' alpha scale (`map=ed(3/2)`, nine steps to the fifth, no octave): triads that ring true |
| Study after Studie II | Stockhausen's system: 25 steps to 5:1 from 100 Hz, mixtures of five sines, durations from the same series; a retrograde eight steps higher |
| Just intonation | a ratios grid: the same chords pure (left) and tempered (right); ii's fifth, 40/27, out of tune |
| Bach, Prelude and Fugue in C minor | BWV 847 in full, from the CCARH Humdrum encoding, written as its structure: the prelude's bars 1–24 as one figure read through two tables of four notes a bar (one per hand) that turn each bar, then its *Presto*, *Adagio*, *Allegro* as cells; the fugue as its subject and countersubject, entered in each voice at their transpositions (`over=&tones[>>7]`), the free counterpoint between as cells divided at the entries; a layout that shows it — lines in a row, their parts below in order, shared material at the foot. `tools/bwv847.py` writes it; the tests check every note as it sounds against the encoding |
| Pachelbel, Canon in D | a ground and three violins: one line of three variations (unnamed cells), each violin a variation later (`[<<]`) and entering a ground later |
| Pop song: four chords, arranged | I–V–vi–IV as scale-degree chords (each comes out the right kind); a hook reused a step up |
| IDM: drill (revised) | after Aphex Twin: a breakbeat through a kit, every other bar retrograde; ratchets (`2*3`); hats seven against four (`*4/7`); triplet bleeps in Lydian |
| Acid-Cell: everybody needs a 303 | a resonant saw whose filter envelope opens on every note — further on accents (`lpf=110..3800 * &fenv * &accent * &knob`) — while knobs turn the cutoff and resonance slowly; a dotted-eighth echo; a drum machine |
| Zelluläre Aktivität | in the manner of Kraftwerk, an original, arranged (it builds layer by layer, breaks, returns, ends): Am–F–C–G; the bass's octaves transposed (`&oct^-4`), the arpeggio read on each chord's step of the scale (`over=&minor[>>5]`) under a slow filter sweep; a plain melody with echoes in time |
| 5 to 12 | a day of music, anchored to the clock (11:55): 12 modes, 144 keys, every bar all seven notes on its mode's 12/8 bell, five dimensions in counterpoint — law=fiveto12 (src/engine/fiveto12.ts). The sun (sun=&cycle) shows the day — noon above, midnight below; a tape keeps memories (a minute back) and messages (twelve bars back); strings on every semitone ring with it (reflection) and to a hand (inspiration) |
| Harmonograph | two forks, a tonic and its fifth, struck together; each drives one axis of an oscilloscope: a 3 : 2 Lissajous figure, turning, shrinking |
| Kalimba | eight tines, each a resonator, all coupled to one shared box; a tune plucks them — tap them to play along |
| Baustelle II: Resonanz | the building site's metal rings: a plate hammered where the pattern says, a beam, a wire, a kicked spring; a tape loop of the site drives two pipes |
| Two Tuning Forks | two forks on one table: one struck, the other — never struck — begins to sing; detune it and they beat. Tap, hold, drag them |
| Test Tones on Tape | in the spirit of Hainbach: sine generators, a beeping test oscillator and noise swells on seven seconds of worn tape that hardly erases — three heads (two wandering), hiss, print-through, dropouts; the motor dies into a tape stop |
| Sound on Tape | a plucked tune and a pad, on a 4-second sound tape loop on a wowing reel: three heads, every lap darker and warmer; hold the reel and the tape bends down |
| Echo Tape | a tune on a tape loop: three read heads echo it, older passes fading to ghosts; hold the reel and the echoes sag |
| Tape Machine | a tape loop on a machine that turns: spins up (pitch with it), wows, the hats on a slack belt; at the end the tape stops, its pitch diving |
| Automaton | a mechanical band on belts: bells taut and exact, a drummer slack and swinging, a woodblock that slips and stays behind |
| Music Box | a clockwork box: wound, it spins up, plays its tune, and as the spring runs down it slows and stops — physics, not a ritardando |
| DTMF | a telephone keypad: type a number (default 867 5309 ABCD .#) and it's dialled — each key a row's sine and a column's, a space a rest |
| Cell Phase | after Steve Reich's Piano Phase: one pattern, two pianos, the right one at 81 notes to the left's 80 — a ratio of clocks — drifting through all twelve alignments; euclid(5, 12) on wood |
| Cell Tines | FM after the DX7: an electric piano of two pairs (1:1 body, 14:1 tine), bells at 3.5:1, an FM bass |
| Cell in Focus | slow, serene, looping (after Aphex Twin): four chords breathing through a filter, a bell arpeggio of their tones thinning by chance |
| Hypercell | 90s happy hardcore / eurodance at 160: offbeat bass, rave stabs, a hook on two detuned saws, risers and rolls; fifteen sections, three minutes, ends |
| One more Cell | French filter house: one maj7 shape chopped and moved F G A B♭, one long filter sweep, pumping on the beat, disco octaves, a robot lead |
| Cellular Brothers | big beat: a crushed breakbeat, acid, a distorted riff, a siren, builds; ends after 2:34 |
| Ghost-Cells | dark, looping: a piano phrase of seven eighths over eight, drifting; distorted drone, crushed noise on prime periods, sparse heavy hits by chance |
| Baustelle | an original in the manner of Einstürzende Neubauten: beams, pipes and plates struck and tuned to their own partials (map=ratios grids: a beam rings 1 : 2.76 : 5.40 : 8.93), the hand's irregularity by chance; a sub-bass kick, a crushed riff, the Bassfeder (a falling saw into a 19 ms comb); a grinder that swells, a drill, a scream through moving vowel filters; it builds, breaks, returns, collapses, ends |
| Cellscape II feat. Stockhausen | no octaves (25 steps to 5:1), no beat (every layer its own clock, a prime number of steps: 11, 7, 13; LFOs on primes of seconds), no instruments (sines and noise); mixtures and their retrograde 8 steps higher, glints by chance (a slider), chosen ripples, beating drones, a drifting noise band |
| Cellscape | an ambient cycle of twelve scenes, a fifth apart in Lydian: a breathing drone, a sequence under a sweep, a canon at the octave in thirds and octaves (consonant turned either way up), drifting bells, a pulse, glass; one score (&scenes) read by two barrels, one for each ear |
| Five | an original tune in 5/4, felt 3 + 2 (after the groove of Take Five): the blues' swing meter and pentatonic; the harmony turning on beat 4; the answer a step up the scale |
| Swing blues | a 12-bar blues: the blues scale and the minor pentatonic as scans; swung eighths as a meter of their own (`scan(free(2, 1..3) 1)`: the swing ratio is a slider); the changes moving the walking bass and the comping |
| Lullaby | Brahms' *Wiegenlied*: a music box in 3/4; the second phrase is the first, a step lower |
| Viennese waltz, Drunken sailor | motifs reading through their player; a kit |
| Royal theme, Canon per tonos | stepped keys and modes; a canon at the fifth that climbs |
| Ricercar: a study in counterpoint | the King's theme, a pass per stage from strict to free: alone · first species above · below · second · third · free in three voices — every line written by the rules (`tools/counterpoint.py` searches for them) and checked by them in the tests, on what sounds, also as the key climbs per tonos |

## Screen

**Shorten** (in the code view): reads the code like a linter and offers what's
written out longhand, shorter — runs (`0 0 0 0` → `0!4`); a phrase written more
than once, anywhere, as a cell of its own used where it was (as written,
backwards `&m[::-1]`, or — where the numbers are grid steps — transposed
`&m^7`); fractions (every step held a multiple of n: divide it out and slow the
clock, `4@2 2@2` with `step=&bar/2` → `4 2` with `step=&bar`). The measure is
the code's length (a new cell's line counts too); the promise is the sound: the
tests apply every suggestion to every example and compare every note.

**The graph's arrangement** is a layered drawing, the textbook way: rows by
signal flow (the sound card on top, voices, melodies, the parts and tables they
read — tuning a row under content — and the meter at the bottom), each row
ordered to cross as few edges as it can (an edge to the meter counts a quarter:
it says when, not what), each node placed towards its neighbours. The physics
only relaxes it — a spring to each node's place, no overlaps — and nothing is
pinned. Drag a node to put it elsewhere. From that start, balanced forces give each
graph its own shape: edges contract, nodes repel and leave room for labels, the
edges at a node spread round it (stars and mirror symmetries emerge), meters
and sound keep apart, tagged cells cluster; crowded rows become tracks (a
cell's parts in a column under it).

**Code editor**: coloured as you type — cells, attributes, generators,
numbers and note names, modifiers, quoted text, comments (a coloured copy under
the text, so typing, selecting and the phone's keyboard stay native); lines wrap (each number stays at the top of its line); A− / A+
or a two-finger pinch zoom the code (13 px on a phone, 15 on a desktop).

**Theme**: one place — the variables at the top of `src/app.css` (surfaces,
ink, accent, status, the note rainbow, radii, spacing, type sizes, shadows);
components use those names only. Colours computed in code (note fills in SVG)
come from `src/ui/theme.ts`, which mirrors the note settings. The palette is
the note rainbow — C red, D yellow, G light blue … — in the notes and spectra,
and in the chrome: the title, the active tab, Play's rim while playing. The
chrome itself is muted and neutral, so what sounds and what you act on shine:
nodes at rest are quieter and less coloured, sounding ones full with a soft
glow. Motion is subtle: a melody's wheel eases into a turn, a hub value that
changes pops once, the sheet rises in — and none of it with reduced motion.

On a phone, **Graph** and **Code** are two full-size views switched by tabs
under the header (the Code tab shows a count when there are errors; *Show in
code* in a cell's sheet switches to it and selects the line). Both views stay
mounted, so the graph keeps its layout while you edit. On a wide screen they
sit side by side.

## The graph — a visual editor over the code

**Editing** (every change is a rewrite of the cell's line; the text stays the source):

- **+ cell** adds a blank cell — the chromatic default, the 12 grid — at the origin
  and opens it.
- In a cell's sheet the **wheel is the editor**: one pod per written step, as
  long as the steps it takes, labelled with its number or cell and coloured by
  the pitch it sounds.
  - **Tap a pod** (a braid written by hand): a smart field for that step. Its
    first line is the value bar — one tap sets the value, in the colour it
    sounds; typing completes cells and then brackets (`&m` → `&mode`, `&mode[` →
    `[<<]`, `[0]`, …). A number gets spinners for a step and an octave (the
    length of the table it reads: 12 chromatic, 7 for a scale). Split and Delete
    are the only other actions. **+ step** appends one: build a braid step by step.
  - **Tap the hub**: the whole braid as one smart line — its steps, or its
    generator — completing cells, brackets and functions, checked as you type.
  - A braid **generated** by a function (`even()`, `agogic()`) shows the function
    in the hub and its pods dimmed: change the function there, or replace it with
    steps to edit them one by one. An empty braid shows the default grid dimly.
- **Rename** by tapping the name: the declaration and every reference follow.
- **Parameters** are rows (`over &mode`, `step &bar` …) — none on an empty
  cell. Sound parameters are offered only for a voice: a cell looping at
  audio rate (`loop=` of 20 Hz or more). Tap a row, or **+ add**, for the same pop-up as a step: the key, a smart
  line for the value (completing cells, scales, cycles, rates, notes, maps,
  sources by key, checked as you type), Delete.
- **Delete** asks first, and says which cells use it.
- Edges come from the references in the code.


The code is the single source of truth. The graph draws exactly the cells
and links written, and every change made in it is a rewrite of the cell's own
line (`src/engine/edit.ts`), so the two views stay 1:1:

- **Tap** a cell: a detail sheet to turn it (drag the rim, − / +: writes
  `shift=`), switch it on/off (writes `off`), pin it in the layout, or jump to
  its line in the code.
- **Hold**: quick toggle of `off`.
- **Drag**: moves the cell (physics keeps the rest arranged).

Pinning is layout, not music, so it isn't in the code (yet).

## The graph (drawing)

- **Braids** are drawn as what they play: every `&ref` is expanded all the
  way down and coloured through the cell's own table, so `&leadA` (made of
  `&m1 &m2`) wears the motifs' colours, and a cell of cells of motifs too.
- **Voices, mixes and the sound card** are wheels that don't spin: a spectral waterfall. Left channel
  on the left half, right on the right; 20 Hz meets at the bottom, 20 kHz at
  the top (log scale); the newest frame at the hub, flowing outward. Colour
  is frequency — red at 20 Hz to deep violet at 20 kHz — and brightness is
  level. At rest a voice shows its own partials at pitch 0.


Exactly the cells and links written in the code (the implicit default grid
is not drawn). Roots sit at the centre; cells ring outward along the tables
they read through. Tables
(roots, scales, meters) are drawn as their entries on the grid below;
melodies as slots in time. Drag a hub to move, a rim to shift,
hold to switch off, double-tap to pin. While playing, every table a note
passes through lights the entry it used.
