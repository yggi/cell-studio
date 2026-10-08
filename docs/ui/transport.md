# Transport

Play, pause, stop, seek and render: the controls in the header (`src/ui/Transport.svelte`).

- **Three states** (`src/audio/transport.ts`, a pure table with a test; `Player` carries them out): **stopped** (the initial state: time 0, no hand has touched anything, nothing recorded), **paused** (anything that is neither playing nor initial) and **playing**. A touch takes stopped to paused: a hand laid on a resonator (strike, damp, bow), a tape (scrub) or a belt (grab) — all five go through `Player`, which calls `touch()` itself — a turned wheel, or the slider. Lifting a hand does not (it can be lifted after Stop); a turn moves where play starts. Stopped is kept, not derived from "time is 0": a touch at time 0 is paused. The design and what is still to come: [#201](https://github.com/yggi/cell-studio/issues/201).
- **Play / pause.** Pausing keeps the place. Opening a piece starts from rest: nothing sounds until Play.
- **Stop** (the square) goes back to the initial state from anywhere: time 0, tapes wound off, hands' forces and turns gone, held `free()` values dropped. It is there when there is something to go back from. A stopped piece plays from the initial conditions.
- **A piece that ends** (`laps=`) pauses at its end, with what hands did kept; Play then goes on from the start. Stop, then Play, starts afresh.
- **The time slider** shows where the piece is and seeks: drag it to play from there. A piece that loops shows its cycle; one that ends (`laps=`) shows its length and the transport stops at the end ([../language/time.md](../language/time.md)).
- **Sections.** When a selector plays the piece, its sections are marked on the track and named by the selector's `label=`; each mark is a jump, and the current one is lit. On a phone the track sits below the title.
- **Tempo.** The tempo of the meter that drives the piece is shown, and is a slider when it is a `free()` value, as in the graph ([../language/free.md](../language/free.md)).
- **Render to WAV** renders the piece offline, faster than it plays, and reports its average and peak level in dB (`src/audio/render.ts`; the same `loudness` the console's `cellStudio.measure` uses, [../testing.md](../testing.md)).
- **The screen stays awake** while playing, where the browser has the Wake Lock API.
