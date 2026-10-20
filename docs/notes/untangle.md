# Untangling: products' meters under their voices, and a start chosen

2026-10-20 · open · branch `claude/voice-wheel-visual-rework-c2isuk` (the voice wheel's rework)

Hanging a product's meter under its voice (in place of turning it round the rim) doubled the crossings over the library: 46 → 83 in the signal path's layout. This note is how they were brought back below where they were, and what was tried that didn't help. The probe is `tools/probe/untangle.test.ts` (both layouts, crossings and edges under wheels; `PIECES=1` per piece, `BEST=1` the best of the seeds).

## The measure, made honest first

- **Edges under wheels** (`quality.ts`, `under`): an edge whose line passes within a wheel it doesn't meet (its disc, 0.7 of its room). Before, such pieces were only hidden, and never counted.
- **The tower layout's wires as drawn**: its plain wires are sigmoids (PulseEdge), and a wire into a voice's side curves into its flank (`sideTurn`, `layout/voice.ts`); the measure drew every edge as a quadratic spline through its bend.
- **A voice's body** (its envelope band and name under it) hides what it covers, as it does on screen; before, a voice was a disc of its room. (Measured on `main` with its cap above, for the comparison.)

## What helped

| | flow crossings | flow under | tower crossings | tower under |
|---|---|---|---|---|
| `main` (6 seeds) | 45.0 | 148.5 | 82.8 | 108.3 |
| meters hung, the start as before (3 seeds) | 56.7 | 143.7 | 73.7 | 117.7 |
| **chosen** (6 seeds) | **34.7** | **119.8** | **67.7** | **91.0** |
| 5 starts (3 seeds) | 30.3 | 110.3 | | |
| trials of 500 ticks (3 seeds) | 34.3 | 114.3 | | |
| an edge under weighs .25 (3 seeds) | 31.3 | 128.3 | | |

- **A start chosen** (`bestRowOrder`): the layout is chaotic, the best of six seeds about half the mean (`main`: flow 45 → 23, tower 83 → 53). A fresh graph is laid out from each rows' order × three jitters (`starts`) for 250 ticks (`trial`; 120 predicted the final layout too poorly: 3 starts of 120 gave 52), and the one with the fewest crossings, an edge under counting half (`underWeight`), kept. The examples' are chosen at build time, for both layouts (the tower's were never precomputed: its graph has sockets, another key, so every example ran its trials there).
- **Room under a voice** at the layered start (`hangRoom`, `layered.ts` `below`): the row under a voice starts below its meters. 83 → 68 alone.
- **The meters in a row in the order their wires come from**, every tick (the order had been frozen at the first).
- **What feeds a meter stays under it** (`meterRise` 40, the tower layout only): a wire into a meter from its side crosses the stubs of the meters beside it (the canon's `&john` into eight). In the signal path's layout it cost crossings (67 → 76): it fights the rows.

## What didn't

- **Springs through a junction longer by its hang**: 81–88.
- **The junction a rigid part of its voice's body** (in the forces, its springs pulling at it, its pushes going to the voice): 86.
- **The meter rise for fans only** (what feeds meters under two voices or more), or as a soft push, or moving the voice: 64–77.
- **A tighter side entry** (`sideTurn` .3, .15): within the noise.
- **Wheels pushed off foreign edges** (`edgeClear`, the near-field force; off): halves `under` alone (flow 221 → 119 at 3) but costs crossings in the signal path's layout (59 → 77–118, it fights the bends that already route round wheels) and overlaps in the tower; with the start chosen it adds nothing that holds. Kept as an option for a probe.

## The cost

The trials take about four times a layout when a piece of one's own opens (Node: the largest example, baustelle, 0.7 s → 2.3 s; zell 0.1 → 0.4 s); an example opens with none. The examples' index takes 8 s → 52 s to build, so it is kept on disk by what it is made from (`tools/examples-index.ts`, `cachedExamplesIndexModule`), and its test is slow (`src/examplesIndex.slow.test.ts`).
