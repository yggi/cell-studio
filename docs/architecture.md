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

`compileSource(src, env)` = parse + compile. `codeShifts(result)` gives the shifts written in the code; live hand-turns replace them. `shiftsAt`, `clocking`, `timeMap` (clocking.ts) make every stepped cell's shift a function of time. `Player` (a 16th-note window scheduler on the Tone transport) swaps programs in whole at the next window. `renderOffline` (audio/render.ts) plays the same plan into a buffer.

## src/engine

- `parser.ts`, `ast.ts`: one cell or command per line; `pieceMeta`.
- `compile.ts`: cells as helices over grids, `ROOT` grid, diagnostics, `MAX_EVENTS`.
- `realize.ts`: `plan` (every output's braid flattened once), `eventsBetween` (the notes that start in a window: tapes' echoes, laws, selectors, chance); the gates the scheduler uses (`outputSounds`, `endOf`, `picksNow`, `liveGains`). Its parts:
  - `clocking.ts`: time. `timeMap` (swing, positions in a bar, a motor or a belt), `clocking` (a program's clocks at a moment), `shiftsAt` (tables turning), `playedCells`, `physicsOf`, `tapeMotion`.
  - `flatten.ts`: a braid as numbers in its own steps (`flatten`, `unitsFor`, `stepsOf`, `StepEvent`).
  - `series.ts`: a cell read as a stream over a note (`modulation`, `levelSeries`, `paramTracks`, `pitchOf`).
  - `values.ts`: what a cell sounds at a moment, for views (`valueAt`, `valuesAt`, `notesAt`).
  - `ids.ts`: graph ids (`cellId`, `edgeId`, `stepEdgeId`), shared with `muted` sets.
- `routing.ts`: what takes part in the sound, as graph nodes and edges: `routing` (what can sound), `liveRouting` (what does now), `drawn` (through petals), `nodeStateOf`/`edgeStateOf` (off, unrouted, on, idle, live). One model for nodes and edges: [ui/graph.md](ui/graph.md#states). `live.ts`: `liveAt`, the live view (playheads, lit table entries, and the live routing).
- `schedule.ts`: what to play next as plain data (`windowAt`, `tapeSpeeds`, `retime`, `isPhysical`). `host.ts`: the engine as a message handler (`createHost`: load, window, grab, reset; `planOf`, `grabIn`), what the worker runs.
- `edit.ts`: line rewrites. `graph.ts`: `buildGraph`, the graph of exactly what is written.
- `duration.ts`: piece length / loop cycle (`pieceTime`, `sections`, `mainTempo`, `anchoredAt`). `held.ts`: `free()` values moved by hand, by their place in the code.
- `compress.ts`: Shorten (`shorten`, `shortenAll`).
- `physics.ts` (motors, friction, belts: warps a clock's time map), `fm.ts` (Bessel spectrum), `wave.ts` (a voice's braid as waveform).
- `dough-params.ts`: sound parameter names. `order.ts`: the library's order of examples (`ORDER`: a new file in `examples/` needs an entry). `presets.ts`: `PRESETS`, every `examples/*.cells` read at once (one plain-text piece per file, the format users save), for the tests; `examples.test.ts` checks every file compiles clean and has a title, tags and `level=`, and that the index below is current. The app doesn't use it: `src/examples.ts` has the build-time index (`virtual:examples-index`, made by `tools/examples-index.ts` through a plugin in `vite.config.ts`: title, description, tags, size, time, bytes, and the graph in miniature from `layout/miniature.ts`) and `loadExample(key)`, which fetches a piece's source (its own chunk) when it's opened; only the first piece is in the first bundle. `fiveto12.ts`: the day-long cycle.
- Tape and resonator have no file of their own; they live in parser/compile/realize/clocking (tests: `tape.test.ts`, `resonator.test.ts`).

## src/layout (pure drawing logic)

`layered.ts` (Sugiyama rows), `physics.ts` (d3-force `ForceLayout`, `flowRanks`), `cellview.ts` (grid or braid view of a cell), `show.ts` (`show=`), `describe.ts` (sentence and connections), `labels.ts` (label templates), `library.ts` (pieces/tags graph), `miniature.ts` (a piece's graph, small, for the library: in the examples' index at build time), `clusters.ts` (a tag's wash, in both graphs), `geometry.ts` (SVG paths), `wheel.ts` (one geometry for every wheel: hub, rim, disc, playhead), `dial.ts` (wheel maths, labels fitted to a wheel), `spectrum.ts` (polar waterfall), `belts.ts` (pulleys and belts).

## src/audio

`player.ts` (Player: transport, windows onto the audio clock, hands; implements `LiveSource`), `heldTapes.ts` (sound tapes while stopped: held where they stand, moved by hand), `device.ts` (the audio context: made as `tuning.ts` says, and what it reports to the performance overlay), `engine.ts` (`Engine`: `LocalEngine`, `WorkerEngine`, `chooseEngine`) and `engine.worker.ts`, `live.ts` (`LiveSource`, what views ask of the sound), `voices.ts` (createVoices, VoiceBank: wires the piece's voices, mixes, tapes and resonators), `voice/` (its parts: `voice.ts` a voice's chain and a note on it, `resonator.ts`, `tape.ts`, `noise.ts`, `params.ts` moving parameters, `nodes.ts` the typed bridge between Tone's nodes and native ones), `clock.svelte.ts` (reactive transport position), `render.ts` (offline render, WAV, `loudness`, `sampleHash`, `blockLevels`), `ticker.ts` (`onFrames`: the one frame loop for the transport clock and every live view, each at its own interval, eased under load; sound is unaffected).

Scheduling: Tone's context is made with `latencyHint: 'balanced'` (about 55 ms made-to-heard on the phone measured, `audio/tuning.ts`) and a 0.3 s look-ahead (0.12 s for pieces with hands, so a grabbed motor answers quickly); the sound itself runs on the audio thread, so a busy main thread delays scheduling (covered by the look-ahead), not the sound. The pictures are drawn from the position of what is *heard* (the audio clock held back by the output timestamp's lag, `audio/heard.ts`), not of what is made. Live views refresh about 24 times a second (spectrum wheels 15, and only while on screen) from one shared frame loop (`audio/ticker.ts`) and stretch their interval when frames come late. Details and measurements: `tools/profile/README.md`.

## Elsewhere

- `src/ui/`: Svelte components by role. Graph and nodes: `Graph`, `MiniGraph`, `LibraryGraph`, `FitView`, `CellNode`, `PieceNode`, `VoiceNode`, `MaterialNode`, `ScopeNode`, `SunNode`, `CellLink`, `BeltEdge`, `PulseEdge`, `GraphLegend`. Cell drawing: `CellGlyph`, `WaveGlyph`, `SpectrumWheel`, `ScopeView`, `PieceWheel`. Editing: `Editor`, `EditPop`, `StepEditor`, `HubEditor`, `TokenWheel`, `Keypad`, `Picker`, `QuickPick`, `CellSheet`, `CellFacts`, `ParamRows`, `Free*`, `ForcesPanel`, shared `Shorten`, `Transport`. Helpers: `flownode.ts` (which node draws a cell, and how large), `trap.ts` (a modal's focus), `theme.ts`, `highlight.ts`, `suggest.ts`, `tags.ts`, `context.ts`, `types.ts`, `longpress.ts`, `entries.ts`, `wakeLock.ts`, `perfSwitch.ts`.
- `src/theory/modes.ts`: names, modes, `scan`, hues. `src/library.ts`: saved pieces (localStorage) and `.cells` files; always reports unavailable storage instead of failing.
- `src/App.svelte`: owns `code`, derives `result`/`plan`, wires `Player`, opening and saving, render. Held `free()` values: `engine/held.ts`; the library's cards: `ui/entries.ts`; the screen wake lock: `ui/wakeLock.ts`; the performance overlay's switch: `ui/perfSwitch.ts`; `window.cellStudio`: `src/debugHook.ts`. `src/main.ts` mounts it.
- `tools/`: Python generators (`bwv847.py` writes `examples/bwv847.cells`; `kern2cells.py`, `counterpoint.py`) and `tools/bwv847.reference.json` and `tools/profile/` scripts; `smoke.mjs` with `smoke-pick.ts` (the smoke test, [testing.md](testing.md)). Python deps: `pip install -r tools/dev-requirements.txt` (music21).
- `.github/workflows/`: `ci.yml` (check, test, build, deploy to gh-pages from `main`); `smoke.yml` (start every piece and play a set covering every kind of sound, for the PR labelled `candidate` only); `dependabot.yml` (weekly npm and actions).
