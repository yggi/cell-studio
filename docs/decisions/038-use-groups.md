# 038 · A `use` line's cells: a cluster named by its line, what nothing reads folded into the name

**Date:** 2026-10-25 · **Status:** proposed (#480) · Cells: [decision 054](https://github.com/yggi/cells/blob/main/docs/decisions/054-instruments-and-use.md)'s rung 5

## Context

A piece takes a fragment by its id, `use "core kit"` (cells' [use.md](https://github.com/yggi/cells/blob/main/docs/language/use.md)): the compiler reads the fragment's lines after the piece's own. Cells decision 054 asks Cell studio to show what a `use` gives as a group, read only, one group per `use`; an edit of a used cell writes a line of the piece's own (the text stays the single source of truth).
At cells v0.10.1 the graph drew a used cell as the piece's own: `use "core kit"` and a beat of `&bd &hh &sd` drew 13 cells, ten of them the kit's voices the beat doesn't play (silent: the built-in card doesn't hear a used fragment), and an edit of one changed nothing.

The options were mocked up on the real Graph (`node tools/gallery.mjs uses`: three pieces, one use, an override, seven uses) and drawn over it:

- **A wash** or **a frame** round the members (a hull): for one kit it reads well, but the layout doesn't hold a group together, so with several uses a hull spans the graph and covers other groups' cells: it says the wrong thing.
- **A tag** on each member: always true, but noisy (a chip on every cell, eleven for one kit).
- **A shelf** of the uses over the graph, its members marked: tidy, but the group is not where its cells are.
- **A cluster** (chosen): the layout already holds a `tags=` cluster together and washes and names it. A group is a cluster whose tag is its line.

## Decision

- **A use's cells are a cluster, named by its line** (`use "core kit"`, in the code's type, with a dashed rim: read only). Each given node carries the tag, first, so the layout pulls them together as it does a `tags=` cluster; a tag can't hold a double quote, so no `tags=` tag is taken for one.
- **What nothing reads is folded into the name**: a chip per cell on it, which opens the cell's sheet; it has no wheel. While a group has a cell that is read; a use nothing reads at all is drawn whole (it is the piece's whole graph of it).
- **The drums' kit is in the group while most of its pieces are the use's**: a snare the piece writes itself doesn't take the kit out, nor unfold the voices.
- **An edit of a used cell writes its used line** under its `use`, word for word with the edit: one line added, no other changed; deleting it restores the used one. The sheet of a used cell has no rename or delete.
- **The editor shows only the text.** It is a textarea over the code: lines that aren't in the text, folded under a `use`, would number lines the code doesn't have and copy what isn't written. The graph and the cell's sheet show what a use gives; *Show in code* lands on the `use` line.

## Consequences

- A piece with uses draws fewer cells: the kit groove 3, not 13 (its card's size too).
- A `free()` in a used fragment isn't held (Keep would write into a line the code doesn't have); none of the seed library's has one ([limits.md](../limits.md)).
- A cluster's name is laid out by its length (`tagRoom`); a use's name with its chips wraps inside that room.
- A cluster of one node is named by a plate under it, not a name node of its own (whose spring and push left the name far from its one cell: `use "aeolian"`, `use "tonic vamp"`); the node's room grows by the plate's height. A `tags=` tag on one cell is drawn so too.
