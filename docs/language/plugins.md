# Plugins

A piece can carry the drawing of a `show=` of its own: a **plugin**, written in the piece's text. The core stays lean; what one piece needs lives in that piece. Why, and what is not built yet: [decision 011](../decisions/011-plugins.md). A plugin changes only how a cell is drawn, never how it sounds.

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
| `tokens` | colours by name, read by the drawing as `view.tokens`: `#rgb`, `rgb(…)`, `hsl(…)`, a colour name or `var(--x)`, nothing else (a drawing puts them into style text) |

## The drawing

`draw(view, h, g)` returns the elements to draw (one, or a list), built with `h(tag, attributes, …children)`: `g` `path` `circle` `ellipse` `line` `rect` `polygon` `polyline` `text` `tspan` `title` `defs` `linearGradient` `radialGradient` `stop` `clipPath`. It draws on `0 0 size size`. Attributes are an allow-list of those that place or paint a shape (`cx` `d` `fill` `stroke` `transform` `opacity` `font-*` `text-anchor` `style` …); a `style` keeps only paint properties, and a value may call only `rgb` `hsl` `var` `drop-shadow` and the transforms, and `url(#…)` to the drawing's own ids (`view.uid` starts them: an `id` must begin with `plugin`). Everything else is dropped, not drawn: events, links, classes, other `url()`s and functions. What `draw` returns is copied into a bounded tree (at most 2000 elements, 12 deep) before it is drawn.

`view`: `name`, `params` (the cell's attributes as written, such as `anchor`), `size`, `uid` (a prefix for ids: the same cell can be drawn twice), `tokens`, `time` (`seconds`, `playing`: the piece's time while it plays, else where play will start) and `law` (a day's law as data, for a meter that a `law=fiveto12` cell reads through `over=`; else null). `g` has `polar`, `ringSegment` (the wheels' own geometry) and `blockColour` (a mode's colour by brightness). `describe(view)`, for a dial, returns `{ text, now, min, max }` for a screen reader.

The sun of *5 to 12* is a plugin: read `examples/fiveto12.cells`.

## Trust

A plugin is code, and **Run it means full trust**: until there is a sandbox it runs on the page's main thread with the page's powers, so it can read your saved pieces and use the network, and it runs every time the piece opens. It runs without asking only if its manifest and code are exactly those of a plugin in an example that ships with the app. Otherwise its wheel asks, and shows the code. The choice is kept in this browser by the plugin's text (a changed plugin asks again), but only once it has drawn: a plugin that hangs or throws on its first run is forgotten, so the piece opens again next time. **A hang after the first draw is not caught**: code that loops only once the piece plays (`if (view.time.playing) while (true) {}`) or at a time of day is kept, freezes the tab on every later open, and can freeze it before **stop plugin** (under a wheel you chose to run, which takes the choice back) can be clicked. Then only clearing this site's data (the `cell-studio-plugins` entry of its local storage) recovers. A watchdog or a Worker sandbox is the real fix, and is not built yet.

## Limits

- A plugin lives in one piece's text: none from a file of its own, or in a bundle, yet.
- It runs on the main thread (no sandbox: a plugin that loops for ever freezes the tab while it runs): the reason for the trust rule.
- Not in the `show=` picker of the node editor, and the editor doesn't colour the code in a block.
