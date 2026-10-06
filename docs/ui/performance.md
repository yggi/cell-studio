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

## Caveats
- It measures the page and the audio context, not what you hear: a clean report doesn't prove the sound was clean,
  but underruns or a slow audio clock prove it wasn't. Listen as well.
- `longtask` and long-animation-frame entries exist only in Chromium browsers (Android Chrome, desktop Chrome/Edge);
  Safari and Firefox get the frame numbers only.
- Reported memory and cores are what the browser says, rounded or capped for privacy.
- Headless / desktop numbers from `tools/profile` are comparable in kind, not in value: use one device and one
  piece for before/after comparisons.

Code: `src/ui/perf.ts` (summaries, report, collector; tested in `perf.test.ts`), `src/ui/PerfOverlay.svelte`
(loaded only when on), `Player.audioInfo()`. Headless measurement: [tools/profile/README.md](../../tools/profile/README.md).
