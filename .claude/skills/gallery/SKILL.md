---
name: gallery
description: Mock up what Cell studio's graph draws and take pictures of it, as contact sheets - every kind of wheel (cell glyphs, spectrum, wave, scope, sun, turntables, petals, sheets, library) and every kind of edge (ref, over, step, mix, out, about, belts, a meter's net) in each state, plus design mock-ups. Use when asked for a contact sheet, a visual pass, a screenshot of how something is drawn, a before/after of a drawing change, or to try a design option side by side.
---

# Gallery

`tools/gallery.mjs <subject>` sets a subject up directly in a harness page (`tools/gallery/harness.html`, from the
working tree, no build, ~15 s) and keeps one picture per **kind** (`<figure data-kind>`): `tiles/<kind>.png`, the
whole page as `sheet.png`, `index.html` and `<subject>.json`, in `OUT` (default `shots/<subject>-fast/`, git-ignored).
It fails on a page error.

| subject | what | how |
|---|---|---|
| `wheels` | every kind of wheel, each at a ladder of sizes beside its sheet | fast, or real (below) |
| `edges` | every kind of edge in every state, on bare nodes | fast |
| `mockups` | design questions, options side by side (`tools/gallery/wheels/Mockups.svelte`) | fast |

Graphs as a whole: `tools/graphs.mjs` (every example's layout, as the library's miniatures draw it) and
`tools/shots.mjs` (a piece in the built app, playing). They are not part of the gallery yet.

```
CHROME_PATH=/opt/pw-browsers/chromium node tools/gallery.mjs edges            # shots/edges-fast/ (CHROME_PATH only in a cloud session)
node tools/gallery.mjs edges 5 Hypercell                                      # 5 s into the piece, only pieces with the word
node tools/gallery.mjs wheels --fast                                          # shots/wheels-fast/
SIZES=32,44,64 STOPPED=1 OUT=shots/fast-before node tools/gallery.mjs wheels --fast
```
Before / after: run it on the base commit (`git stash`) with `OUT=shots/<subject>-before`, then on the change; the
tiles pair up by name. Show both in the PR as the "how verified" of a visual change. Open the harness yourself with
`npx vite` and `/tools/gallery/harness.html?subject=edges&t=3&only=hypercell`.

## Edges
`tools/gallery/edges/`: the first of each kind of edge across the examples (a live one if any is). A **kind** is what
an edge looks like: its `kind`, the parameter it feeds (`out · fm`), the shape of its label (`×n`, `÷n`, `+`) and of
its pick (`[<<n]`, `^n`), whether it counts (`×n` slots) — so a new way to write an edge turns up by itself; a kind
no example uses is missing (add the example, or a fixture). Each kind is drawn by the **real edge components**
(`PulseEdge`, `BeltEdge`, `MeterEdge`, made by `src/ui/flowedge.ts`, styled by `src/ui/edges.css`: exactly what
`Graph.svelte` uses) on two bare nodes, with the graph's context (the piece at that moment, the note on the voice,
the layout's bend), in seven columns: off, unrouted, on (stopped), idle, live on C4, live on C3 (the octave rule),
live and bent. A belt is shown by its stretch (at rest, pulling both ways, slipping), a meter's net by its beat.
A meter's own step edges aren't drawn in the graph (ground) and so aren't here; the net is.

Read it for: whether kinds can be told apart without their label, state contrast (idle / unrouted / off against
on), the note colour on a live edge against its label's border, the pulse dot, dashes at the ends, labels over a
bend. To change how an edge looks, change `edges.css` or the component and re-run: the sheet is the spec.

## Wheels
`tools/gallery/wheels/`. **Fast** mounts every kind of wheel directly, as the graph mounts it (`src/ui/flownode.ts`),
in its piece's live state at a moment (`liveAt`) with a made-up sound (`tools/gallery/sound.ts`), each at a ladder of
sizes (44, 64, 96 and its own) beside its sheet; plus the library's piece wheels and the braid's token wheel. Use it
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
