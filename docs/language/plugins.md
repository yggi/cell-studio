# Plugins

A piece can carry the drawing of a `show=` of its own: a **plugin**, written in the piece's text. The core stays lean; what one piece needs lives in that piece. Why, and what is not built yet: [decision 009](../decisions/009-plugins.md). A plugin changes only how a cell is drawn, never how it sounds.

## A block

```
=== plugin ring ===
{ "fits": ["meter"], "size": 160, "tokens": { "ring": "#e3a25a" } }
function draw(view, h) {
  const R = view.size / 2;
  return [
    h('circle', { cx: R, cy: R, r: R - 4, fill: 'none', stroke: view.tokens.ring, 'stroke-width': 3 }),
    h('text', { x: R, y: R, 'text-anchor': 'middle', fill: view.tokens.ring }, Math.floor(view.time.seconds) + ' s'),
  ];
}
=== end ===
```

The name is lower-case letters (not one of the shows). The block is blanked before the cells are read, so a cell's line numbers don't move. Then `show=ring` on a cell it fits draws that cell as the plugin does:

```cells
&piece title="Plugin ring" tags="topic" label="A meter drawn by a plugin." about=&out
&bar scan(1 1 1 1) step=90bpm show=ring
&v s=sine loop=C4
&tune step=&bar 0 4 7 4
&out level=-12 loop=SAMPLE_RATE map=sample [&tune * &v * .3]
=== plugin ring ===
{ "fits": ["meter"], "size": 160, "tokens": { "ring": "#e3a25a" } }
function draw(view, h) {
  const R = view.size / 2;
  return [h('circle', { cx: R, cy: R, r: R - 4, fill: 'none', stroke: view.tokens.ring, 'stroke-width': 3 }), h('text', { x: R, y: R, 'text-anchor': 'middle', fill: view.tokens.ring }, Math.floor(view.time.seconds) + ' s')];
}
=== end ===
```

A plugin's show is a wheel for its own cell: it isn't passed down to the cells below it as `notes` or `do` are, and it applies only to the kinds of cell it says it fits.

## The manifest

The first `{ … }` of the block, JSON:

| key | meaning |
|---|---|
| `fits` | the kinds of cell it can draw (required): `meter` `voice` `table` `braid` `grid` `adsr` `volume` `selector` `lfo` |
| `size` | its width and height in the graph, 60 to 400 (200) |
| `rim` | `false` if edges should not meet segments on it, as on a cell's own wheel (true) |
| `meaning` | a sentence, for the cell's sheet |
| `dial` | `{ "label", "turn", "key" }`: it can be turned by hand while stopped, which moves where play starts: seconds for a full turn, seconds for an arrow key |
| `tokens` | colours by name, read by the drawing as `view.tokens` |

## The drawing

`draw(view, h, g)` returns the elements to draw (one, or a list), built with `h(tag, attributes, …children)`: `g` `path` `circle` `ellipse` `line` `rect` `polygon` `polyline` `text` `tspan` `title` `defs` `linearGradient` `radialGradient` `stop` `clipPath`. Attributes are drawing attributes only: no events, no links, no `url()` but `url(#id)`. It draws on `0 0 size size`.

`view`: `name`, `params` (the cell's attributes as written, such as `anchor`), `size`, `uid` (a prefix for ids: the same cell can be drawn twice), `tokens`, `time` (`seconds`, `playing`: the piece's time while it plays, else where play will start) and `law` (a day's law as data, for a meter that a `law=fiveto12` cell reads through `over=`; else null). `g` has `polar`, `ringSegment` (the wheels' own geometry) and `blockColour` (a mode's colour by brightness). `describe(view)`, for a dial, returns `{ text, now, min, max }` for a screen reader.

The sun of *5 to 12* is a plugin: read `examples/fiveto12.cells`.

## Trust

A plugin is code. It runs if it is the same text as a plugin in an example that ships with the app, or after you press **Run it** on its wheel; the choice is kept in this browser by the plugin's text, so a changed plugin asks again.

## Limits

- A plugin lives in one piece's text: none from a file of its own, or in a bundle, yet.
- It runs on the main thread (no sandbox): the reason for the trust rule.
- Not in the `show=` picker of the node editor, and the editor doesn't colour the code in a block.
