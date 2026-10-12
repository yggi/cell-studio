# The time view

The piece as a tracker (#286): a fourth view beside select, graph and code. On a phone it is the **Time** tab; on a
wide screen the **time** button in the graph's toolbar shows it in the graph's pane, and its **graph** button goes back.

## What it shows

- **Across: time**, from the piece's start to its end, or one round of a loop (the cycle the transport's slider has;
  5 to 12: a day). A loop goes round, so its scalogram is transformed circularly (no edges, nothing veiled: the end
  runs into the start); one with chance, whose rounds differ, is listened to for three rounds (`listening` in
  `engine/time/span.ts`) and they are folded into one (`fold` in `engine/time/wavelet.ts`: each moment the mean of the
  rounds), its notes drawn every round's on the one. The playhead is a line, round the cycle while playing (a click
  plays from that place in it); while playing, the view pages on with it.
- **Up: frequency, on the tower's axis** ([multiscale](../notes/multiscale.md), `layout/tower.ts`): from the piece's
  slowest level at the bottom through the slow (below 0.5 Hz) and the pulse to the audible (from 20 Hz) and the sound
  card's samples (from 20 kHz) at the top. The marks read as times below 20 Hz (1 min, 1 s, 0.1 s) and as frequencies
  above (100 Hz, 1 kHz). Every layer sits at its own height:
  - **scalogram**: the notes' wavelet transform, a period as a frequency, in the slow and the pulse: which time scales
    are louder than usual, when. Three signals added as colours: *breaks* (sound against silence) red, *entries* (new
    pitches, a voice coming in) green, *density* (each voice's notes) blue; where they agree their mixture, white where
    all three do. Or one alone on a ramp: every note, breaks, density, entries, or *keys* (a pitch class not heard for
    8 s: 5 to 12's ten-minute keys). A change of section is a cone pointing down at its moment.
  - **notes**: at their pitch, a semitone high, a colour a voice.
  - **waterfall**: the rendered sound's spectrum, in the audible (behind the notes), each band in the colour of the
    voice whose note sounds there (the notes' colours; `owners` in `engine/time/spectrogram.ts`: a note's harmonics,
    the first 32, each weighed level/k), as bright as it is loud; grey where no note explains it (a drum, noise, an
    effect's tail). The voices' colours are listed under the toolbar. Korobeiniki's A sections are red (its `pulse`
    lead), its B sections teal (`pulse50`).
  - **waveform**: the rendered sound, in the card's octave at the top.
  - **sections**: the sections the code writes (the selector's steps, `sections`), as lines with their names.
  - **heard**: boundaries heard in the scalogram (swells of the three signals at the sections' scale; with no sections,
    cones of entries), marks under the notes: white on a section, teal on a splice, orange on neither.
  - **splices**: a tick where a braid turns to its next spliced cell (`&tune &a &b &end …`; `engine/time/splices.ts`),
    where the output then plays: phrases written inside a braid rather than as a clock.
  - **cells**: each clocked cell's span on the tower (from its step down to its turn, `towerSpans`), a bar at the left:
    a cone or a ridge against the cell that writes it.
  - **meter**: dashed lines across the scalogram at the beat and the bar of the meter that drives the piece (its tempo
    cell's step and turn, `mainTempo`) and the sections' usual length, labelled; the bars' lines where they are far
    enough apart to see. At the right, the levels the scalogram hears most (`ridges`: the peaks of each row's mean
    power), named after what makes them where one is within a semitone's ratio: the beat, the bar, the sections, or a
    cell's step or turn (Korobeiniki's 0.21 s, `tune step`).
  - **patterns** (off by default): the motifs heard at two time scales (`engine/time/motifs.ts`), boxed round their notes
    with their ratio, and the foldings alike at two levels or in rhythm and pitch (`engine/time/necklace.ts`), listed at
    the bottom; over the first ten minutes.

  Which layers are on, and the scalogram's signal, are kept in this browser.

## Hands

Drag to move along, the wheel (or a trackpad's sideways swipe) to zoom (or move), two fingers to pinch; a click (no
drag) plays from there (`playback.seek`); a double click, or **fit**, shows the whole piece.

## How it is worked out

- The notes are the plan's (`eventsBetween`), over the view's length, worked out only while the view is shown.
- The scalogram is `engine/time/` ([the note](../notes/scalogram.md)), run in a worker (`ui/time.worker.ts`): a day's
  piece takes about a minute; *listening…* says it's at work. It starts once the code has been still for 0.4 s, and a
  newer piece ends the old job.
- The sound is rendered offline (`audio/render.ts` `renderStretch`) five seconds at a time, one round of a loop, the
  first five minutes at most, only while the waterfall or the waveform is on: a render's cost grows faster than its
  length (Pop's 96 s at once took over two minutes in a headless browser; 40 s of Korobeiniki takes 1.9 s in five
  second stretches, 2.4 s in ten, 6.3 s at once), so stretches keep it linear and the waveform fills in as they
  come. The waterfall is worked out from it in the worker. A note ringing across a stretch's start is cut there.
- The geometry (the axes, zoom, pan, follow, ticks, zones) is `layout/timeview.ts`; the drawing `ui/TimeView.svelte`;
  the settings `ui/state/time.svelte.ts`; the colours `--time-*` (app.css) and `TIME` (theme.ts).

Pictures: `node tools/gallery.mjs time [pieces…]` (the gallery skill), each piece in each state.
