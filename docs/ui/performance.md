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
