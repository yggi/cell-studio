---
name: gallery
description: Mock up what Cell studio's graph draws and take pictures of it, as contact sheets - every kind of wheel (cell glyphs, spectrum, wave, scope, sun, turntables, petals, sheets, library) and every kind of edge (by port: braid, over, step, mix, voice, attributes, about; belts, a meter's net) in each state, the golden reference graph (one real graph with all of them), plus design mock-ups. Use when asked for a contact sheet, a visual pass, a screenshot of how something is drawn, a before/after of a drawing change, or to try a design option side by side.
---

# Gallery

`tools/gallery.mjs <subject>` sets a subject up directly in a harness page (`tools/gallery/harness.html`, from the
working tree, no build, ~15 s) and keeps one picture per **kind** (`<figure data-kind>`): `tiles/<kind>.png`, the
whole page as `sheet.png`, `index.html` and `<subject>.json`, in `OUT` (default `shots/<subject>-fast/`, git-ignored).
It fails on a page error.

This skill pictures what the graph draws. Its siblings picture other things, so a decision can borrow the form that fits: Jambot's `screenshot` skill ([yggi/jambot](https://github.com/yggi/jambot)) shows measured options side by side, as pictures (piano rolls, a measure over bars) and as audio through its synth; yggi/cells' picture skill draws a text's events as a piano roll, before and after a change to the language.

| subject | what | how |
|---|---|---|
| `wheels` | every kind of wheel, each at a ladder of sizes beside its sheet | fast, or real (below) |
| `edges` | every kind of edge in every state, on bare nodes | fast |
| `golden` | one graph with a value of every kind of wheel and edge, in the real Graph, stopped and live | fast |
| `zoom` | close-ups of cells in the real Graph, stopped and live: a wheel's details as drawn among its edges | fast |
| `mockups` | design questions, options side by side (`tools/gallery/wheels/Mockups.svelte`) | fast |
| `edge-mockups` | how an edge could be drawn, options side by side: the bus's geometry, sound, clocks, a melody, levels (`tools/gallery/edgemocks/`, [edge-styles.md](../../../docs/notes/edge-styles.md); `OUT` default `shots/edge-mockups-fast/`) | fast |
| `roll` | a cell's piano roll (`src/ui/PianoRoll.svelte`) at a phone's width: blank, a scale, semitones, 19-EDO, chords and holds, a kit, playing (playhead, ghosts, a key held), not editable | fast |
| `keys` | the dock's on-screen keyboard and drum pads (#255) in each state: at rest, scale dots, keys held, pads held and glowing, a phone's width (`tools/gallery/keys/Sheet.svelte`) | fast |
| `graphs` | every example's graph as the library's miniature draws it, with its numbers from the layout's baseline (`tools/graphs.mjs`; `OUT` default `shots/graphs/`) | fast |
| `sky` | the tower layout's audible sky (`src/ui/TowerSky.svelte`) in the built app, playing, over pieces of every kind (an arrangement, dance, ambient, a fugue, a canon, a fast break, acid, jazz, a loop, one tone): the graph, a close-up over the audible, a filmstrip of it, the sky alone; and numbers, `flicker` (how much it changes from one 50 ms sample to the next, for its brightness), `lagPx` (how far the sky is drawn from where the graph is while panned and zoomed) (`tools/gallery/sky.mjs`; `OUT` default `shots/sky/`) | built app, ~30 s a piece |
| `time` | the time view (`src/ui/TimeView.svelte`, #286) of each piece in the real app, in each state: `mix` (the default layers), `keys` (the scalogram on new pitch classes), `sound` (waterfall and waveform), `zoom` (8× in), `patterns` (motifs at two time scales boxed, foldings listed), `phone` (`tools/gallery/time.mjs`; `OUT` default `shots/time/`, `STATES=mix,keys`; default pieces Hypercell, Pop, Korobeiniki, 5 to 12, Pachelbel) | real app, ~1 min a piece |

A piece in the built app, playing: `node tools/gallery.mjs play 3 "Sound on Tape"` (builds first; `DIST=` another build) keeps a screenshot of the graph and each node's and edge's drawn state as JSON, in `OUT` (default `shots/play/`).

```
CHROME_PATH=/opt/pw-browsers/chromium node tools/gallery.mjs edges            # shots/edges-fast/ (CHROME_PATH only in a cloud session)
node tools/gallery.mjs edges 5 Hypercell                                      # 5 s into the piece, only pieces with the word
node tools/gallery.mjs wheels --fast                                          # shots/wheels-fast/
SIZES=32,44,64 STOPPED=1 OUT=shots/fast-before node tools/gallery.mjs wheels --fast
```
Before / after: run it on the base commit (`git stash`) with `OUT=shots/<subject>-before`, then on the change; the
tiles pair up by name. Show both in the PR as the "how verified" of a visual change. Open the harness yourself with
`npx vite` and `/tools/gallery/harness.html?subject=edges&t=3&only=hypercell`.

## The sky (`sky`)
`node tools/gallery.mjs sky 15 Hypercell Pachelbel "A tone"` (builds first; `DIST=` another build, `ZOOMS=` wheel notches for the
close-up, `FRAMES=` the filmstrip's length) opens each piece in the tower layout, plays it `secs` and keeps
`tiles/<piece>-still.png` (the whole app), `-close.png` (zoomed in over the audible's middle, from the sky's
`data-audible`), `-film-<n>.png` (the close-up's upper half, 120 ms apart), `-sky.png` (the close-up with the graph
hidden), and `sky.json`. Read it for: whether a tone's partials stand out as points of light at their heights and a
drum's noise stays a haze, whether the light spreads across the sky (not heaped by the sockets), the spires' spikes
against the light, and over the filmstrip whether it breathes or blinks. `lagPx` should be 0: the sky's layers follow
the graph's transform between draws; it reads the sky's `data-view` (the view it shows) against the flow's own
transform each frame of a drag and a few wheel notches, so it says nothing on a build that doesn't set it. `flicker`
counts the glints' twinkle too: compare it between builds on the same pieces, not against a number. Before / after:
`OUT=shots/sky-before DIST=<old build>` (`npx vite build --outDir <dir>` on the base commit).

## The time view (`time`)
`node tools/gallery.mjs time pop fiveto12` opens each piece in the real app (the dev server, the working tree), shows
the time view (wide: the graph toolbar's *time*; `phone`: the Time tab), waits until the worker and the render are
done (`.busy` gone: a day's scalogram takes a minute, five minutes of sound longer) and keeps
`tiles/<piece>-<state>.png`. Read it for: whether each layer sits at its height on the tower (scalogram below 20 Hz,
notes and waterfall in the audible, waveform in the card's octave at the top), the cones under the section lines,
white marks on sections against orange ones off them, the veil at the window's edges, labels that collide (the
sections' names, the zones'), and the phone's toolbar wrapping. The analysis behind it is `engine/time/` in `@yggi/cells` and its
probe `tools/probe/scalogram.test.ts` ([scalogram.md](https://github.com/yggi/cells/blob/main/docs/notes/scalogram.md)).

## Close-ups (`zoom`)
`ZOOM=parts node tools/gallery.mjs zoom 3 pop korobeiniki` lays each piece out in the real Graph (as `golden 3 pop
korobeiniki` does), then zooms each frame's flow in on each named cell with the mouse wheel, as a hand would, and keeps
`tiles/<piece>-<stopped|live>-<cell>.png`: the wheel at about 4× with its edges' ends round it. Without `ZOOM`, every
wheel that has bulbs (`[data-bulb]`: a braid's splices, a table of sections) is taken. `SCALE=3` for sharper tiles.

Read it for what a contact sheet of the whole graph is too small to show: where an edge meets a wheel (a net from a
bulb, a selector's wire from below), a bulb's ends and joins, names that don't fit, a cursor's colour and where it
stops, what dims while playing. Before / after as for the rest (`OUT=shots/zoom-before`); a montage of the tiles side
by side (PIL, in a scratch script) reads faster than one at a time.

## Edges
`tools/gallery/edges/`: the first of each kind of edge across the examples (a live one if any is). A **kind** is what
an edge looks like: its port (`voice`, `fm`, `step` …), the shapes of the transforms written on it (`delay`, `up`,
`div-belt`: what its steps do, not by how much), whether it counts (`×n` slots) — so a new way to write an edge turns up by itself; a kind
no example uses is missing (add the example, or a fixture). Each kind is drawn by the **real edge components**
(`PulseEdge`, `BeltEdge`, `MeterEdge`, made by `src/ui/flowedges.ts`, styled by `src/ui/edges.css`: exactly what
`Graph.svelte` uses) on two bare nodes, with the graph's context (the piece at that moment, the note on the voice,
the layout's bend), in seven columns: off, unrouted, on (stopped), idle, live on C4, live with the voice on C3 (the octave rule, where an edge's colour is a voice's sound; a melody's follows its source's wheel),
live and bent, and the tower layout's (a sigmoid). A live tile marked *silent* is one whose source has no playhead at
that moment: what it shows is a fallback the app never draws (it makes an edge live only while its source sounds); name a
piece and a moment where it plays (`edges 20 arrangement`) to see the real thing. A row of its own draws the tower
layout's selector, its pill, at rest and on the beat (`PillCell.svelte`). A belt is shown by its stretch (at rest, pulling both ways, slipping), a meter's net by its beat.
A meter's own step edges aren't drawn in the graph (ground) and so aren't here; the net is.

Read it for: whether kinds can be told apart without their label, state contrast (idle / unrouted / off against
on), the note colour on a live edge against its label's border, the pulse dot, dashes at the ends, labels over a
bend. To change how an edge looks, change `edges.css` or the component and re-run: the sheet is the spec.

## The golden graph
The graph opens in the tower layout (its default); `LAYOUT=flow` takes these pictures (golden, zoom) in the signal path's layout, `STRIPS=1` with the strip opened.

`tools/gallery/golden/golden.cells` is a piece like any other — Cells code, nothing else — given to the real `Graph` and
laid out by the app as it lays out any piece: `node tools/gallery.mjs golden` takes one picture stopped and one at 3 s
(`?t=`), 5616 × 3038 px each. `node tools/gallery.mjs golden 3 canon pertonos` draws those examples instead, each in the real Graph (stopped and live): a before / after of a drawing change on the pieces it touches; `CELLS=piece.cells node tools/gallery.mjs golden` draws a source of your own. So it tests the graph's structure (what the engine makes of the code) and its layout (what
the physics makes of the graph) at once, and there is no layout of its own to keep up: no placer, no pins.

It is a **spanning set**, not every combination: `facets.ts` reads each wheel and edge as dimensions — a wheel's place
(graph, petal), what draws it, its mode and show, a turntable's role; an edge's port (an attribute as one value), whether it has a label, and the
few drawn differently (a belt, a tape's head, a meter's net) — and the golden graph has every *value* of every dimension
the examples have, once or more. Whether a meter steps a cell (its ring) is not a dimension; which label an edge has is the
edge sheet's. `golden.test.ts` (run with the rest, `npm test`) checks that it compiles without a warning, that no value is
missing (`coverage()` says which), and that the app's layout of it has no overlap and at most the recorded number of
crossings. The graph is planar, so the number can be 0; lower it in the test when the layout gets there.

When an example brings a new kind of wheel or edge the test names the missing value: add a cell that has it. Keep the
piece small — a cell that carries no value the others don't is a candidate to drop (`coverage().spare`, to read with care:
what hangs on it goes too).

Read it for what the layout does with all of them at once: edges through wheels (a belt across other turntables), a cell
nothing draws an edge to (the sun floats off), crowding, which row each kind of wheel lands in.

## Wheels
`tools/gallery/wheels/`. **Fast** mounts every kind of wheel directly, as the graph mounts it (`src/ui/flownode.ts`),
in its piece's live state at a moment (`liveAt`) with a made-up sound (`tools/gallery/sound.ts`), each at a ladder of
sizes (44, 64, 96 and its own) beside its sheet; plus the library's piece wheels (a cell's sheet draws its graph wheel). Use it
while iterating, and for anything about size. The spectra show the made-up sound, not the piece's.

**Real** (`node tools/gallery.mjs wheels`, ~2 min, needs `npm run build`) opens and plays every piece (or the ones
named), finds every element with `data-wheel` and keeps one screenshot per kind: where it sits (`graph`, `petal`,
`sheet`, `library`) + the component (`data-wheel`) + `data-mode` + `data-show`. A kind seen again in a livelier state
(live > idle > on > unrouted > off) replaces the one kept; for each graph kind one cell's sheet is opened too. Use it
to check the real thing before a PR: layout, real spectra, sheets as they open.
```
npm run build
CHROME_PATH=/opt/pw-browsers/chromium node tools/gallery.mjs wheels                   # all pieces, 3 s in
CHROME_PATH=/opt/pw-browsers/chromium node tools/gallery.mjs wheels 4 Hypercell "Music Box"
```
Output in `OUT` (default `shots/wheels/`): `sheet.png`, `index.html` (grouped, captions with the piece, `&name`,
state, graph zoom and how many pieces have the kind), `tiles/<kind>.png`, `wheels.json`. Env: `JOBS` (pages at once,
default 4), `SCALE` (device pixels, default 2), `VIEW` (viewport, default `3000x1900`), `DIST` (another build).
Real before / after: `git stash && npm run build && OUT=shots/wheels-before node tools/gallery.mjs wheels && git stash pop`, then again for the change.

A new wheel: give its root element `data-wheel="<component>"` and, if it has variants, `data-mode` / `data-show`;
nothing else is needed. A kind that's missing either lacks that attribute or no example uses it.

Reading it: tiles of the real sheet are cropped from the live page, so neighbours and edges show at the edges, and
the caption's zoom is the graph's (compare sizes only at equal zoom). A screenshot is one moment of a live view: the
playhead and spectra differ from run to run, and so does which piece a kind is taken from; name the pieces to pin
one down. Look at least at: text at petal size, contrast of small labels, the playhead against the edges, rest
states (spectra at rest are dark), consistency of hub, rim, ticks and borders across wheel kinds.

## Mock-ups
`node tools/gallery.mjs mockups` renders `tools/gallery/wheels/Mockups.svelte`: real wheels from the examples
(`MockWheel.svelte`), each option of a design question applied to its own column only (a theme token or a style
overridden there), one picture per question in `shots/wheel-mockups/`. Add a question as a
`<section data-mock="n-name">` with its columns.

## A new subject
A folder in `tools/gallery/<subject>/` with a `Sheet.svelte` that renders `<figure data-kind="…">` per kind (use the
real components and `pieces()` from `tools/gallery/pieces.ts`), a line in `tools/gallery/harness.ts` and the
subject's name in `tools/gallery.mjs`. The runner needs nothing else.
