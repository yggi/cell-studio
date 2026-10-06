# Prelude bursts (issue #41, part of #13)

Date: 2026-10-06 · Status: open, prepared (measured, not fixed) · Issue: #41 (sub-issue of #13)

## The problem
While *Bach, Prelude and Fugue in C minor* plays, the main thread stalls once a bar: 9 long tasks of 100–200 ms in
20 s at normal speed (×4 CPU throttle: up to ~550 ms). A stall that long delays the window scheduler's next
tick and freezes the views; with the 0.3 s look-ahead it eats most of the headroom on a slower phone.

## What was measured (`tools/profile`, production build, headless Chromium)
- `bursts.mjs`: each burst is ~1,600 `fill` attribute writes on `path` elements in 13–15 graph nodes, plus the 17
  pulse dots, every ~2.2 s (a bar). Between bursts the page is quiet.
- `burstlines.mjs` (CPU profile of the bursts only): `view` (= `cellView`) ≈ 10 %, `paths` (the `ringSegment`
  geometry) ≈ 7 %, `entries`/`lookup`/`resolveIn`/`shiftedUnits` ≈ 6 %, Svelte's effect traversal and
  `mark_reactions` ≈ 9 %; `(program)` (native) 48 % of self time.
- `cellview-time.ts` (engine only, node, warmed): `cellView` of all 58 drawn cells at one turn takes a median
  24 ms (max 43 ms). **Four cells take 76 % of it**: `&lh` and `&rh` (1,120 steps, stepped) and `&lhFigure` and
  `&rhFigure` (384 steps). The graph holds 4,927 `<path>`s in all, mostly theirs.
- Raw DOM cost is not the problem: writing a fill on all 4,927 paths takes ~4 ms, and ~11–16 ms more for the
  following style/paint frame. The ~100–200 ms is JS: recomputing a 1,000-segment wheel's view and geometry, and
  Svelte re-running the effects of ~1,000 `{#each}` items per glyph.

So: **a wheel with ~1,000 steps is drawn as ~1,000 reactive paths, and every key turn recolours all of them**,
in four nodes that are 100–130 px on screen (a step is a third of a degree, under a pixel wide).

## Plan (cheapest and most certain first; measure after each with `bursts.mjs`)
1. **Cap the segments drawn.** In `layout/cellview.ts` (or `CellGlyph`), when a braid has more than ~96–128 steps,
   merge neighbouring steps into one segment per ~3° (colour: the majority/first pitch; rests and levels as now).
   The picture at that size cannot show more. Expected: the four glyphs go from ~3,000 paths to ~400; most of
   the burst disappears. Needs a decision on how a merged segment is coloured (see the open question) and a check
   that clicking/hover and the playhead (`lit`, which uses segment times) still work: segments keep `t0/t1`.
2. **Split geometry from fill in `CellGlyph.paths`.** The `d` strings (`ringSegment`) depend only on the segment
   layout, not on the shifts; a turn changes fills only. Derive geometry from a layout key and fills separately.
   Removes the ~7 % of `ringSegment`/`paths` and the string garbage (GC 4 %).
3. **Share `entries()` work inside a flush.** Many nodes ask for the same table's entries at the same shifts
   (`entries`/`lookup`/`resolveIn`/`shiftedUnits` ≈ 6 %): memoise per (shifts function, table), dropped when
   `shown` changes.
4. **Spread what is left.** Redraw glyphs that are off screen or seen small (< ~40 px) later, in idle time or a
   per-frame budget (~4 ms), visible ones first. Only if 1–3 leave long tasks > 100 ms.
5. Re-run on a real phone; target: no task > 100 ms at ×4.

Open question for 1: a merged segment of a braid shows several pitches. Options: the first step's colour (cheapest,
keeps the rhythm), the most frequent one, or a split segment (two bands). I would take the first step's colour.

## How to reproduce
    npm run build && npx vite preview --port 4173 &
    node tools/profile/bursts.mjs http://localhost:4173/ "Prelude and Fugue in C minor" 25
    npx vite-node tools/profile/cellview-time.ts examples/bwv847.cells
    # CPU profile of the bursts (unminified build, see tools/profile/README.md):
    node tools/profile/cpu.mjs <url of the unminified build> "Prelude and Fugue in C minor" 25
    node tools/profile/burstlines.mjs profile-Prelude_and_Fugue_in_C_minor.json <dist-nomin>/index.html

Baseline before any fix: 9–13 long tasks in 20–25 s, 100–200 ms each (×1).

## Batch 1 result: cap the segments drawn (PR "Cap the segments drawn on long braids")
Plan step 1 done: `coarsen()` in `src/layout/coarse.ts` (pure, tested), used by `CellGlyph` for braids; the cell
sheet's interactive wheel passes `fine` and still draws every step. Engine, audio, examples untouched.

**What was decided**
- Cap 160 (buckets of at most 1/160 turn, 2.25°), not 128: `&roll` in hypercell has 145 segments and must stay as is.
  Nothing else in `examples/` is over 160 except the Prelude's braids; `focus`/`zell` `&arp` have exactly 128.
- Bucket rule: a bucket starts at a segment and takes the following ones while they end within 1/160 turn of its
  start; a segment longer than that is never merged. Merged `t0/t1` are the union, so `lit` (playhead) works.
- Colour: the **first non-rest** member (a rest only if all are), with its own bands, so a chord stays a chord and
  bands are never mixed; show=levels: the member with the highest bar. First-step colour would have erased the notes:
  most steps of the 1,120-step wheels are rests, and a note is a 0.3° sliver.
- A merged note is drawn up to ~9× wider than its step (that is the point: it makes the notes visible).
  The 1.5 px `--wheel-disc` stroke on each slot still eats ~half of a 2.25° segment at 196 px, so they read as thin ticks.
- Only braids. `&tempo` (a 1,120-entry grid, show=meter) is not merged: grids use `index` for `accessed`/`zero`/tap.
  It is not turned by the key tables (cheap), but is 1,120 static paths; look at it in batch 2/3 if it matters.
- `CellGlyph`'s turn ease (`spin`) uses the full view (`full`), the drawing the coarse one (`view`).

**Result** (production build, headless Chromium, `measure.mjs` 20 s; before = main, after = this branch; two repeats at x1)
| Prelude and Fugue | before | after |
|---|---|---|
| `bursts.mjs` long tasks / 25 s, length | 12, 91–208 ms | 12, 63–120 ms |
| DOM writes per burst | ~1,560–1,650 `fill`s | ~520–650 |
| x1 busy %, long tasks (>50 ms), longest | 50.6 / 61.1 / 55.1 %; 9; 139 / 209 / 152 ms | 40.1 / 41.3 / 42.2 %; 9; 113 / 105 / 91 ms |
| x4 busy %, long tasks, longest | 93 %; 104; 678 ms | 90.5 %; 111; 475 ms |

The `fill` writes fall by ~60 % and the stalls are roughly 30–40 % shorter, but the bursts are **not gone**: still 9 long tasks per 20 s at x1, ~65–120 ms each.
x4 is saturated (busy ~90 %) before and after, so it says little. Hypercell and Metronome did not change
(x1: Hypercell 33.6–39.9 % before, 36–38.5 % after, run-to-run noise; Metronome 10.1 → 10.5 %).

**For the next batch**: ~520–650 `fill` writes per burst remain (the figures `&lhFigure`/`&rhFigure` are 192 segments
each, the rest 60–85). The remaining time is then mostly `cellView` itself (24 ms per turn, unchanged by this batch:
it still builds every step) and Svelte's effects, so steps 2 (geometry vs fills) and 3 (memoise `entries()`) are next;
a view that is built coarse in the first place (no 1,000-segment `cellView` for the glyph) would also cut the 10 %
`view` share. Lower the cap or add a size-based cap (draw ≤ ~size/1.5 segments) only if 192 per figure is still a
cost after that.
