# The graph

How a piece is drawn, arranged and touched. Editing a cell is on [editor.md](editor.md).

The code is the single source of truth. The graph draws exactly the cells and links written (the implicit default grid is not drawn); edges come from the references in the code. Every change made in the graph is a rewrite of the cell's own line (`src/engine/edit.ts`), so the two views stay 1:1.

## Drawing

- **Braids** are drawn as what they play: every `&ref` is expanded all the way down and coloured through the cell's own table, so `&leadA` (made of `&m1 &m2`) wears the motifs' colours, and a cell of cells of motifs too.
- **Voices, mixes and the sound card** are wheels that don't spin: a spectral waterfall. Left channel on the left half, right on the right; 20 Hz meets at the bottom, 20 kHz at the top (log scale); the newest frame at the hub, flowing outward. Colour is frequency — red at 20 Hz to deep violet at 20 kHz — and brightness is level. At rest a voice shows its own partials at pitch 0.
- Roots sit at the centre; cells ring outward along the tables they read through. Tables (roots, scales, meters) are drawn as their entries on the grid below; melodies as slots in time.
- While playing, every table a note passes through lights the entry it used.
- A played braid's moving shift is its playhead; a restarted part's playhead shows the global clock (see [../limits.md](../limits.md)).

## Arrangement

A layered drawing, the textbook way: rows by signal flow (the sound card on top, voices, melodies, the parts and tables they read — tuning a row under content — and the meter at the bottom), each row ordered to cross as few edges as it can (an edge to the meter counts a quarter: it says when, not what), each node placed towards its neighbours (`src/layout/layered.ts`).

The physics only relaxes it — a spring to each node's place, no overlaps — and nothing is pinned. From that start, balanced forces give each graph its own shape: edges contract, nodes repel and leave room for labels, the edges at a node spread round it (stars and mirror symmetries emerge), meters and sound keep apart, tagged cells cluster; crowded rows become tracks (a cell's parts in a column under it).

## Touch

- **Tap** a cell: a detail sheet to turn it (drag the rim, − / +: writes `shift=`), switch it on/off (writes `off`), pin it in the layout, or jump to its line in the code (*Show in code*).
- **Hold**: quick toggle of `off`.
- **Drag**: moves the cell (physics keeps the rest arranged). Drag a hub to move, a rim to shift; double-tap pins.
- Pinning is layout, not music, so it isn't in the code (yet).

On a phone, **Graph** and **Code** are two full-size views switched by tabs under the header (the Code tab shows a count when there are errors; *Show in code* switches to it and selects the line). Both views stay mounted, so the graph keeps its layout while you edit. On a wide screen they sit side by side. See [theme.md](theme.md).
