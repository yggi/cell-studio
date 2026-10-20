---
name: probe
description: Answer a design question about Cell studio with numbers over the whole library before building it - a feasibility probe. Lay out or compile every example, measure what the question is about (which way wires leave a node, where cells sit on the frequency tower, what an option does to crossings), compare variants over seeds, and write the findings into a note. Use when asked for a feasibility probe, "would X work", "what would Y do to the layout", a measurement across the examples, or before proposing a change to the layout, the drawing or the language.
---

# Probe

A probe measures the library to decide something; it is not a check. It lives in `tools/probe/<topic>.test.ts`, is
skipped in `npm test`, and writes its tables to a file:

```
PROBE=/path/out.txt npx vitest run tools/probe/<topic>.test.ts && cat /path/out.txt   # (the scratchpad for the path)
```

Probes so far: `ratchet.test.ts` (the Shorten ratchet: every example through MIDI and folded again, scored on notes, size and phrases; `docs/notes/ratchet.md`), `scalogram.test.ts` (the rhythm scalogram: every piece's notes as a wavelet transform beside the cells' spans, pictures by `scalogram-sheets.mjs`; `docs/notes/scalogram.md`), `tower.test.ts` (every cell's time constants: the frequency tower, selectors, what nothing reads;
`docs/notes/multiscale.md`), `outputs-top.test.ts` (which way each wire leaves its source, `upPull` and `spread`
variants; `docs/notes/outputs-top.md`, PR #236), `section-order.test.ts` (whether the layout keeps a table's sections in their
order, at the start and at rest), `forces.test.ts` (what each force does: the library with one switched off at a time,
`CUSTOM=` for several; `docs/notes/forces.md`), `explained.test.ts` (#416: the motifs heard against the cells written,
`LAPS=1` with each line's laps, and what a waterfall's unowned band would flag; `docs/notes/explained.md`), `untangle.test.ts` (crossings and edges under foreign wheels in both layouts, the start's choice and the products' meters: one change from today a row, `PIECES=1` per piece, `BEST=1` the best of the seeds; `docs/notes/untangle.md`). The library's layout is chaotic: about ±8 crossings between seeds, so
compare variants on the same several seeds.

## Writing one

- **Skeleton**: `describe.runIf(process.env.PROBE)(…)`, one `it` with a long timeout, and
  `const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n')`. Don't use `console.log`: vitest's output
  is easy to lose, and a file can be read back and quoted.
- **The library**: `Object.entries(PRESETS)` (`@yggi/cells/engine/presets`), `compileSource(source)`, `buildGraph(program)`.
  An `ONLY=word` filter on the key keeps iterating fast.
- **A layout**: as the gate does (`src/layout/physics.library.test.ts`): `new ForceLayout(undefined, { live: false, ...opts })`,
  `setGraph(model)`, `tick(500)`, `layNet()`, then `quality()`, `position(id)`, `bend(id)`, `readers()`, `meterNet()`;
  `destroy()` after. Private state (`(l as unknown as { s: … }).s`) is fine in a probe, not in the app.
- **Seeds**: one start is noise. Use the gate's three (`seed` 0, 1, 2) and report means; name a piece only when it is
  steady across seeds.
- **Variants**: a list of `[name, Partial<LayoutOptions>]`, today's first, each a row of one table. A new force or
  option a probe needs goes in `options.ts` at a default that changes nothing (0), so the baseline stays and the
  probe can switch it on.
- **Time**: the whole library laid out once takes about 20 s; three seeds × four variants about 4 min. Run in the
  foreground with a 600 s timeout, or in the background for more.

## Traps

- **Direction**: an edge's `source`/`target` are how the layout reads it; `from`/`to` are along the flow (what is
  read → its reader). A question about flow uses `from`/`to`. (The first outputs probe read `source`/`target` and
  found `over=` wires leaving *down* 67 % of the time; along the flow it is 2 %.)
- **What is drawn**: skip `about` (notes), `is` (a junction's voice), and sync edges that aren't belts (a meter's
  ground: its net is drawn, `meterNet()`). A bulb (a cell spliced into one braid) has no position.
- **Junctions** have positions (`position(id)` finds them) but aren't cells; map one to its voice when counting
  pairs of nodes.
- **Time constants**: a cell's steps per second is its clock's `perSecond` × its `rate` when another drives it
  (`values.ts`); its turn divides that by its steps. A cell has both: report both, or say which.
- **Claims**: a probe measures the examples, not all music. Say "over the library, three seeds" with every number.

## Where the findings go

- A note in `docs/notes/<topic>.md` (conventions: `docs/notes/README.md`): the question, the method in one line, the
  table, what it means, pictures if visual (the `gallery` skill: before / after, saved small into `docs/notes/`), and
  what is next.
- A finding outside the question gets its own issue (as `spread` halved did, #235), not a change in the probe's PR.
- A probe that settles into a rule becomes a test: a number the library may not pass (`physics.library.test.ts`,
  `quality.baseline.json`).
