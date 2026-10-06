# Editing

The graph as a visual editor over the code, and the code editor itself. Every change is a rewrite of the cell's line; the text stays the source.

## In the graph

- **+ cell** adds a blank cell — the chromatic default, the 12 grid — at the origin and opens it.
- In a cell's sheet the **wheel is the editor**: one pod per written step, as long as the steps it takes, labelled with its number or cell and coloured by the pitch it sounds.
  - **Tap a pod** (a braid written by hand): a smart field for that step. Its first line is the value bar — one tap sets the value, in the colour it sounds; typing completes cells and then brackets (`&m` → `&mode`, `&mode[` → `[<<]`, `[0]`, …). A number gets spinners for a step and an octave (the length of the table it reads: 12 chromatic, 7 for a scale). Split and Delete are the only other actions. **+ step** appends one: build a braid step by step.
  - **Tap the hub**: the whole braid as one smart line — its steps, or its generator — completing cells, brackets and functions, checked as you type.
  - A braid **generated** by a function (`scan()`, `euclid()`) shows the function in the hub and its pods dimmed: change the function there, or replace it with steps to edit them one by one. An empty braid shows the default grid dimly.
- **Rename** by tapping the name: the declaration and every reference follow.
- **Parameters** are rows (`over &mode`, `step &bar` …) — none on an empty cell. Sound parameters are offered only for a voice: a cell looping at audio rate (`loop=` of 20 Hz or more). Tap a row, or **+ add**, for the same pop-up as a step: the key, a smart line for the value (completing cells, scales, cycles, rates, notes, maps, sources by key, checked as you type), Delete.
- **Delete** asks first, and says which cells use it.
- `free()` numbers get sliders on their node; moving one rewrites the `free(…)` in the code ([../language/free.md](../language/free.md)).

What the graph can't edit yet is in [../limits.md](../limits.md).

## Code editor

Coloured as you type — cells, attributes, generators, numbers and note names, modifiers, quoted text, comments (a coloured copy under the text, so typing, selecting and the phone's keyboard stay native); lines wrap (each number stays at the top of its line); A− / A+ or a two-finger pinch zoom the code (13 px on a phone, 15 on a desktop). **Shorten** is in this view: [shorten.md](shorten.md).
