# The tower strip: the sound card as the tower, the graph laid by it (mock-ups)

Date: 2026-10-11 · Status: open (mock-ups for the owner; nothing built) · Issue: [#234](https://github.com/yggi/cell-studio/issues/234) (the multiscale epic) · Follows [tower-rows.md](tower-rows.md) and [outputs-top.md](outputs-top.md)

## The ask, read back

Subject: the Viennese waltz (`examples/waltz.cells`).

1. **The tower is always there**, as a strip at the side of the graph, and opens wider on demand (today it is the *tower* button's axis, [graph.md](../ui/graph.md)).
2. **No sound card node** (`&out`, or the sink mix: the waltz's `&mix`). The strip is the sound card.
3. **Each sound output leaves the top of its source and goes into the strip.** The strip's connector shows that source's spectrum (its partials, up high, down low); all of them together are the piece's spectrum. Stereo: left and right apart; mono: symmetric.
4. **A node that sends sound out has a fixed height: its base frequency** (`loop=C4` → 262 Hz on the tower's log axis). **`&bar` and every other stepped cell is fixed at its tower height too** (its step: the waltz's bar and its three melodies at 2.8 Hz). Only x is left to the layout.
5. A **parallel layout** (beside today's, switched by an option, as `?rows=tower` is), since it moves every metric.

## Mock-ups

Drawn from the waltz's real tower heights (`towerSpans`: the bar and its melodies at 2.8 Hz, the tuba at 65 Hz, the flute and the strings at 262 Hz), by hand-placed x, at one moment (beat 1: the flute on B4, the tuba on G2, the strings' chord G B D). `tools/mockups/tower-strip.py` makes them (an HTML page; screenshot it in Chromium).

Today:

![the waltz today](tower-strip-before.jpg)

The options:

![A1 folded, A2 opened, B two strips](tower-strip-options.jpg)

- **A1, one strip, folded** (always there, 44 px): each voice's wire leaves its top (its socket sits exactly at its base frequency), runs level into the strip, and the strip shows every source's partials in its colour, mirrored about the centre line.
- **A2, the same strip opened**: the axis (decades, zones), the sources named at their base, the stepped cells as a mark at their row.
- **B, two strips, the graph between the speakers**: L at the left edge, R at the right; every wire splits at its voice's top, a strand each way. Reads stereo at a glance, but every sound wire crosses the whole graph twice.

Stereo in A (if the strings had `pan=-.6`):

![A3 stereo](tower-strip-stereo.jpg)

## Seen in the mock-ups

- **Rows are the tower.** The waltz falls into three rows: the pulse (bar, tune, oom, pah), C2 (tuba), C4 (flute, strings). Height in the graph now means time; the dotted guides are the rows.
- **Voices at one pitch share a row**: the strings' wire runs through the flute's socket. Drawn here as one bus of two strands from there on; in general the voice nearest the strip should sit on the strip's side, or the wires take lanes.
- **A voice's actual notes live above its base**: the flute is fixed at C4 but plays B4; its partials enter the strip above where its wire does. The connector (the coloured bracket on the strip's edge) spans the source's range.
- **The pulse row is crowded**: four wheels at one height, the meter's net a straight trace along it. Pieces with many melodies at one rate will make wide rows (the tower-rows probe's main cost).
- **Wires to the strip cross the graph** at their pitch's height: a low voice far from the strip passes under the higher ones. The layout's x should pull sound sources toward the strip, lowest first.

## Open questions for the owner

1. One strip (A: halves are L and R) or two (B: a strip at each side)? And which side for A (mock: right)?
2. The vertical scale: an even log scale (the mock: 250 px a decade, so 5 decades ≈ 1250 px), or empty decades squeezed (the waltz has nothing between 3 and 65 Hz)?
3. Does a voice's centre sit at its base frequency, or its socket (its top, as mocked, so the wire runs level)?
4. A sub-mix that is not the sound card (a mix of mixes) keeps its node, its own output into the strip at the height of what it carries?
5. Cells with no height (a table nothing steps, a scope, a note): at the bottom (the constant), or free?

## Next

Once the shape is chosen: `LayoutOptions` gets a tower mode (y fixed per node from `towerOf`, x by the forces), the sink's node and its edges drop from the drawing, the strip replaces `TowerAxis.svelte` with the live spectra per source (the audio side has each voice's analyser), and the waltz and the probe's metrics are measured both ways.
