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
