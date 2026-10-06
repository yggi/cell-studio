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

What is fixed on a tape is only how far apart its heads are: each read head is further round from the write head by how far along the tape it reads (`src/layout/tape.ts`). The wheel itself turns: each tick the layout fits the tape's turn to face its heads at what they connect to (`fitTurn`: a circular mean, busy cells counting more, so a hub like a mix stays put and the tape turns to it), and the `aims` force draws those cells towards their heads; the tape's node is drawn turned (`data.turn`, `MaterialNode.svelte`). `aim` in the baseline: mean degrees a head's cell is off its head, over every head, write heads included.

- Read heads only, with the write head fixed on top: aim 62–126° → 2–10°, crossings 140 → 142.
- With the wheel free to turn and the write head included: aim ≤ 11° per piece, crossings 106 → 105 (on top of step 3), the layered start 173 → 170.
- Tried before the wheel could turn, and dropped: pulling the write source up to a write head on top (+15 crossings) or moving the tape under its source (+18).

The code takes any number of heads (a list of offsets per tape), so more write heads would fit in when the language has them.

## Step 3: the physics' strengths (done)

Why the physics undid good starts: not the pull back to the layered places (stronger `rankPull`/`columnPull` made it *worse*: 142 → 170–183 crossings), but too little untangling against springs that pull edges straight through each other. Swept over the library (500 ticks, and 220 as the app runs first: the same picture):

| uncross / contract | crossings | area (M px²) | clusters / intruders | tape aim |
|---|---|---|---|---|
| 0.3 / 0.9 (before) | 142 | 69.9 | 52 / 170 | 29 |
| 0.6 / 0.9 | 130 | 71.4 | 51 / 154 | 44 |
| 0.3 / 0.6 | 127 | 72.5 | 49 / 150 | 31 |
| **0.6 / 0.75 (now)** | **106** | **74.0** | **50 / 152** | **43** |
| 1 / 0.6 | 94 | 82.1 | 44 / 135 | 62 |
| 1.2 / 0.6 | 77 | 89.5 | 45 / 142 | 96 |

(Tape aim: summed over the five tape pieces; 43 is at most 14° in any.) More untangling keeps paying in crossings but costs room (Cellscape +73 % at 1 / 0.6) and the heads' alignment; 0.6 / 0.75 is the knee. Chaotic per piece: 13 pieces cross less, 7 more (by 1–3: Hypercell 7 → 10, Per tonos 1 → 3). Tried and no better: more `centre`, less `charge`, shorter `repelRange`, `spread` off, less `kindRepel`.

## Step 4: tags as blocks (done)

### What tangles the tagged pieces

Measured on the nine pieces with tags inside them: edges between two different tags are almost absent (11, against 196 inside a tag; none in most pieces). What ties the tags together are a few untagged **hubs** that every part meets: the meter (`&bar`, 8–16 edges, all `step=`), an arrangement selector (`&parts`, `&teile`, `&song`: an edge to every part), a scale (`&lydian`, `&minor`), the mixes (`&leftLayers`, `&rightLayers`) and `&out`. Every hub pulls one cell of every cluster towards itself, so clusters were dragged into each other at the hubs; and since rows are the signal flow, each tag was a tall strip over all rows. Few shared neighbourhoods (bicliques K(2,2), K(2,3)): edge concentration alone has little to remove.

### Approaches (graph drawing literature)

- **Cut and conquer.** The edges that hold dense parts together are the ones with the highest *edge betweenness*; removing them splits the graph into its communities (Girvan & Newman 2002). Bridges and articulation points (biconnected components, Hopcroft & Tarjan 1973) are the strict case of a single edge or node holding two parts together. Here the cut is the hubs' edges, and the parts are the tags. Where there are no tags, the same cut plus community detection (modularity: Newman 2004; Louvain, Blondel et al. 2008; Leiden, Traag et al. 2019) could propose the groups: "structure first, hints only as overrides" (#27). Not done yet.
- **Divide, lay out, unite.** This is clustered (compound) graph drawing: lay out each cluster, then the graph of clusters, then put the cells back (Eades & Feng 1996, multilevel views of clustered graphs; Sander 1996 for layered drawings; ELK's hierarchical layered layout today). Recursive bisection repeats it inside each part. Multilevel force layouts coarsen and refine the same way (Walshaw 2000; Hu 2005). **Done here, one level**: `layered.ts` lays out each tag as a block (its cells at their ranks in the whole piece), then the piece with each block as one node as wide and tall as it is, then puts the cells back.
- **Multiplexers.** *Edge concentration* (Newbery 1989) replaces a complete bipartite K(m,n) with a dummy node (m·n edges → m+n); confluent drawings (Dickerson, Eppstein, Goodrich & Meng 2003) and power graphs (Royer et al. 2008; Dwyer et al. 2013, "edge compression") generalise it. Little K(m,n) here, but the same idea applied to the forces works: **done** as `mux`. A hub's edges into a cluster mostly pull the cluster (through its tag node, one spring per hub and cluster) instead of each cell; the edges are still drawn one by one.
- **Buses (edge bundling).** Hierarchical edge bundling (Holten 2006) and force-directed bundling (Holten & van Wijk 2009) route related edges along shared trunks. **Tried and dropped**: bending a hub's edges into a cluster through one junction (a drawn bus) raised crossings from 121 to 166–192: a bent edge sweeps across everything between it and its straight path. A bus would need its own routing (a rail), not spline bends.
- **Node duplication.** A hub can be drawn more than once, or as a label instead of edges: vertex splitting (Eades & Mendonça 1995), node duplication for clustered networks (Henry, Bezerianos & Fekete 2008). Schematics do this for clocks and power: a net label, not a wire to every part. The meter is exactly that kind of net ("when, not what").

### Measured (5 starts each, 300 ticks; seed 0 is what the app shows)

| | crossings | overlapping clusters | intruders | area (M px²) |
|---|---|---|---|---|
| before (one level) | 116 ± 11 | 50 ± 1 | 151 ± 8 | 73.5 |
| blocks | 127 ± 14 | 47 ± 2 | 127 ± 8 | 75.0 |
| blocks, tagPull 0.15 | 131 ± 13 | 44 ± 1 | 105 ± 6 | 74.5 |
| blocks, mux 0.5, tagPull 0.15 | 141 ± 11 | 42 ± 2 | 88 ± 4 | 76.5 |
| **blocks, mux 0.8, tagPull 0.2 (now)** | **136 ± 9** | **31 ± 3** | **61 ± 6** | **78.0** |
| blocks, mux 0.8, tagPull 0.25 | 158 ± 13 | 31 ± 3 | 52 ± 5 | 77.6 |

The start alone (the layered drawing, before the physics) improves too: crossings 170 → 141, intruders 151 → 55. Where the extra crossings are (means of 5 starts): between content edges 57.8 → 62.8, with a meter's step edge 62.4 → 81.8. So most of the cost is the meter's dashed "when" lines, which now run from one place to every block. Only the nine tagged pieces change; the others are laid out exactly as before.

Gotcha: d3's link force balances each spring by how many springs its ends have, so even a zero-strength spring changes the others; the multiplexer's springs are only added when `mux` > 0.

## Step 5: meters as ground (done)

The owner's call: a meter is like ground in a circuit — the edges to it can go; a ring round each cell it steps shows they're in sync, coloured per meter. `src/layout/meters.ts` says which edges are ground (a step into a meter, not a belt: 214 of the examples' 231 step edges) and which ring each cell wears (meter, rate). The graph doesn't draw those edges (`Graph.svelte`), `CellNode` draws the ring (the rate as a badge on it), and the layout neither pulls on them nor counts them (`physics.ts`: links and degrees). Six examples have two meters (Meter and rhythm, Jazz, Five, Coltrane, Bossa nova, Bell): `--meter-0` (the accent) … `--meter-3`.

| | before (step 4) | ground |
|---|---|---|
| crossings, 5 starts | 136 ± 9 | 58 ± 8 |
| overlapping clusters | 31 ± 3 | 32 ± 2 |
| intruders | 61 ± 6 | 51 ± 5 |
| area (M px²) | 78.0 | 84.0 |

The cluster settings stay (`mux` 0 saves 5 crossings but nearly doubles the intruders). Without the meter's springs, graphs are about 8 % larger: the meter was glue.

## Next

1. **Groups from structure** where a piece has no tags: cut at the hubs (high betweenness), then communities (Louvain or Leiden) as proposed blocks. Tags stay the override.
2. **Recursion**: blocks inside blocks (a tag's own hubs), when a block is large.
3. Compactness: the area grew with each step (69.9 → 85.1 M px² since step 1); BWV 847 is still wide.
4. The same "ground" idea for other hubs? A scale every melody reads (`&lydian`), an arrangement selector: they're drawn edges with meaning (what, not when), so not obviously.
