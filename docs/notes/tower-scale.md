# One tower for both views: handover

Date: 2026-10-17 · Status: handed over · Issues: [#440](https://github.com/yggi/cell-studio/issues/440) (one scale, one strip), [#416](https://github.com/yggi/cell-studio/issues/416) (heard against written), [#436](https://github.com/yggi/cell-studio/issues/436) (the strip consolidated) · Follows [tower-sky.md](tower-sky.md) item 5

## The idea

The graph and the time view draw the same vertical structure, the tower, decoded from two sides; only their x differs (the graph's topology, the time view's time). So they share one scale and one set of strata, and the strip at each one's side is that view's x collapsed: the graph's lanes, the time view's moment at its cursor and what it hears on average.

The time view keeps apart what it **hears** in the output and what the cells **write**, matched both ways: a fully folded piece has no gaps, everything heard is explained by the cells and every cell leaves a trace.

## Done

| PR | what |
|---|---|
| #438 | the strip's rows by one rule (`towerStructure`), live rows (a selector's sections, its table lit, a meter stepping), section colours (`sectionRgb`), the players named up their lane's bridge, the strip resizable |
| #439 | `layout/explained.ts`: levels and moments, heard against written, both ways; the folded share in the toolbar |
| #441 | `layout/towerscale.ts`: the strata, `y`, its inverse, the ticks; the graph's strip drawn by it |
| #442 | the time view on the scale (`Frame.scale`), the neutral zone's rows (a voice each), the graph's colours; round periods as the marks under 20 Hz in both views |
| #443 | one strip in both views (`TowerSource`: the graph's context, or the time view's moment), the heard levels a layer of it, one width (`state/strip.svelte.ts`), a stratum's name clear of the labels |

## Open

- **#443 is stacked on #442**: once #442 is squashed in, merge `main` into #443 (`node tools/sync-pr.mjs 443`) before it is reviewed.
- ~~Rung 4, `TowerAxis`~~: retired in #443 (the owner's call); its focus (the cell selected outlined and named) moved to the strip.
- **Heard levels in the graph's strip**: none yet; the time view's listening (its worker's answer) isn't kept where the graph can read it.
- **#416's later rungs**: material (motifs heard against the cells that play them) and sound (the waterfall's bands no note owns).

## Gotchas

- The scalogram (fastest period 1/16 s) and the waterfall (from 20 Hz) are pictures stretched between two heights; the neutral zone is inserted at 20 Hz, between them. A picture that crossed 20 Hz would need splitting at the zone.
- The strip redraws when stopped only for what its effect lists; anything new it draws (a layer, a source) goes in that list.
- `TowerStrips` reads its rows through `ctx` (a `TowerSource`); the lanes, the spectrum and the spires read `graph`, the graph's context, present only inside the graph.
