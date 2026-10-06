# Architecture

What lives where in Cell studio, and how source text becomes sound. Language: [language/overview.md](language/overview.md). Views: [ui/graph.md](ui/graph.md). Known gaps: [limits.md](limits.md). History and decisions: [MEMORY.md](MEMORY.md).

## Hard rules

- The code text is the single source of truth. Every graph edit is a rewrite of that cell's own line (`src/engine/edit.ts`: `setAttr`, `setFlag`, `setShift`, `setOff`, `setBraid`, `setTiming`; pure string to string, comments kept).
- `src/engine/` and `src/layout/` are pure TS: no DOM, no Tone. They run in node under vitest.
- Theme values come from `src/app.css` and `src/ui/theme.ts` only (theme.ts mirrors app.css for colours computed in code; change both together).

## Data flow

```
code text (App.svelte `code`)
  parse()              engine/parser.ts   -> ParseResult (AST types: ast.ts)
  compile()            engine/compile.ts  -> CompileResult (cells, clocks, outputs, tapes, diagnostics)
  plan(result, shifts, muted)  engine/realize.ts -> Plan
  player.load(plan)    audio/player.ts
  every window: eventsBetween(plan, from, to) -> Played[]   (at, dur, voice, freq, bends, gains, levels)
  voices.play(...)     audio/voices.ts (Tone.js; createVoices)
  also: compile result -> buildGraph (engine/graph.ts) -> layout/ -> ui/ drawing
```

`compileSource(src, env)` = parse + compile. `codeShifts(result)` gives the shifts written in the code; live hand-turns replace them. `shiftsAt`, `clocking`, `timeMap` (realize.ts) make every stepped cell's shift a function of time. `Player` (a 16th-note window scheduler on the Tone transport) swaps programs in whole at the next window. `renderOffline` (audio/render.ts) plays the same plan into a buffer.

## src/engine

- `parser.ts`, `ast.ts`: one cell or command per line; `pieceMeta`.
- `compile.ts`: cells as helices over grids, `ROOT` grid, diagnostics, `MAX_EVENTS`.
- `realize.ts`: `flatten`, `plan`, `eventsBetween`, `timeMap`, `playedCells`; tape routing (`tapeMotion`, `routedNodes`); resonators.
- `edit.ts`: line rewrites. `graph.ts`: `buildGraph`, the graph of exactly what is written.
- `duration.ts`: piece length / loop cycle (`pieceTime`, `sections`, `mainTempo`).
- `compress.ts`: Shorten (`shorten`, `shortenAll`).
- `physics.ts` (motors, friction, belts: warps a clock's time map), `fm.ts` (Bessel spectrum), `wave.ts` (a voice's braid as waveform).
- `dough-params.ts`: sound parameter names. `presets.ts`: loads `examples/*.cells` (`PRESETS`; `examples.test.ts` checks every file). `fiveto12.ts`: the day-long cycle.
- Tape and resonator have no file of their own; they live in parser/compile/realize (tests: `tape.test.ts`, `resonator.test.ts`).

## src/layout (pure drawing logic)

`layered.ts` (Sugiyama rows), `physics.ts` (d3-force `ForceLayout`, `flowRanks`), `cellview.ts` (grid or braid view of a cell), `show.ts` (`show=`), `describe.ts` (sentence and connections), `labels.ts` (label templates), `library.ts` (pieces/tags graph), `geometry.ts` (SVG paths), `dial.ts` (wheel maths), `spectrum.ts` (polar waterfall), `belts.ts` (pulleys and belts).

## src/audio

`player.ts` (Player), `voices.ts` (createVoices, VoiceBank), `clock.svelte.ts` (reactive transport position), `render.ts` (offline render, WAV, `loudness`), `load.ts` (eases view refresh under load; sound is unaffected).

## Elsewhere

- `src/ui/`: Svelte components by role. Graph and nodes: `Graph`, `MiniGraph`, `LibraryGraph`, `FitView`, `CellNode`, `PieceNode`, `VoiceNode`, `MaterialNode`, `ScopeNode`, `SunNode`, `CellLink`, `BeltEdge`, `PulseEdge`, `GraphLegend`. Cell drawing: `CellGlyph`, `WaveGlyph`, `SpectrumWheel`, `ScopeView`, `PieceWheel`. Editing: `Editor`, `EditPop`, `StepEditor`, `HubEditor`, `TokenWheel`, `Keypad`, `Picker`, `CellSheet`, `CellFacts`, `ParamRows`, `Free*`, `ForcesPanel`, shared `Shorten`, `Transport`. Helpers: `theme.ts`, `highlight.ts`, `suggest.ts`, `tags.ts`, `context.ts`, `types.ts`, `longpress.ts`.
- `src/theory/modes.ts`: names, modes, `scan`, hues. `src/library.ts`: saved pieces (localStorage) and `.cells` files; always reports unavailable storage instead of failing.
- `src/App.svelte`: owns `code`, derives `result`/`plan`, wires `Player`, saving, render, and `window.cellStudio`. `src/main.ts` mounts it.
- `tools/`: Python generators (`bwv847.py`, `kern2cells.py`, `counterpoint.py`) and `tools/profile/` scripts.
- `.github/workflows/`: `ci.yml` (check, test, build), `deploy.yml`.
