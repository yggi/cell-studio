# #701: the meter's wheel with its swing

**Date:** 2026-11-24 · **Status:** mock-up, for the owner's choice · **Issue:** [#701](https://github.com/yggi/cell-studio/issues/701) · `node tools/gallery.mjs mockups` (questions 3 to 5; `tools/gallery/wheels/MeterMock.svelte`)

The owner's changes to the first mock-up (a gold handle on a swing ring in the meter's rainbow): no handle, swing is set in the details; the meter's own design, not the default hues; find out what a running bar wheel does today; check `&bar` on the tower.

## What a running `&bar` wheel does today

Measured with `liveAt` on Swing, Funk and Metronome (`&bar … from bar &tempo`, 4/4), and in the gallery (`MockWheel`, `playing`, `t`).

- **Neither a cursor nor a turning wheel.** A meter written as levels (`meter(…)`, `from bar`) is drawn as a braid of levels (`mode` `braid`), whose hand (`handOf`) reads the cell's `local`, which a meter has none of (it plays nothing). The older branch, a lit segment (`meterAt`/`meterLit`, "the step goes round, outlined and glowing"), is only for `mode === 'grid'`, so it never draws. **The ring is static.** Only the hub's number changes.
- **So a running wheel shows none of tempo, meter or swing.** A meter's pulse cells sit where they are played (`view.swung`: the swung level's pulses lean), which is the one place swing shows, and only where the pulses are the swung level (Aksak's eighths), not for Swing's or Funk's eighths and sixteenths inside a quarter.
- **The hub counts beats, not bars.** `liveAt` takes a clock's cycle as `clocking(…).map(name).beats`, which is 1 for a meter that is itself the clock (`step=&tempo`: not positional), though the cell has 4 steps. So `beatAt` stays in 0…1 and `bars` is the beat count: at 160 bpm, t = 2.3 s gives `bars` 3 (the 4th "bar"), `hubLabel` shows `bar + 1`.

## `&bar` on the tower: confirmed

`TowerStrips.svelte` lights the row's step from `local = heads.cells.get(name)?.local ?? heads.beatAt.get(name)` over `lapOf` = 4: with `beatAt` in 0…1, `t = beatAt / 4` stays in 0…¼, so **the first step of the bar's row is the only one ever lit**; it flashes each beat but never steps on to the second, third and fourth. The same `beatAt` feeds `meterNow` (the segment lit: always 0), `MeterEdge`'s and `PulseEdge`'s `tickLevel` (`floor(beatAt)` is always 0, so every beat flashes as a bar's first: the palette's level 0), and `SectionLooms`. One cause: `live.ts`'s `k`. Fix: a clock that is a stepped cell takes its own lap (`max(beats, cell.steps)`), with a test over the examples that every meter's `beatAt` reaches `steps`. Not in this change.

## The wheel, as drawn (`701-meter-wheel.jpg`, `701-meter-running.jpg`, `701-meter-details.jpg`, `701-meter-selector.jpg`)

- **The clock's white** (`--meter-0`, which `app.css` gives a meter: "the clock, white light"), not a hue: on the wheels a hue is a pitch or a voice, and the current red / orange / yellow / green for a pulse's level reads as one. Level is **height** (the bar's first reaches the rim, a finer pulse stops short) and the sync-level colours stay the edges'.
- **Pulses** stand on the hub's side, **beats** are the thin arc outside them, numbered on the rim, **swing** a ring inside: the swung level's pairs, long then short at the share they play; a group that doesn't divide into pairs stays even (decision 071), 12/8 and Twelve's groups of three show it; none without `swing=`. The wheel stays 148 px; its geometry is `wheelGeometry`'s.
- **Running**: the wheel stays and the hand is the playhead, as on every other wheel (white, dark edge), a turn a bar: its speed is the tempo over the bar, and through a long arc it takes longer than through a short one. The pulse under it and its beat are lit.
- **Swing's share** is set in the cell's details (a slider over the attribute's own range, 2/3 a detent), not on the wheel.
- Each wheel is drawn from a real example's compiled meter (`cell.meter`: `beats`, `levels`, `unit`, `swing`): Metronome, Swing, Funk, Aksak (2+2+3 at 8n:.6), Five and Twelve.

## Decided (the owner, 2026-11-24)

- The hub says **the bar** while it runs (what `hubLabel` means), not the beat; the live clock's fix is #710 (PR #711), which the mock-up assumes.
- **A selector's clock keeps its hue**: where a meter steps a selector, the wheel is tinted the playing section's colour (`sectionTint`, as the tower's loom tints the clock: one white in, its spectrum out), `701-meter-selector.jpg`; stopped, or with no selector, the clock's white.

## Open

- Whether the wheel is built as the mock-up draws it (it is hand-drawn SVG, not the app's component).
- A cells question if `Clock.beats` should say a stepped meter's steps (it is 1 for it; #710 reads the cell's lap instead).
