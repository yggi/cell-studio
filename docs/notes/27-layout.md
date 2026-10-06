# Auto-layout (issue #27)

Date: 2026-10-06 · Status: open · Issue: #27 (epic)

How the layout works is in [../ui/graph.md](../ui/graph.md) (Arrangement) and the code (`src/layout/layered.ts`, `physics.ts`); how it's measured is in [../testing.md](../testing.md) (Layout quality). This note is what the measurements say and what's next.

## Step 1: a measurable quality (done)

`src/layout/quality.ts` turns a layout into numbers; `src/layout/quality.baseline.json` holds them for every example, one line each. `start` is the drawn crossings of the layered drawing alone, before the physics relaxes it; every other number is the settled layout (500 ticks).

What the first baseline says (library totals: 173 crossings at the start, 140 settled; 52 overlapping cluster pairs, 170 intruders; no overlaps):

- **The physics sometimes undoes a good start.** Cellscape 19 → 33 crossings, Baustelle 9 → 14, Korobeiniki 2 → 6, IDM 1 → 4, Brothers 1 → 4, Acid 0 → 2. Elsewhere it helps (BWV 847 59 → 28, Zell 9 → 3, Tines 5 → 1).
- **Clusters overlap in every piece with tags inside it (all nine)** (Cellscape 11 pairs and 34 intruders, Brothers 10 and 25, Hypercell 5 and 21, BWV 847 6 and 19): the cluster-level placement of #27 is where the most is to gain.
- **BWV 847 is wide**: 3666 × 1414 px for 61 cells.
- The layout has settled by about 160–220 ticks (the app runs 220 before its first paint, the library's miniatures 160); 500 changes little.

Gotcha: a crossing exactly at the end of a curve's piece (an edge cut in 16) isn't seen, so two straight edges that cross exactly at their midpoints count 0. The examples' numbers don't seem to hit it, but a hand-made test can.

## Next

1. #61 (sidequest, its own PR): the miniatures move to a pure `src/layout/miniature.ts` and into the examples' index. Pinned layouts (`Preset.layout`) are moot: no example has one any more.
2. The first layout change, judged by the baseline: the pieces where the physics adds crossings (a weaker relaxation, or fewer ticks once the layered start is good), then cluster-level placement for the tagged pieces.
