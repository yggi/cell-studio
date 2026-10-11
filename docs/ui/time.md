# The time view

The piece as a tracker (#286): a fourth view beside select, graph and code. On a phone it is the **Time** tab; on a
wide screen the **time** button in the graph's toolbar shows it in the graph's pane, and its **graph** button goes back.

## What it shows

- **Across: time**, from the piece's start to its end, or one cycle of a loop (`mainLength`, as the transport's slider
  has it; 5 to 12: a day). The playhead is a line; while playing, the view pages on with it.
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
  - **waterfall**: the rendered sound's spectrum, in the audible (behind the notes).
  - **waveform**: the rendered sound, in the card's octave at the top.
  - **sections**: the sections the code writes (the selector's steps, `sections`), as lines with their names.
  - **heard**: boundaries heard in the scalogram (swells of the three signals at the sections' scale; with no sections,
    cones of entries), marks under the notes: white on a section, orange on none.

  Which layers are on, and the scalogram's signal, are kept in this browser.

## Hands

Drag to move along, the wheel (or a trackpad's sideways swipe) to zoom (or move), two fingers to pinch; a click (no
drag) plays from there (`playback.seek`); a double click, or **fit**, shows the whole piece.

## How it is worked out

- The notes are the plan's (`eventsBetween`), over the view's length, worked out only while the view is shown.
- The scalogram is `engine/time/` ([the note](../notes/scalogram.md)), run in a worker (`ui/time.worker.ts`): a day's
  piece takes about a minute; *listening…* says it's at work. It starts once the code has been still for 0.4 s, and a
  newer piece ends the old job.
- The sound is rendered offline (`audio/render.ts` `renderStretch`) ten seconds at a time, the first five minutes at
  most, only while the waterfall or the waveform is on: a render's cost grows faster than its length (Pop's 96 s at
  once took over two minutes in a headless browser), so stretches keep it linear and the waveform fills in as they
  come. The waterfall is worked out from it in the worker. A note ringing across a stretch's start is cut there.
- The geometry (the axes, zoom, pan, follow, ticks, zones) is `layout/timeview.ts`; the drawing `ui/TimeView.svelte`;
  the settings `ui/state/time.svelte.ts`; the colours `--time-*` (app.css) and `TIME` (theme.ts).

Pictures: `node tools/gallery.mjs time [pieces…]` (the gallery skill), each piece in each state.
