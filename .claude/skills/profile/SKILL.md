---
name: profile
description: Measure and attribute the main-thread load of Cell studio while a piece plays (headless Chromium + CDP), compare before/after a change, and check that a freshly opened piece is silent. Use for any performance claim or regression hunt on the live views, and when asked to profile, measure frame/CPU load, or find what makes the page busy.
---

# Profiling the live app

Scripts live in `tools/profile/` (see its README). They measure the **page**: main-thread busy %, long
tasks, and which code the time goes to. Headless Chromium has no audio device, so they say nothing about
audible glitches or late notes; for those use a real phone.

## When
- Before and after any change meant to make playback lighter (issue #13), or when a change might make the live
  views heavier (scopes, spectrum wheels, labels, tapes, anything with `requestAnimationFrame`).
- When asked "why is it slow / busy on this piece".
- A performance claim in a PR needs numbers from `measure.mjs`, same pieces, same flags, before and after.

## Setup
1. `npm ci` (once).
2. Playwright and Chromium: `tools/profile/playwright.mjs` finds the project's `playwright`, `$PLAYWRIGHT`, or
   the cloud container's preinstalled one (`/opt/node-tools`). Set `CHROME_PATH=/path/to/chrome` if the
   default browser isn't found. Don't run `playwright install`.
3. Serve a **production build** (numbers from `vite dev` are not comparable):
   `npm run build && npx vite preview --port 4173 &`
   For the "before" numbers build the base commit into another directory
   (`git stash` or a worktree, `npx vite build --outDir /tmp/dist-old`, `npx vite preview --outDir /tmp/dist-old --port 4175`)
   and run the same command against both ports.

## Measure
```
node tools/profile/measure.mjs <url> <throttle> <seconds> "<piece title>" ...
# e.g. node tools/profile/measure.mjs http://localhost:4173/ 4 20 "Metronome" "Hypercell" "Test Tones on Tape"
```
Prints one JSON line per piece. Read `taskPct` (main-thread busy %), `scriptPct`, `longtasks` / `longMax`
(tasks over 50 ms), `audioAdvance` (audio clock moved with wall time: the audio thread is alive).
- `throttle` is the CDP CPU slowdown: `1` is this machine, `4` is a rough stand-in for a mid-range Android
  (the target device class, together with desktop).
- Piece titles are the library search text; the **first** match is opened, so use a distinctive part.
- The standard set (what #13 tracks): Metronome, Zelluläre Aktivität, Baustelle II, Cellular Brothers,
  "Prelude and Fugue in C minor", Test Tones on Tape, Hypercell. Run each at throttle 1 and 4, 20 s.
- Targets from #13: ≤ 25 % busy at ×1 and no long tasks > 100 ms at ×4. At the end of #20 most heavy pieces
  were 30–55 % at ×1 and still ~85–95 % at ×4, so ×4 is the open problem.
- Run measurements one at a time and don't run tests/builds alongside (they distort the numbers). Compare
  runs from the same session; absolute numbers move between machines.

## Attribute (where does the time go)
```
npx vite build --minify false --outDir /tmp/dist-nomin        # readable function names
npx vite preview --outDir /tmp/dist-nomin --port 4174 &
THROTTLE=4 node tools/profile/cpu.mjs http://localhost:4174/ "Hypercell" 15   # writes profile-Hypercell.json
node tools/profile/agg.mjs profile-Hypercell.json                       # self and inclusive time by function
node tools/profile/lines.mjs profile-Hypercell.json /tmp/dist-nomin/assets/index-*.js 14   # inclusive % by source line
node tools/profile/names.mjs valuesAt,formatLabel,tick profile-*.json   # inclusive % of named functions
```
(Percentages in `agg.mjs` are shares of busy time. `(program)` and `(idle)` are native/browser and idle
time; `(program)` was ~45 % at ×4 and is not yet attributed: a Chrome trace is the next tool.)
In the non-minified build the app is one chunk (`assets/index-*.js`) with no per-file URLs, so map lines back to source with `lines.mjs`
(it prints the code at each hot line) and search for it in `src/`.

Where the *browser* spends it (style, layout, paint, compositing, GC, which a JS profile shows only as
`(program)`), and what ran inside each long task:
```
THROTTLE=4 node tools/profile/trace.mjs http://localhost:4173/ "Hypercell" 10
CSS="canvas{display:none!important}" node tools/profile/trace.mjs ...   # ablation: switch a kind of drawing off
```
It prints main-thread busy %, painted frames and rAF callbacks per second, self time per event type, and the
largest events of the first long tasks. Busy % saturates near 90–100 % at ×4, so judge changes by the ×1 numbers
(and by the ablation), not by ×4 alone. To count what the page redraws, a `MutationObserver` over
`document.body` for 5 s (by attribute and element) shows the churn directly.

Engine cost without a browser: `npx vite-node tools/profile/engine-time.ts` (compile/plan/events per example;
it was 2–16 ms / ≤ 3 ms / ≤ ~21 ms per 8 s of music, so the engine is not the bottleneck).

## On a real device
No cable needed: open the app with `?perf` (or Files ▾ → Show performance report), Record, play a piece for 30 s,
Stop, Copy report, paste it into the issue (`docs/ui/performance.md`). It reports frames, long tasks, long
animation frames, the audio clock and underruns where the browser has them, with a verdict against the #13
targets. Ask the owner for a report from the phone before claiming a performance fix works on Android.

## Silence check
`node tools/profile/fresh-open.mjs <url>` opens pieces in sequence (playing, paused, tape pieces) and fails
if a freshly opened piece sounds or keeps the old transport position. It taps the audio output before the
destination, so it works headless.

## What the data has shown (don't re-derive)
- Audio scheduling (`eventsBetween`, `Voices.play`) is < 1 % of the main thread; the live views are the load.
- Biggest costs found, in order: `$derived` values read inside frame callbacks (recomputed on every read
  outside an effect: snapshot them once per frame); one reactive DOM element per point/segment (draw one
  `<path>`); label fields computed when not asked for; per-frame analyser reads and canvas repaints
  (`getFloatFrequencyData`, `SpectrumWheel.draw`).
- Per-frame arrays that are replaced whole belong in `$state.raw`: a deep `$state` proxy makes every element
  access a reactive read (a scope's traces: 36 % → 22 % busy on Test Tones on Tape).
- A tape's recording was ~100 `<line>`s with four attributes rewritten per frame (~7000 DOM writes a second);
  static lines in a rotating `<g>` took it to one transform. Look for per-frame attribute writes first.
- Canvas/analyser work follows the size a wheel is seen at (`SpectrumWheel`: resolution and refresh by on-screen size).
- Views refresh slower when frames come late (`src/audio/load.ts`); new per-frame views should use
  `load.scale` and skip work when not visible.

## Pitfalls
- `vite preview --outDir` is unreliable for a second build; serve a non-minified build with
  `python3 -m http.server <port>` from its directory, and use a fresh port (a stale server on a port keeps answering).
- Never `pkill -f "<pattern>"` from the shell when the pattern also occurs in your own command line: it kills
  the shell. Kill by PID or stop the background job you started.
- Library cards are a `<button class="open">` containing clickable tag arcs: scripted clicks use
  `dispatchEvent('click')` on the button (a centre click can hit a tag arc and filter instead of opening; see #12).
- Run Playwright with `--autoplay-policy=no-user-gesture-required` (the scripts do).
- `playoutStats` (underruns) is not available in this headless setup: it prints `null`.
- Keep `profile-*.json` and screenshots out of git (`.gitignore` covers them).

## Reporting
Post a before/after table (piece × throttle: busy %, long tasks) in the issue/PR, say which build and
throttle, and list what was **not** measured (real device, audible glitches).
