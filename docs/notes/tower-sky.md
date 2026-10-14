# The tower's sky: sockets as spires, the strip's sum in its sources' colours, one tiered strip

Date: 2026-10-14 · Status: open (a prototype in the tower layout; the owner's choices of 2026-10-14 built, below) · Issue: [#234](https://github.com/yggi/cell-studio/issues/234) (the multiscale epic) · Follows [tower-strip.md](tower-strip.md)

## The ask, read back

1. **The audible sky.** In the tower layout, the audible stratum is a muted spectral rainbow behind the graph. Each socket's level meter becomes an **antenna spire** that sends its spectrum into the open sky, brightening it, tinted in its **section's colour**, and locked to the scale of the frequency strip at the right.
2. **The strip's sum.** The spectrum in the strip is the sum of every out and keeps the sources' colours, so it always reads as the sum of the sources.
3. **Alignment.** A marker in the strip sits at the height of its out-node (on a phone, Cellscape's `glint · sine · droneB · ripple` marker was far under its socket).
4. **The strip's markers**, refined and discussed.
5. **The time view shares the mechanism**: an audible stratum (waterfall, notes; voices and outs in the graph) and an inaudible one (scalogram; the structure's nodes), and a tiered frequency scale as a smart strip at the side.

## 3. Alignment: fixed, in #408

The marker sat at its source's top, not at its socket; the fix, its test and its before/after are in [tower-strip.md](tower-strip.md#markers-level-with-their-sockets-2026-10-14).

## 1. The sky (prototype, `TowerSky.svelte`)

- **The sky** is the audible part of the tower's scale (20 Hz … 20 kHz) across the whole graph, behind it: a band a semitone in its note's colour by its octave (the notes' gradient, theme.ts `noteHsl`: full saturation in the fourth octave, darker below, brighter above), muted (9 %), the same rainbow as the strip, on the graph's own scale (it pans and zooms with it). Under 20 Hz it fades out: there the structure stands.
- **A spire** stands at each socket: a mast from its lowest sounding band to its highest, its levels as bars out from the mast *at their own heights* (the left channel to the left, the right to the right). So the meter is scale-locked: a C5's mast starts at 523 Hz and its partials step up it. A socket lifted to the audible's floor (a bass, a groove's drums) has its mast reaching down under it to its real fundamental.
- **The light**: each band a glow out from the spire, as far and as bright as it is loud (up to 1100 px at zoom 1), added (`lighter`), so the sky brightens where several reach, and softened over a few semitones. Stopped, the partials at rest, faint; playing, the live spectrum at 30 fps.
- **The out's colour** is its source's note now (its base stopped), by octave, the colour its socket's meter and its wire wear: one colour an out, everywhere (`outRgb`, `ui/heard.ts`); drums and noise white. (A tint per out, round the colour wheel, was a stop-gap, dropped: below, *The outs by their notes*.)
- `heard()` (`ui/heard.ts`): what a socket hears, a groove's or kit's drums together. The socket's meter, the spire and the strip all read it (the strip used to see nothing of a kit).

Three ways to light it (`?sky=tint|rainbow`, `?sky=off`; the gallery's `SKY=`), Pop at 45 s, real audio (taken before the octave gradient and the colours per out) (`QUERY='layout=tower&strips&sky=rainbow' node tools/gallery.mjs play 45 "Pop song: four chords, arranged"`):

![today, A tint, B rainbow, C mix](tower-sky-options-pop.jpg)

- **A, tint**: the light in its section's colour. Which part lights which height reads at a glance: the bass's red low, the keys' green over it, the lead's blue. Pitch is read from the scale, not the colour.
- **B, rainbow**: the sky's own colour at that height brightened. The sky stays a true spectrogram (C red at every octave), but neighbouring sources blend and nothing says which spire lit what. Only the masts are tinted.
- **C, mix**: half of each.

Chosen (the owner): **C, the mix**, the default now.

The pieces as built (the mix, the octave gradient, each out in its note), real audio at 45 s (`node tools/gallery.mjs play 45 …`, `QUERY='layout=tower&strips'`):

![Hypercell](tower-sky-hypercell.jpg)

![Pop](tower-sky-pop.jpg)

![Cellscape](tower-sky-cellscape.jpg)

![The waltz](tower-sky-waltz.jpg)

Seen:

- The sky reads as a spectrogram standing on the graph: each part's light at its own heights, Hypercell's bass part low and red, its hook's saws high. Where many spires stand close (Hypercell's six outs over 900 px) the light runs together into one band; reach could scale with the space between spires.
- **The socket's meter and its spire say the same thing twice.** The spire is the scale-locked meter; the round meter could become just its foot (the wire's end and *out*), keeping its room in the layout. Not done: the owner's call.
- The socket, its wire, its spire and its share of the strip now wear one colour, the source's note.
- Cost: not profiled yet (the profile skill is next before building it out). One canvas at half resolution, about 60 bands × 2 sides × the spires a frame, and one blur.

## 2. The strip's sum: stacked in its sources' colours

Each band's bar is as long as its loudest source (as before) and is split into the sources' shares (each source's level over their sum), each in its colour, the sources in the graph's order from the centre out. `?sum=max` (the gallery's `SUM=max`) brings back today's single bar in the band's colour (the first tile above). In Hypercell's strip the bass part's red holds the bottom and the other parts' tints stack over it.

The shares are of levels on the meter's dB scale, not of power: a display, not a mix. A true sum (power added per band, then a level) would make the bar longer where sources overlap; worth trying once the tints are chosen.

## Red or white: a 0 that means nothing is white

The owner's rule ([decision 036](../decisions/036-one-value-is-white.md)): any value but 0 is always coloured, so the only question is 0, red (C) or white, and it is white *if another value would not mean anything different for this wheel*. Measured, not guessed (`tools/probe/colours.test.ts`): each of the library's 102 cells whose steps are all 0 played with 7 in their place, over each piece's hearing (ten minutes at most), every note compared.

| | cells | what they are |
|---|---|---|
| **white**: no note changes | 67 | 57 section clocks (a tap a selector steps on: `&bassBar 0`), 6 read only as a clock, 4 grooves over a kit of one drum (Korobeiniki's `&hats`, Jazz's and Coltrane's `&ride`, the arrangement's `&kick`) |
| **red**: notes change | 35 | 30 played on a voice as its pitch (a kick on a sine, Hypercell's offbeat bass `&off`, ticks, strokes), 3 spliced into a melody (the waltz's `&I`), 2 grooves over a kit of several drums |

The rule that reproduces it, structurally (`blank`, `layout/cellview.ts`; the probe checks it agrees, and it does on all 102): every step 0; a clock of its own; nothing leaves it but a clock's tick, a tap into its table, or a one-drum groove's sound; no table read but a kit of one drum. A first try (*one value only*, any value) was wrong both ways: it turned Hypercell's `&off` white (its 0 is the bass's note) and Pop's `&hats` (a 2) too.

Korobeiniki before and after (`&hats` and its wire white; `&octaves`, a pitch, red):

![Korobeiniki, a 0 that means nothing white](unit-white-korobeiniki.jpg)

## The outs by their notes

If each out wears its source's note (the owner: sources drive the value), how often do two share a colour? `tools/probe/colours.test.ts`, 63 pieces with two outs or more (220 outs):

| | two outs on one colour |
|---|---|
| at rest, by pitch class (each out's base) | 104 outs share one with another |
| at rest, by pitch class and octave (the notes' gradient) | 41 |
| playing, each out's lowest note, by pitch class | 53 % of the time two outs or more sound |
| playing, each out's lowest note, by pitch class and octave | **16 %** |

So the octave gradient does most of the work: by pitch class alone half the time two outs look alike (harmony: a bass and a pad on one root), by pitch class and octave one time in six, and then they are playing one note, the same colour truthfully. Built: the note by octave, no tint on top. A tint per out would tell those apart, but it is a colour that says nothing about the sound. Where it matters, the strip's stack still keeps them apart by place: the sources in the graph's order, from the centre out.

## 4. The markers

![the markers' options, each question A (now) and B, on Hypercell's outs](tower-sky-markers.jpg)

The options, each question A (now) and B (`tools/mockups/tower-markers.py`, Hypercell's outs: four sockets on the audible's floor, the bass part's fundamental two octaves under it). Its parts are nearly all on C, so by note they are nearly all red: the probe's point, seen.

Now: a notch at the strip's inner edge, level with the sockets, pointing in, in the first source's colour; a thin line a source over its range (the bands within about 30 dB of its loudest), side by side; opened, the names. Open questions, with my recommendation:

1. **Several sockets at one height** (Hypercell: four on one row, `bassPart · stab · kit:voices · hookP…` cut off). They share a notch today. Recommended: a notch each, side by side in the graph's order and in their own colours, the names stacked one a line when opened.
2. **The drums' name**: the kit's internal name `kit:voices` shows. It should be *drums*, the kit's name in the graph.
3. **A lifted socket** (sits at the audible's floor, sounds lower): its marker is at its socket, its sound below it. Recommended: a short leader down from the notch to its fundamental on the scale, so marker and sound both show.
4. **The range lines** sit under the left half's bars and get lost there. Recommended: drop them; the spire shows the range in the graph, and the stacked sum shows it in the strip.
5. **Live**: the notch could pulse with its source's level, the strip's markers acting as the outs' meters when the graph is scrolled away from them.

## 5. One tiered strip for the graph and the time view (proposed)

Three things draw the tower's scale today, each its own way:

| | where | scale | tiers | content | markers |
|---|---|---|---|---|---|
| `TowerStrips` | the tower layout, at the right | the graph's even log scale (360 px a decade), panned with it | a rail of zone colours, a tick a decade | the rainbow, the sum spectrum | the outs (notches, names) |
| `TowerAxis` | today's layout, at the right | balanced with the graph (`towerFit`) | zones named | — | every node's span, a line to the selected |
| the time view (`timeview.ts`, `timedraw.ts`) | its own frame, log from the window to 40 kHz | even log | zones banded, named at the right | waterfall, notes, scalogram | the ridges heard (`arp step`, `beat`), the meter's lines |

They share the zones (`TOWER_ZONES`) and `towerOf`, nothing else. Proposed: one component, a tiered **smart strip**, given a scale function (decades → y: the graph's, the time view's frame, or the balanced one), with the same tiers and the same marks in each:

- **card** (over 20 kHz): the waveform (the time view's), the card's samples.
- **audible** (20 Hz … 20 kHz), ticks as octaves (C1 … C9) and decades in Hz; content: the muted rainbow and the sum, stacked in the sources' tints; markers: the outs (the graph's sockets; the time view's voices, the ones its legend lists now).
- **pulse** (0.5 … 20 Hz) and **slow** (under 0.5 Hz), ticks as times (1 s, 10 s, 1 min); content: the scalogram's ridges (its row means), the inaudible counterpart of the sum: how much is going on at each time scale; markers: the meter's levels named (beat, bar, section) and the structure's cells at their rates (`arp step`).
- **constant**: a cap at the bottom, the tables nothing steps.
- *Smart*: a tier with nothing in it folds to a thin band and gives its height to the others (the time view's empty card; a piece with no slow form); folded (64 px), content and notches; opened (180 px), names and ticks.

Mock-up, Cellscape's numbers (`tools/mockups/tower-scale.py`): the graph with its sky and spires, the strip beside it, and the same strip at the time view's side:

![one tiered strip, at the graph and at the time view](tower-sky-scale.jpg)

Then the strata line up across both views: the sky in the graph is the time view's waterfall and notes (sound, by pitch), the graph's structure under it is the scalogram (time scales, by period), and the strip at the side is the same scale for both. Built as `layout/towerscale.ts` (tiers, ticks, folding: pure) and `TowerScale.svelte` (drawing), replacing the scale parts of `TowerStrips`, `TowerAxis` and `timedraw.ts`. Worth it only once the sky and the markers are chosen; a PR of its own.

## Next

1. The owner chooses: the socket as a foot or a meter; the markers' options (4).
2. The time view's voices are a hue each (golden angle), not their notes: align them with the graph's (the colour table, [ui/theme.md](../ui/theme.md#colour-rules)).
3. Profile the sky while playing (the profile skill) before it goes on by default.
4. The tiered strip (5), its own issue.
