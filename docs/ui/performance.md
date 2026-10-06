# Performance report

How to see what the page feels like on the device in your hand, with no cable. Open the app with **`?perf`**
(it stays on until `?perf=off`), or use **Files ▾ → Show performance report**. A small pill appears at the
bottom left (`perf · 59 fps · 0 long`); its border turns amber, then red, as the page struggles. Tap it for the panel.

## The panel
- **Last 10 s** (live): frames a second, the frame interval's 95th percentile and worst, long tasks (> 50 ms:
  how many, the longest, the share of time the main thread was blocked), and the live views' refresh stretch
  (`audio/load.ts`: 1 = full rate, higher = the page is behind and the wheels and scopes refresh less often).
- **Record / Stop**: marks a window. Press Record, play the piece for 30 s, press Stop.
- **Copy report** (and **Share**, where the browser has it): the report as markdown for an issue, followed by the data
  as JSON in a collapsed block. Without a recording, it covers the last minute. If the browser refuses to copy, the
  text is selected in the box below for a long-press copy.

## What the report says
Device (user agent, cores, reported memory, pixel ratio, viewport), the piece (cells, graph nodes), the app
version, and for the window: frames and hitches, long tasks, long animation frames (Chrome 123+: what started the
slow frames — callbacks, promises, listeners), the refresh stretch, the audio context (state, sample rate,
latencies, how fast its clock ran against real time) and **audio underruns** where the browser reports them
(`AudioContext.playoutStats`; "not reported" otherwise), JS heap (Chrome), and a verdict in words against the
targets of issue #13: no task over 100 ms, under 25 % blocked, no underruns.

Since the first phone reports it also says:
- **Our own per-frame work**: a table of what our code spends per frame, timed with `timed(name, fn)` from
  `src/audio/stats.ts` (recorded only while the overlay is on): `transport + flush` (the transport clock write and the
  whole reactive flush it sets going: live state, labels, pulses, glyphs), `scope`, `wheel` (with `wheel.read` for the
  analyser reads and `wheel.draw`), `resonator`, `tape`. The share is of the steady-playback window. Add a mark around
  new per-frame work you want to see; the minified build makes the browser's own script names useless.
- **Main-thread responsiveness**: how long a message to ourselves waited for the main thread (every 100 ms): the
  closest thing to "how busy is the page" without a profiler; a p95 over 50 ms is a stalled page.
- **Notes**: scheduled, started a little late (shifted by the player), and left out for being more than 50 ms late
  (audible). The real-device glitch proxy while `playoutStats` is not reported.
- The verdict also flags a frame rate under 45 fps and frames longer than 50 ms taking more than 5 % of the time,
  which can happen with zero long tasks: work in many tasks under 50 ms still halves the frame rate.

Only **steady playback** counts: the first 3 s after each Play are left out (the audio engine and the reverb
impulse start then), and a window with less than 3 s of steady playback says so instead of a verdict.

## Latency: how far can it go on this device?
Three different delays, easily confused:
- **Output latency** (the device): how long after the audio engine makes a sample it is heard. Set by the browser's
  buffer (`latencyHint`: `balanced` is the app's default, then `playback`, `interactive`, or a number of seconds) and by what the
  platform does with it (on Android a power-saving stream adds a deep buffer: 280 ms was measured on a phone with `playback`;
  desktop `playback` is ~70 ms, `interactive` ~30 ms). This is what makes pictures run ahead of the sound (#67), and the only
  delay between a hand (strike, bow) and its sound. Lowering it risks **underruns on the audio thread**.
- **Look-ahead** (Tone, 0.3 s; 0.12 s for pieces with hands): how far ahead of the audio clock notes are scheduled, the
  margin the *page* has before a note is late. It does not delay the sound or the pictures; lowering it risks **late notes** when
  the main thread stalls.
- **Heard offset** (reported as "made-to-heard"): the difference between the engine's clock and what is heard now, from
  `getOutputTimestamp()`. The pictures are held back by exactly this (`audio/heard.ts`, smoothed; the report's **Latency tuning** row
  shows "pictures held back"), so the position, the highlighted notes and the lit cells show what is heard now, at any latency. What is
  *not* held back: the live views of the sound itself (scopes, spectra, tape levels read the signal as it is made), so they run ahead
  of the speaker by the same lag: about 55 ms with the default.

**Measured (Android 10, Chrome 154, the full test, 4 pieces × 4 settings, 25 s each):** output latency `playback` 280 ms,
`balanced` 56 ms, `interactive` 24 ms (look-ahead 0.1 s the same). No late or left-out notes, a steady audio clock and an idle main thread in all
16 runs; the audio-thread report was not available on that phone (no `renderCapacity`), so underruns inside the audio thread were not
visible: that is why `balanced`, with twice `interactive`'s buffer, is the default. `?latency=interactive` is there to try; if a piece clicks, `?latency=playback`.

**The automated test.** In the overlay (Files ▾ → Performance report, or `?perf`), **▶ Run full test** does all of this and
gives one report. It plays Hypercell, Bach's Prelude and Fugue, Test Tones on Tape and Baustelle II: Resonanz for 25 s each (after the 3 s start-up that
reports leave out) on four settings, from the safest down: `playback` (the old default), `balanced` (the default now), `interactive`, and `interactive` with a
0.1 s look-ahead, about 8 minutes in all. Before each setting it makes a new audio context (a context's latency is fixed when it is
made; it starts without another tap because the page has been tapped before), and it asks the phone to keep the screen on. Keep the page in front and
leave it alone: a test during which the page was in the background is marked, and a cancelled or cut-off series reports what ran.
The report names the lowest setting that stayed clean on every piece (nothing left out, no note more than 30 ms late, no missed
deadlines or underruns where the browser reports them, a steady audio clock), then a row for each piece and setting. It runs on the
graph view, the heaviest. The piece and tuning in use before are put back afterwards, and nothing is kept, so a reload is back to the defaults.
For trying it out, `?runseconds=10&runsettings=playback,interactive&runpieces=hypercell` shortens it
(settings: `playback`, `balanced`, `interactive`, `interactive-la100`; pieces: `hypercell`, `bwv847`, `testtones`, `resonanz`).

By hand, to try a setting, open the app with `?latency=interactive` (or `balanced`, `playback`, or seconds such as `0.05`) and/or
`?lookahead=0.1`. They are kept until `?latency=off` / `?lookahead=off`. The report's **Latency tuning** row shows what is in force and the
made-to-heard time; **Audio thread (renderCapacity)** (Chrome 126+, where present) shows the render thread's load and the share of
blocks that missed their deadline, which is the underrun measure; **Notes** shows late and dropped notes. A setting is safe on a
device when, over a few pieces played for 30 s each (a heavy one: Hypercell, Bach Prelude and Fugue, Test Tones on Tape, Baustelle II), the audio
thread's peak stays well under 80 % with no missed deadlines (or, without renderCapacity, nothing left out and the clock ratio
at 1.00×), and you hear no clicks.

## Caveats
- It measures the page and the audio context, not what you hear: a clean report doesn't prove the sound was clean,
  but underruns or a slow audio clock prove it wasn't. Listen as well.
- `longtask` and long-animation-frame entries exist only in Chromium browsers (Android Chrome, desktop Chrome/Edge);
  Safari and Firefox get the frame numbers only.
- Reported memory and cores are what the browser says, rounded or capped for privacy.
- Headless / desktop numbers from `tools/profile` are comparable in kind, not in value: use one device and one
  piece for before/after comparisons.

Code: `src/ui/perf.ts` (summaries, report, collector; tested in `perf.test.ts`), `src/ui/perfrun.ts` (the full test: settings, running, combined report; `perfrun.test.ts`), `src/ui/PerfOverlay.svelte`
(loaded only when on), `Player.audioInfo()`. Headless measurement: [tools/profile/README.md](../../tools/profile/README.md).
