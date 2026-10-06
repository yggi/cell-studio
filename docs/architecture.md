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
  player.load(plan, source)    audio/player.ts
  every window: engine.window(from, 0.25)   audio/engine.ts -> engine/schedule.ts windowAt -> Window
               (plain data: Played[] — at, dur, voice, freq, bends, gains, levels — and moving tapes' speeds)
  retime(window, audioTime, secPerQuarter)  engine/schedule.ts: onto the audio clock
  voices.play(note)    audio/voices.ts (Tone.js; createVoices, parts in audio/voice/)
  also: compile result -> buildGraph (engine/graph.ts) -> layout/ -> ui/ drawing
        compile result -> routing (engine/routing.ts), liveAt (engine/live.ts) -> what the graph draws as sounding
```

The engine behind `engine.window` is local (in this thread, on the app's plan: the default) or a Web Worker (`?engine=worker` or `localStorage['cell-studio:engine'] = 'worker'`): `audio/engine.worker.ts` runs `engine/host.ts`, which compiles the same piece from its source, plans it, mirrors every hand (`grab`, `reset`) and answers windows by message; a window it doesn't answer within 40 ms is worked out locally. Measured, the worker doesn't lighten the main thread (scheduling is < 1 % of it; see [notes/15-engine-worker.md](notes/15-engine-worker.md)), so it stays opt-in; it's the message-shaped seam for moving the live state off the main thread later. Views read the sound through one `LiveSource` (`audio/live.ts`, implemented by `Player`): notes, spectra, waveforms, tapes, and hands (strike, damp, bow, scrub, grab).

`compileSource(src, env)` = parse + compile. `codeShifts(result)` gives the shifts written in the code; live hand-turns replace them. `shiftsAt`, `clocking`, `timeMap` (realize.ts) make every stepped cell's shift a function of time. `Player` (a 16th-note window scheduler on the Tone transport) swaps programs in whole at the next window. `renderOffline` (audio/render.ts) plays the same plan into a buffer.

## src/engine

- `parser.ts`, `ast.ts`: one cell or command per line; `pieceMeta`.
- `compile.ts`: cells as helices over grids, `ROOT` grid, diagnostics, `MAX_EVENTS`.
- `realize.ts`: `flatten`, `plan`, `eventsBetween`, `timeMap`, `playedCells`; tape motion (`tapeMotion`); resonators; the gates the scheduler uses (`outputSounds`, `endOf`, `picksNow`).
- `routing.ts`: what takes part in the sound, as graph nodes and edges: `routing` (what can sound), `liveRouting` (what does now), `drawn` (through petals), `nodeStateOf`/`edgeStateOf` (off, unrouted, on, idle, live). One model for nodes and edges: [ui/graph.md](ui/graph.md#states). `live.ts`: `liveAt`, the live view (playheads, lit table entries, and the live routing).
- `schedule.ts`: what to play next as plain data (`windowAt`, `tapeSpeeds`, `retime`, `isPhysical`). `host.ts`: the engine as a message handler (`createHost`: load, window, grab, reset; `planOf`, `grabIn`), what the worker runs.
- `edit.ts`: line rewrites. `graph.ts`: `buildGraph`, the graph of exactly what is written.
- `duration.ts`: piece length / loop cycle (`pieceTime`, `sections`, `mainTempo`).
- `compress.ts`: Shorten (`shorten`, `shortenAll`).
- `physics.ts` (motors, friction, belts: warps a clock's time map), `fm.ts` (Bessel spectrum), `wave.ts` (a voice's braid as waveform).
- `dough-params.ts`: sound parameter names. `order.ts`: the library's order of examples (`ORDER`: a new file in `examples/` needs an entry). `presets.ts`: `PRESETS`, every `examples/*.cells` read at once (one plain-text piece per file, the format users save), for the tests; `examples.test.ts` checks every file compiles clean and has a title, tags and `level=`, and that the index below is current. The app doesn't use it: `src/examples.ts` has the build-time index (`virtual:examples-index`, made by `tools/examples-index.ts` through a plugin in `vite.config.ts`: title, description, tags, size, time, bytes) and `loadExample(key)`, which fetches a piece's source (its own chunk) when it's drawn or opened; only the first piece is in the first bundle. `fiveto12.ts`: the day-long cycle.
- Tape and resonator have no file of their own; they live in parser/compile/realize (tests: `tape.test.ts`, `resonator.test.ts`).

## src/layout (pure drawing logic)

`layered.ts` (Sugiyama rows), `physics.ts` (d3-force `ForceLayout`, `flowRanks`), `cellview.ts` (grid or braid view of a cell), `show.ts` (`show=`), `describe.ts` (sentence and connections), `labels.ts` (label templates), `library.ts` (pieces/tags graph), `geometry.ts` (SVG paths), `dial.ts` (wheel maths), `spectrum.ts` (polar waterfall), `belts.ts` (pulleys and belts).

## src/audio

`player.ts` (Player: transport, windows onto the audio clock, tapes held and scrubbed; implements `LiveSource`), `engine.ts` (`Engine`: `LocalEngine`, `WorkerEngine`, `chooseEngine`) and `engine.worker.ts`, `live.ts` (`LiveSource`, what views ask of the sound), `voices.ts` (createVoices, VoiceBank: wires the piece's voices, mixes, tapes and resonators), `voice/` (its parts: `voice.ts` a voice's chain and a note on it, `resonator.ts`, `tape.ts`, `noise.ts`, `params.ts` moving parameters, `nodes.ts` the typed bridge between Tone's nodes and native ones), `clock.svelte.ts` (reactive transport position), `render.ts` (offline render, WAV, `loudness`, `sampleHash`, `blockLevels`), `load.ts` (eases view refresh under load; sound is unaffected).

Scheduling: Tone's context is made with `latencyHint: 'balanced'` (about 55 ms made-to-heard on the phone measured, `audio/tuning.ts`) and a 0.3 s look-ahead (0.12 s for pieces with hands, so a grabbed motor answers quickly); the sound itself runs on the audio thread, so a busy main thread delays scheduling (covered by the look-ahead), not the sound. The pictures are drawn from the position of what is *heard* (the audio clock held back by the output timestamp's lag, `audio/heard.ts`), not of what is made. Live views refresh about 24 times a second (spectrum wheels 15, and only while on screen) and stretch their interval when frames come late. Details and measurements: `tools/profile/README.md`.

## Elsewhere

- `src/ui/`: Svelte components by role. Graph and nodes: `Graph`, `MiniGraph`, `LibraryGraph`, `FitView`, `CellNode`, `PieceNode`, `VoiceNode`, `MaterialNode`, `ScopeNode`, `SunNode`, `CellLink`, `BeltEdge`, `PulseEdge`, `GraphLegend`. Cell drawing: `CellGlyph`, `WaveGlyph`, `SpectrumWheel`, `ScopeView`, `PieceWheel`. Editing: `Editor`, `EditPop`, `StepEditor`, `HubEditor`, `TokenWheel`, `Keypad`, `Picker`, `CellSheet`, `CellFacts`, `ParamRows`, `Free*`, `ForcesPanel`, shared `Shorten`, `Transport`. Helpers: `theme.ts`, `highlight.ts`, `suggest.ts`, `tags.ts`, `context.ts`, `types.ts`, `longpress.ts`.
- `src/theory/modes.ts`: names, modes, `scan`, hues. `src/library.ts`: saved pieces (localStorage) and `.cells` files; always reports unavailable storage instead of failing.
- `src/App.svelte`: owns `code`, derives `result`/`plan`, wires `Player`, saving, render, and `window.cellStudio`. `src/main.ts` mounts it.
- `tools/`: Python generators (`bwv847.py` writes `examples/bwv847.cells`; `kern2cells.py`, `counterpoint.py`) and `tools/bwv847.reference.json` and `tools/profile/` scripts. Python deps: `pip install -r tools/dev-requirements.txt` (music21).
- `.github/workflows/`: `ci.yml` (check, test, build, deploy to gh-pages from `main`); `smoke.yml` (play every piece, for the PR labelled `candidate` only); `dependabot.yml` (weekly npm and actions).
