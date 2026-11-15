# The fragment map's probe

**Date:** 2026-11-15 · **Status:** open, the map's first rung · **Issue:** [#625](https://github.com/yggi/cell-studio/issues/625) (S4 of #621). The model is [fragments.md](fragments.md#the-map-two-forces-and-a-collision); the layout is `src/layout/fragmentmap.ts`; the probe is `tools/probe/fragmentmap.test.ts` (`PROBE=out.txt npx vitest run tools/probe/fragmentmap.test.ts`).

**The question:** the map's style ↔ structure slider weighs the anchors (each fragment held at its points, as surely as they agree) against the springs (each node's one pull shared among its edges). Where should it sit by default, how many edges cross, and where do the hubs fall, on every pair of cells' axes?

**Method:** the whole library, at cells v0.25.1: 274 nodes (181 fragments, 89 pieces, 4 meeting points) and 236 edges. Each of the six pairs of `AXES` is laid out at balances 0.05 to 0.95 in steps of 0.05, three seeds each (a turn of the fixed start); the tables give the means. The probe measures:

- the **style error**, how far fragments sit from their anchors, weighted by certainty;
- the mean **edge length**;
- **crossings**;
- the hubs' places at the knee.

Both ends are degenerate:

- at 0, nothing holds the graph in place;
- at 1, the pieces, which no anchor holds until yggi/cells#543, stay where they start.

## What it found

| pair | style error's knee | #625's knee (against edge length) |
|---|---|---|
| sync × harm | 0.30 | 0.30 |
| sync × bite | 0.30 | 0.35 |
| sync × mood | 0.25 | 0.50 |
| harm × bite | 0.25 | 0.25 |
| harm × mood | 0.30 | 0.40 |
| bite × mood | 0.30 | 0.40 |
| **median** | **0.30** | **0.40** |

- **The default, 0.30:** the knee of the style error against the balance, where raising it stops buying style. It is the same within .05 on every pair. The knee #625 names, the style error against how long the edges are, lands between 0.25 and 0.50: the edges lengthen slowly and evenly (0.10 to 0.18 over the range), so their knee moves with small differences. 0.30 is where both agree on half the pairs. The owner rules (#625).
- **Crossings:** about 1,900 at the default, fewest near 0.20 and rising past 0.65 to about 2,700 at 0.95. Most of them are a hub's star: `meter` alone has 62 edges.
- **The hubs are stars at the centre** on every pair, as the model meant, with no threshold and no list of defaults. At the default, each sits within 0.045 of the middle of what takes it: `meter` (62 edges), `gm_kit` (37), `envelopes` (36), `band` (10), `diatonic` (9), `vibrato` (9).
- **Time:** 150 ticks reach the style error that 300 do, in 70 ms a layout on this machine; 100 ticks, 44 ms, the same error (.019) with 1.5 % more crossings. `TICKS` is 100: the map opens at its start (each fragment at its anchors) and glides to its layout (#625's second PR, where the open is measured).

Kinderlieder's songs meet their tunes again: `&twinkleSong` reads `twinkle` and `wonder` as parts of its own document (decision 082), a meeting point of the map.

## sync × harm, the whole table

| balance | style error | edge length | crossings | ms |
|---|---|---|---|---|
| 0.05 | 0.046 | 0.105 | 1868 | 85 |
| 0.10 | 0.036 | 0.117 | 1851 | 72 |
| 0.20 | 0.026 | 0.129 | 1830 | 70 |
| 0.30 | 0.021 | 0.139 | 1964 | 68 |
| 0.40 | 0.018 | 0.146 | 2045 | 68 |
| 0.50 | 0.015 | 0.150 | 2051 | 73 |
| 0.60 | 0.014 | 0.154 | 2081 | 67 |
| 0.70 | 0.012 | 0.160 | 2343 | 61 |
| 0.80 | 0.011 | 0.166 | 2364 | 61 |
| 0.90 | 0.010 | 0.171 | 2464 | 63 |
| 0.95 | 0.009 | 0.176 | 2738 | 62 |

## Next

- The map drawn: the fragments cell in the library, the axis pickers, the slider, facet filters, a re-run that glides (`from`). Then the contact sheet, and the open time on the `profile` skill (#625's 100 ms).
- The pieces anchored once yggi/cells#543 gives each its style. The probe runs again then: a piece held at its style shortens the hubs' stars.
- Each point's reach (yggi/cells#436, decision 079's ±) takes the place of the spread in a fragment's certainty.
