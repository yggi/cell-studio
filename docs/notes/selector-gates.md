# Selectors as sequencers, junctions as gates (a probe)

Date: 2026-10-09 · Status: open (probe; nothing changes unless switched on) · Issue: [#234](https://github.com/yggi/cell-studio/issues/234) (the multiscale epic), #29 (selectors) · Builds on [tower-rows.md](tower-rows.md)

## The shape (the owner)

*Getting the arrangement selectors and the audio nodes untangled will help most; that is the shape of the junction node: the arrangement selector's trigger at the bottom, the voice's gate at the top. A sequencer in time, complementing the `&key` table's concurrent multiplexer.*

Read as a modular rack:

- **The selector is a sequencer in time.** What it puts out is *which parts are on, now*: a bus of gate lines, one per part, at the rate of its sections. By the tower (and by "a node sits where its output lives") it sits at the bottom.
- **The junction is the voice's gate, a VCA, at the top.** A product `[&tune * &lead * .3]` is where a melody, a voice and a level meet; a gate is one more factor there. The part's sound goes straight out to the sound card, gated at its junctions; it never passes through the selector.
- **Two signals, not one**: the **trigger** (a rising edge) restarts the part's own time, which is today's "a part picked starts from its top" (`docs/language/time.md`); the **gate** (a level) opens the junction. Both leave the selector; the trigger goes to the part's clocks (bottom), the gate to its junctions (top).
- **The duality with `&key`**: a table is a *concurrent* multiplexer: one index, or a chord of them (`[0,2,4]`), picks entries at the same moment. A selector does the same lookup *across time*: `over=&parts` and `over=&key` are already one operator. The difference is what comes out: a pitch from a table of pitches; from a table of parts, today their sound, in this shape a set of gates. A selector's chord (`[0,1]`) is a chord of gates.

## What it needs that the language doesn't say yet

The honest form needs the gate *written*: today no token on a part's line names the selector, so drawing a gate wire would break "every name written is one wire" ([nets.md](nets.md) decision 1). A spelling is the owner's (#29, ⚖: it could change saved pieces). Sketches, for discussion only:

```
&song step=&bar*16 laps=1 0 [0,2] [0,1,2] 0        # a sequence of part numbers: no over=, no table of parts
&keysPart [&chords * &keys * &song:0 * .15]         # the gate: "part 0 is on" as a factor at the junction
&out map=sample [&keysPart, &tunePart, &drumPart]   # the parts' sound straight out
```

or the gate on the part (`&keysPart gate=&song:0 […]`), or the table of parts kept and read the other way round. Whatever the spelling: the gate is a factor at the junction (a product already multiplies by levels), and the trigger is #29's `restart=` ("one rule, two triggers").

## Built, switched off

- `src/layout/gates.ts: gated(model)`: the model redrawn in this shape: each part's sound wired straight to where its selector's went, a gate from the selector to each of the part's junctions, the table of parts gone, and the selector made a **meter of the form** (its gates its net, laid as a tree through the junctions, as a meter's steps are). A drawing of the model, not the model: no token writes the gates.
- `LayoutOptions.junctionBodies` (0 by default): each junction a node of its own in the forces, not folded into its voice and set on its rim. The row rule (`flowRanks`) now puts a voice under its junction when junctions are nodes; nothing changes while they aren't.
- The app and the gallery: `?gates=on`, `?junctions=bodies` (`GATES=on JUNCTIONS=bodies node tools/gallery.mjs golden 3 pop`).
- The rows probe (`tools/probe/tower-rows.test.ts`) has the gated and junction variants (rows 10 to 15).

## Measured (the 10 pieces arranged by a selector, three seeds)

| | crossings | cost | wires up / down | selectors' height |
|---|---|---|---|---|
| today | **13.7** | **18.8** | 53 / 0 % | 0.90 |
| tower zones (`emit`), the signal path within | 28.3 | 42.5 | 56 / 2 % | 0.91 |
| gated, today's rows | 34.3 | 72.5 | 54 / 1 % | 0.48 |
| gated, tower zones | 49.0 | 92.9 | 59 / 2 % | 0.50 |
| junctions as nodes, today's rows | 116.0 | 102.2 | 39 / 3 % | 0.90 |
| junctions as nodes, gated | 135.7 | 139.8 | 41 / 2 % | 0.54 |

- **Gated, the inversion is gone** (no sound runs down, the parts' sound goes straight up, `&out` reads them), **but the layout gets worse** (13.7 → 34.3): with each junction folded into its voice, a gate can only land on the voice, and the selector's net crosses every melody on its way there. Drawn as separate wires instead of a net it is about the same (on *Pop* and *Korobeiniki* 5.7 against 5.0).
- **Junctions as nodes, as built here, are far worse** (116), and not yet a fair test: nothing in the forces holds a junction near its voice (they float as dots in mid-graph, their `is` wires long), and the wires that used to end under a voice's disc are now counted as drawn. What it shows already: the selector's gate net threads *through the junction dots*, a bus of gates as the owner pictured.
- So the owner's claim holds in a precise form: **the junction node is the prerequisite**. Until a junction is a place of its own, near its voice, where the melody, the level and the gate all arrive, the gates have nowhere to land.

## Seen

![Pop, gated (junctions folded)](selector-gates-pop.jpg)

*Pop, gated, junctions folded:* the parts' mixes in the top row sending their sound straight to `&out`; `&song` (a meter of the form) mid-graph, its net running out to the voices across the melodies.

![Pop, gated, junctions as nodes](selector-gates-pop-bodies.jpg)

*Pop, gated, junctions as nodes:* the gate net (teal) threads through the junction dots; the junctions drift far from their voices.

## Next

1. **Junctions as nodes, properly**: a junction just above its voice (a short, stiff `is`; its own small room; the voice's junctions side by side over it), its inputs from below and its sound out of the top (the outputs probe, #236). Measured against today's with crossings counted the same way.
2. Then the gates again, landing on those junctions; and the selector placed at the bottom of its meter's family (it is stepped by `&bar*16`): its gate bus can run beside the meter's net, a bus of buses.
3. The spelling (#29, ⚖ owner), only once the drawing shows the shape pays.
