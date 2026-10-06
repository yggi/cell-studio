---
name: wheels
description: Make a contact sheet of every kind of wheel in Cell studio (cell glyphs by mode and show=, spectrum, wave, scope, sun, turntables, petals, the cell sheet's wheels, the library's piece wheels), each in a representative playing state, and use it for a visual pass or a before/after comparison. Use when asked for a contact sheet, a visual pass or review of the wheels or nodes, or to show what a drawing change does across the whole library.
---

# Wheels contact sheet

`tools/wheels.mjs` opens and plays every piece (or the ones named), finds every element with `data-wheel`
and keeps one screenshot per **kind**: where it sits (`graph`, `petal`, `sheet`, `library`) + the component
(`data-wheel`) + `data-mode` + `data-show`. A kind seen again in a livelier state (live > idle > on >
unrouted > off) replaces the one kept. For each graph kind it also opens one cell's sheet and keeps
the sheet's wheels.

## Fast or real
- **Fast** (`--fast`, ~15 s, no build): `tools/wheels/harness.html` mounts every kind of wheel directly, as the
  graph mounts it (`src/ui/flownode.ts`), in its piece's live state at a moment (`liveAt`) with a made-up
  sound (`tools/wheels/sound.ts`), each at a ladder of sizes (44, 64, 96 and its own) beside its sheet; plus the
  library's piece wheels (five tags, one, none) and the braid's token wheel. Use it while iterating, and for
  anything about size. The spectra show the made-up sound, not the piece's.
- **Real** (default, ~2 min, needs a build): every piece opened and played in the app, the wheels cropped from
  the graph as it lays them out. Use it to check the real thing before a PR: layout, real spectra, sheets as they open.

```
CHROME_PATH=/opt/pw-browsers/chromium node tools/wheels.mjs --fast                 # every kind; shots/wheels-fast/
node tools/wheels.mjs --fast 5 Hypercell Metronome                                 # 5 s in, these pieces only
SIZES=32,44,64 STOPPED=1 OUT=shots/fast-before node tools/wheels.mjs --fast        # other sizes, stopped, elsewhere
```
Fast writes `sheet.png` (the whole harness page), `tiles/<kind>.png` (one per kind: its sizes and its sheet),
`index.html` and `wheels.json`; it fails on a page error. To compare a change: run it on the base commit
(`git stash`) with `OUT=shots/fast-before`, then on the change; the tiles pair up by name. Open the harness
yourself with `npx vite` and `/tools/wheels/harness.html?t=3&only=hypercell&sizes=44,64`.

## Design mock-ups
`node tools/wheels.mjs --fast --mockups` renders `tools/wheels/Mockups.svelte` (`harness.html?mockups`): real
wheels from the examples (`MockWheel.svelte`), each option of a design question applied to its own column only
(a theme token or a style overridden there), one picture per question in `shots/wheel-mockups/`. Add a question as
a `<section data-mock="n-name">` with its columns.

## Run (real)
```
npm run build
CHROME_PATH=/opt/pw-browsers/chromium node tools/wheels.mjs            # all pieces, 3 s in; ~2 min
CHROME_PATH=/opt/pw-browsers/chromium node tools/wheels.mjs 4 Hypercell "Music Box"   # a few pieces
```
(`CHROME_PATH` only in a cloud session.) Output in `OUT` (default `shots/wheels/`, git-ignored):
`sheet.png` (the whole sheet), `index.html` (the same, grouped, captions with the piece, `&name`, state,
graph zoom and how many pieces have the kind), `tiles/<kind>.png`, `wheels.json` (every kind and the pieces with it).
Env: `JOBS` (pages at once, default 4), `SCALE` (device pixels, default 2), `VIEW` (viewport, default
`3000x1900`: big enough that the fitted graph shows wheels at about 0.9 zoom), `DIST` (another build).

## Before / after
```
git stash && npm run build && OUT=shots/wheels-before node tools/wheels.mjs && git stash pop
npm run build && OUT=shots/wheels-after node tools/wheels.mjs
```
Tile names are the kinds, so the two `tiles/` folders pair up file by file. Show both sheets (or pairs of tiles)
in the PR, as the "how verified" for a visual change.

## A new wheel
Give its root element `data-wheel="<component>"` and, if it has variants, `data-mode` / `data-show`; nothing
else is needed for it to appear. A kind that's missing either needs that attribute or no piece in
`examples/` uses it (`wheels.json` says which pieces have each kind).

## Reading it
- Tiles are cropped from the live page, so neighbours and edges show at the edges. The caption's zoom is the
  graph's: compare sizes between tiles only at equal zoom.
- A screenshot is one moment of a live view: the playhead and spectra differ from run to run, and so does
  which piece a kind is taken from (pages run in parallel). To pin one down, name the pieces.
- Look at least at: text at petal size, contrast of small labels, the playhead against the edges, rest
  states (spectra at rest are dark), consistency of hub, rim, ticks and borders across wheel kinds.
