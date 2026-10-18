# Heard against written: the later rungs, measured

Date: 2026-10-17 · Status: open (a recommendation for the owner) · Issue: [#416](https://github.com/yggi/cell-studio/issues/416) · Probe: `tools/probe/explained.test.ts`

## The question

#416's first rung (#439) matches the levels and the moments heard in the output against the ones the cells write. Two rungs were left: **material** (the motifs heard against the cells that play them) and **sound** (the waterfall's bands no note owns). Is either a small UI follow-up on what the engine already finds, or an analysis rabbit hole: a lot of work to discover structure, little to present it?

## Method

Over the library (77 examples, the first 600 s of each at most). Material: `motifs()` (engine/time/motifs.ts) finds each figure heard twice or more, with every place it is heard. A motif is **folded** when one written cell holds every place, at the same offset into it, in a line that feeds that voice: the figure repeats because the cell does. Two places at different offsets in one cell mean the cell writes the figure twice. The written side is `structure()` (engine/time/structure.ts, the splice tree), and with `LAPS=1` each output line's laps too. Sound: what a band "no note owns" (`owners()`) would flag although a cell writes it.

```
PROBE=out.txt [LAPS=1] [ONLY=pop,hypercell] npx vitest run tools/probe/explained.test.ts
```

## Material

| written side | motifs | folded | partly | unfolded | median share one cell explains |
|---|---|---|---|---|---|
| the splice tree (`structure()`) | 1017 | 210 (21 %) | 133 (13 %) | 674 (66 %) | 0.20 |
| + each line's laps | 1017 | 483 (47 %) | 176 (17 %) | 358 (35 %) | 0.71 |

48 of the 77 pieces have motifs. Some pieces, splice tree + laps:

| piece | motifs | folded | partly | unfolded |
|---|---|---|---|---|
| pop | 21 | 18 | 0 | 3 |
| hypercell | 36 | 24 | 6 | 6 |
| prelude | 28 | 23 | 5 | 0 |
| royal | 42 | 27 | 0 | 15 |
| korobeiniki | 67 | 37 | 5 | 25 |
| canon | 28 | 0 | 2 | 26 |
| bwv847 (from MIDI) | 248 | 43 | 89 | 116 |

What it means:

- **The splice tree alone is the wrong written side.** It has no node for a line that splices nothing, and a cell that loops is the commonest way a figure repeats: 29 pieces have no written node at all. With each line's laps the folded share more than doubles. The written side needs every line's laps from the engine; a guess from the clock (this probe) misses where a part restarts when a section switches it on.
- **What stays unfolded is partly real and partly the written model's holes.** Real: the fugue converted from MIDI (bwv847: 116 unfolded), what Convert to cells hasn't folded yet, which is what this axis is for. Holes: the canon (0 folded) replays one score in several voices delayed (`[<<n]`), so one figure sits at different offsets of different lines, and the rule calls that unfolded. So do copies (`base=`), parts restarted by a section, and a figure repeated transposed through a turning table at another offset. Each hole is a rule the written side must learn before a gap on screen can be trusted.
- **The presentation is small.** The time view already boxes the motifs (the *patterns* layer); folded against unfolded is a colour on those boxes and a share in the toolbar.

## Sound

| | pieces |
|---|---|
| a voice with no pitch (noise) or a kit | 30 of 77 (39 %) |
| an effect with a tail (`room=`, `delay=`) | 26 of 77 (34 %) |

`owners()` gives a band to the voice whose note's harmonics put most into it. In more than a third of the pieces, sound that a cell writes owns no band: a hi-hat's noise, a kit's drums, a reverb's tail. So "no note owns it" is not "nothing writes it". Making it honest means knowing each voice's spectrum, which in practice means rendering a stem per voice. And then the question dissolves: every sound in the output comes from some cell by construction, so stems leave no unexplained band. What remains is the interplay between voices (a resonator's coupling, distortion's intermodulation): a research topic, not a gap a piece's author can act on.

## Recommendation

- **Sound: drop it as an axis.** Analysis-heavy (stems, spectra) for a gap that is empty by construction. The waterfall's colours keep their use. If they should be exact, stems would do it, as a change of their own.
- **Material: worth it, after the written side.** The heard side exists, and the drawing is a colour on the boxes already drawn. The work is in the written model:
  1. Every line's laps from the engine, its restarts by sections included (`structure()` in [yggi/cells](https://github.com/yggi/cells), "lap after lap" as its own doc says, for lines that splice nothing too). That is a language-repo change.
  2. Copies, canons (`[<<n]`, `base=`) and transposition by a turning table, taken as the same cell.
  3. Only then the app part: folded/unfolded on the patterns layer and the share in the toolbar.

  Without 1 and 2 the screen would show false gaps in a third of the pieces with motifs. That is a rabbit hole for the app alone, and a modest, well-placed change in the engine.
- **"Everything in the graph affects the output"** is mostly answered without analysis: the graph's routing (`routed`, `muted`) already knows which nodes can sound, and a cell that never plays in a piece's run is a count from the plan. That is a cheap written-only gap, worth a line in the toolbar beside the levels.
