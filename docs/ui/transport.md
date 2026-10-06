# Transport

Play, pause, seek and render: the controls in the header (`src/ui/Transport.svelte`).

- **Play / pause.** Pausing keeps the place; the button beside it goes back to the start. Opening a piece starts from rest: nothing sounds until Play.
- **The time slider** shows where the piece is and seeks: drag it to play from there. A piece that loops shows its cycle; one that ends (`laps=`) shows its length and the transport stops at the end ([../language/time.md](../language/time.md)).
- **Sections.** When a selector plays the piece, its sections are marked on the track and named by the selector's `label=`; each mark is a jump, and the current one is lit. On a phone the track sits below the title.
- **Tempo.** The tempo of the meter that drives the piece is shown, and is a slider when it is a `free()` value, as in the graph ([../language/free.md](../language/free.md)).
- **Render to WAV** renders the piece offline, faster than it plays, and reports its average and peak level in dB (`src/audio/render.ts`; the same `loudness` the console's `cellStudio.measure` uses, [../testing.md](../testing.md)).
- **The screen stays awake** while playing, where the browser has the Wake Lock API.
