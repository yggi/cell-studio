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

## Step 2: tape heads (done)

A tape's read heads are drawn round its wheel by how far along the tape they read (`src/layout/tape.ts`); what each head plays now starts in its head's direction and is held there (the `aims` force in `physics.ts`; `aim` in the baseline: mean degrees off, 62–126 before, 2–10 after). Crossings 140 → 142 (Resonanz 1 → 4, Echo Tape 0 → 1; Sound on Tape 2 → 1, Test Tones 1 → 0).

Not the write head (on top): its source sits *below* the tape in the signal flow, so turning it up drags the source's other parts across (tried: Resonanz 1 → 12 crossings, the library +15; moving the tape under its source instead, +18). If the write edge should meet the head, drawing the write head where the source is (at the bottom) would fit the flow; that's a design call.

## Next

1. The pieces where the physics adds crossings to a good layered start (Cellscape 19 → 33, Baustelle 9 → 14, Korobeiniki 2 → 6, IDM 1 → 4, Brothers 1 → 4, Acid 0 → 2).
2. Cluster-level placement for the tagged pieces.

(#61, the library's miniatures, is done: #108.)
