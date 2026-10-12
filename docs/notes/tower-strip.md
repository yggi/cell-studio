# The tower strip: the sound card as the tower, the graph laid by it

Date: 2026-10-11 · Status: open (built as a layout of its own, off by default) · Issue: [#234](https://github.com/yggi/cell-studio/issues/234) (the multiscale epic) · Follows [tower-rows.md](tower-rows.md) and [outputs-top.md](outputs-top.md)

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

## Chosen (the owner, 2026-10-11)

1. **B**: two strips, the left channel at the graph's left edge, the right at its right.
2. **An even scale** on the strip (a rainbow: a band a semitone, in its note's colour), the same as the graph's.
3. **A voice's top** sits at its base frequency (its wire runs level).
4. A mix that isn't the card keeps its node and sends its own wire into the strips.
5. Cells with no height: wherever the layout puts them, **minimal forces**, heights fixed; a separate graph layout, `tower`.

## Built

- `layout/towerlayout.ts`: `towerHeights` (each node's y held: a voice's top at `towerY(log10 f0)`, a stepped cell's centre at its step, `TOWER_PX` = 360 px a decade), `withoutCard` (the graph drawn without the sound card's node and its edges), `towerOuts` / `towerIns` (what went into the card, and where its wire leaves).
- `LayoutOptions.heights` (`physics.ts: hold`): each named node ends every tick at its height (d3's `fy`), dragged too; `TOWER_LAYOUT` the forces (first few: no rows, columns, spread, kinds, tags; now today's without the meters placed last, below).
- `GraphLayout.mode` (`'flow' | 'tower'`, `setMode` lays the piece out afresh); the toolbar's *tower layout*, `?layout=tower` (`?strips`: opened); the gallery: `LAYOUT=tower STRIPS=1 node tools/gallery.mjs golden 3 waltz`.
- `TowerStrips.svelte` (the strips: a canvas each, the rainbow, the zones, the spectra per band, the connectors), `TowerWires.svelte` (the wires, behind the cells, in the graph's coordinates).
- `towerlayout.test.ts`: the waltz's heights, no card, a two-channel card split left and right, heights held through the forces and a drag.

### Seen (the real Graph, the gallery's made-up sound)

The waltz, stopped with the strips open, and live with them folded:

![the waltz, strips open](tower-strip-waltz-open.jpg)

![the waltz, live](tower-strip-waltz.jpg)

*Pop* and the *Ricercar*, stopped:

![Pop](tower-strip-pop.jpg)

![the Ricercar](tower-strip-ricercar.jpg)

- The rows fall out of the tower by themselves: the beat (the bar and what it steps), the voices at their pitch, the form and the constant tables (free) lower down. Pop's drums nest by rate (the bar, the kick and snare, the hats); the Ricercar's tables sink under the voices.
- **Wires run level over what is in their way**: the tuba's crosses under the flute and the strings, Pop's mixes' wires over its voices' caps. A force that keeps a held cell off another's wire row (sideways), or wires taking lanes round a cell, is the next step.
- The colours of live wires and the live spectra in these pictures are the gallery's made-up sound (every voice on C4); the app's are the piece's.
- Measured over the library below.

## Measured (75 examples, three seeds)

`tools/probe/tower-layout.test.ts` (`PROBE=out.txt npx vitest run tools/probe/tower-layout.test.ts`, ~2 min): every example laid out as the app does (500 ticks, `layNet`), library sums, mean over seeds. *Over a cell*: a wire into a strip passing over another cell's body (0.7 of its room, at its height); *over an edge*: crossing a drawn edge (straight, centre to centre); each strand counted, so a wire into both strips counts twice.

| layout | crossings | cost | area Mpx² | pieces with an overlap | wires into the strips | over a cell | over an edge | wire length kpx |
|---|---|---|---|---|---|---|---|---|
| today (the signal path) | 46.3 | 134.6 | 73.7 | 0 | — | — | — | — |
| today, no card node | 33.3 | 118.1 | 65.4 | 0 | — | — | — | — |
| **tower** (heights held, few forces) | 130.0 | 397.9 | 124.6 | 0 | 480 | 152.7 | 406.0 | 366 |
| tower, today's forces | 80.0 | 255.0 | 104.3 | 29.3 | 480 | 154.3 | 402.0 | 341 |

57 % of nodes are held at a height (742 of 1305); the rest (constant tables, cells no clock reaches, tags) are free.

- **The card's node alone costs 13 crossings in today's layout** (46.3 → 33.3, −28 %, far outside the seeds' ±8): every voice's wire converging on one node. Taking it out is a win whatever the layout.
- **The tower layout costs crossings**: against today's layout without the card (the same edges drawn), 33 → 130, about four times, and 1.9× the area. Its pieces most hurt are the selector pieces again (Baustelle 9.7 → 17.7, Korobeiniki 5 → 13, Cellscape 3.7 → 11) and the tape and resonator pieces (Resonanz, Ghosts, Echotape 0 → 5–7); helped or even: Pop 1.7 → 0.7, BWV 847 0.7 → 0.3, the waltz 0 → 0.
- **Its wires into the strips cost more than the crossings**: 406 crossings with edges and 153 passes over cells, about one wire in three over a cell. Baustelle's alone: +22 over cells, +65 over edges. Two strips double it (each wire runs both ways); they are the price of option B.
- **Today's forces with heights held** cross less (80) but overlap in 29 pieces: the forces built for free nodes push in y, where nothing can move, and outweigh the collision sideways. The few forces keep nothing overlapping. A middle set (today's sideways forces, no y pushes) is worth a run.
- So, as [tower-rows.md](tower-rows.md) found for rows by the tower: **height by the tower costs crossings in today's language**, most where it arranges with selectors, tapes and resonators; contrapuntal and song-form pieces fit it. What the tower layout adds of its own is the wires' cost, the first thing to work on.

## Wires and forces (2026-10-12)

The owner's next two: cut the wires' cost, and a middle set of forces. Same probe, 75 examples × 3 seeds (`hops routed`: the hops the wires make round cells, below).

| layout | crossings | cost | area Mpx² | pieces with an overlap | over a cell (of them free) | hops routed | over an edge |
|---|---|---|---|---|---|---|---|
| today, no card node | 33.3 | 118.1 | 65.4 | 0 | — | — | — |
| tower, few forces (as first built) | 130.0 | 397.9 | 124.6 | 0 | 149.3 (0.7) | 136.7 | 406.0 |
| … + a sideways collision and free cells off the wires' rows (tried, dropped) | 132.7 | 433.4 | 144.0 | 0.3 | 151.3 (0.3) | 136.7 | 401.0 |
| … + spread | 135.3 | 437.7 | 122.1 | 0 | 148.3 | 136.3 | 406.0 |
| … + columns | 122.0 | 384.3 | 117.0 | 0 | 150.0 | 138.0 | 407.7 |
| … + row trials | 102.3 | 323.8 | 122.7 | 0 | 151.3 | 137.0 | 408.7 |
| … + meters last, held to their row | 118.0 | 365.1 | 123.0 | 8.7 | 148.7 | 136.0 | 407.7 |
| … + row trials, spread, columns | 108.3 | 352.2 | 116.5 | 0 | 151.0 | 137.0 | 406.3 |
| tower, today's forces (meters last held to their row) | 77.3 | 249.6 | 105.8 | 7.3 | 154.0 | 138.3 | 401.3 |
| **tower, today's forces, no meters last** (`TOWER_LAYOUT`) | **90.7** | **301.9** | **108.3** | **0** | 152.0 | 137.0 | 403.0 |
| … and no kinds apart | 93.3 | 318.1 | 108.2 | 0 | 152.3 | 136.7 | 402.0 |
| … and no tags | 102.3 | 350.9 | 110.7 | 0 | 150.0 | 136.0 | 406.3 |

- **With two strips a wire spans the whole graph** (from the left strip through its source to the right one), so no sideways move takes a cell off another's wire. And the cells under wires are held ones (149 of 150): a free cell is under a wire 0.7 times in the library. So pushing free cells off the rows (`rowClear`) had nothing to do, and a sideways collision for held cells (d3's pushes along the line of centres, and a held cell drops the vertical part) changed no overlap; both were dropped.
- **So the wires go round**: `routeWire` (`towerlayout.ts`) runs a wire level at its height and hops it over a cell in its way, or under it when its row passes through the cell's lower part, cells close together one hop; about 137 hops in the library, and no wire passes over a wheel any more. Its crossings with edges (~400) stay: an edge from below a row to above it crosses a wire that spans the whole width, whatever the layout does. They are the price of option B; one strip would halve them.
- **The forces: today's, without the meters placed last.** The overlaps with today's forces were the meters placed last: put at the best (x, y), then pulled back to their height onto a neighbour. A held meter is now sought along its own row only (`placement.ts`), which takes the overlaps from 29 pieces to 7, still not none; without it, none, and 91 crossings against the first build's 130 (area 125 → 108 Mpx²). Of today's forces, the row trials and the tags do the most; kinds apart a little; spread alone nothing.
- Seen (stopped, the real Graph): the waltz's tuba wire dips under the flute and the strings; *Baustelle*'s wires hop over its mixes, a dense web at the top but none through a wheel; *Pop*.

![the waltz, routed](tower-strip-routed-waltz.jpg)

![Baustelle, routed](tower-strip-routed-baustelle.jpg)

![Pop, routed](tower-strip-routed-pop.jpg)

## One strip, nets (2026-10-12)

The owner's next: **the strip to the right** (one strip, its halves the channels: option A after all), **wires into the strip crossing each other don't count**, and **the audio edge and nets** instead of plain wires: each base frequency a net, instruments on one base frequency tapping into it.

Built: `TowerStrips.svelte` one strip at the right (L half, R half, mirrored about the centre; a dot at its inner edge where each net comes in); `towerNets` (the wires gathered by their height, within half a pixel), `netPaths` (a trunk from the source furthest from the strip, routed; a riser from each other source); `TowerWires.svelte` draws them as an edge of sound (`.band-audio`, rippled at rest, `EdgePayload`'s wave while it sounds, the note's colour live).

Same probe, 75 examples × 3 seeds, nets counted once, their crossings with each other not at all:

| layout | crossings | area Mpx² | overlaps | wires (nets) | over a cell → hops | over an edge | wire length kpx |
|---|---|---|---|---|---|---|---|
| today, no card node | 33.3 | 65.4 | 0 | — | — | — | — |
| tower, `TOWER_LAYOUT`, two strips, a wire a source | 90.7 | 108.3 | 0 | 480 | 152 → 137 | 403 | 341 |
| **tower, `TOWER_LAYOUT`, one strip, a net a base frequency** | 90.7 | 108.3 | 0 | **175** | **63 → 63** | **171** | **133** |

- The nets' crossings with edges fall by 58 % (403 → 171), their passes over cells by 58 % (152 → 63, each now a hop), their length by 61 %. Half of it is the one strip (a wire no longer spans the whole width, only from its source to the right), the rest the nets (sources on one pitch share a trunk: 480 wires were 175 heights).
- The layout itself is unchanged (the nets don't pull on it): 91 crossings against today's 33 without the card.

![the waltz, nets into one strip](tower-strip-nets-waltz.jpg)

![Pop, nets into one strip](tower-strip-nets-pop.jpg)

*The waltz* (live, the gallery's made-up sound): the C4 net leaves the flute, the strings join it; the tuba's net dips under their labels. *Pop*: the parts' mixes sit just above C4 and share one net; the bass's part its own.

## The card everywhere: a socket each (2026-10-12)

**Crossings on main (#332), 76 examples × 3 seeds:** today's layout 45.0 (cost 137.1), today's without the card's node **24.0** (80.4: the card's node alone is half of today's crossings, #309), the tower layout 99.7 (337.0) and its nets into the strip a further 165.3 crossings with edges.

The owner's next: **no single out-node; each thing that goes into the card goes into a socket of its own**, by its audio edge; **a socket is a multiband level meter**, symmetric and stacked; **held at its frequency on the strip's scale**.

- `withSockets` (`towerlayout.ts`): the card's node goes; each edge into it keeps its id (what it carries, its live state) and ends at a socket (`socket:<edge>`, a small node in the layout, room 40). `socketHeights`: a socket is held where its source's sound sits on the tower (`towerOf … 'emit'`): a voice at its base frequency, level with its top; a groove at its lowest drum (its drums are pieces of the drums' kit, no node of their own).
- `SocketNode.svelte`: ten octaves stacked, the low at the bottom; each a bar out from the centre line, the left channel to the left, the right to the right (mono: alike); in its source's note's colour (drums: neutral). Stopped, its source's partials (a groove's drums together), faint; playing, its live spectrum. Tapping a socket opens its source.
- The strip stays at the right as the tower's scale and the piece's whole spectrum; the nets into it are gone (`?outs=nets` brings them back, to compare).

| tower layout (76 × 3) | crossings | cost | area Mpx² |
|---|---|---|---|
| nets into the strip | 99.7 (+165.3 nets over edges) | 337.0 | 103.0 |
| **a socket each** | **117.3** (its socket edges included) | 316.5 | 123.7 |

So the sockets cross less than half of what the nets did with the layout's own (117 against 265), at 20 % more area: a socket is a node of its own beside its source.

![a socket, close](tower-strip-sockets-zoom.jpg)

*The waltz* (live, the gallery's made-up sound): the flute's and the strings' sockets beside their tops, the meter's bands on C4.

![the waltz](tower-strip-sockets-waltz.jpg)

![Pop](tower-strip-sockets-pop.jpg)

*Pop* (stopped): the hook's, the keys' and the bass's sockets at their pitches; the hats' and the beat's at their kick's, A1.

![Hypercell](tower-strip-sockets-hypercell.jpg)

![Korobeiniki](tower-strip-sockets-korobeiniki.jpg)

## Layers and a scale force (2026-10-12)

The owner's next: **a gentle scale force** pulling every node to its height instead of holding it there; **layers**: tables nothing steps pulled to the bottom, the structure (each stepped cell at its rate), **the voices between the structure and the audible** (voices, mixes, kits, tapes, resonators: one row), **only the sockets in the audible**.

- `towerLayers` (`towerlayout.ts`): each node's target and layer. The voices' row sits half-way between the structure's top and the lowest socket, a layer's gap (0.6 decade) over the structure at least; the tables a gap under the structure's bottom.
- `LayoutOptions.heightPull` (`physics.ts: hold`): 0 holds each node at its height (a rail, as before); more draws it towards it by a spring of that strength (a target). The tower layout's default: .05 (`TOWER_LAYOUT`); `?pull=.1` (the gallery's `PULL=.1`) to compare.

| tower layout, a socket each (76 × 3) | crossings | cost | area Mpx² | off its height, decades (mean, most) |
|---|---|---|---|---|
| today, no card node | 24.0 | 80.4 | 58.9 | — |
| heights held as before (voices at their pitch) | 117.3 | 316.5 | 123.7 | 0 |
| layers, held | 123.7 | 443.4 | 128.6 | 0 |
| layers, pull .02 | 40.0 | 122.8 | 74.5 | .80, 3.95 |
| **layers, pull .05** | **39.7** | **121.8** | 77.2 | .62, 3.08 |
| layers, pull .1 | 47.3 | 161.7 | 83.4 | .46, 2.53 |
| layers, pull .2 | 52.7 | 192.0 | 91.0 | .31, 1.82 |

- **The scale force takes the tower layout from 3× today's crossings to 1.7×** (124 held → 40 at .05), at a fidelity of .6 of a decade on average: the layers read in order (the sockets over the voices over the structure, on average, a test checks), and a node gives way where its links pull harder (Hypercell's drums' sockets sit by their drums).
- Held rails cost: the layers held cross more than the per-pitch heights held (124 against 117), since one voices' row puts every voice level with every other.
- Resonators and tapes sit in the voices' layer (the owner's call); the pull lets a tape's heads and what they play find their places round it.

![Pop, layers at .05](tower-strip-layers-pop.jpg)

![Hypercell, layers at .05](tower-strip-layers-hypercell.jpg)

![Hypercell, layers at .1](tower-strip-layers-hypercell-pull1.jpg)

*Pop and Hypercell* (stopped): sockets on top, the voices' row under them, the structure, the form at the bottom; at .1 (the last) the rows are a little tighter, for 8 more crossings over the library.

## Next

1. The tower layout still crosses about three times today's (91 against 33, the card left out of both), most in the pieces arranged with selectors, tapes and resonators (#234's language side: a selector that sends gates).
2. A net's crossings with edges: the layout could pull a net's sources toward the strip (the nearer, the shorter its trunk), measured as `over an edge`.
3. Meters placed last on their row without overlapping (room made sideways), then measured again: today's forces with them crossed 77.
4. A mix's own height (centre vs top), and the tower's axis against the strips: one of them, once the layout is chosen.
