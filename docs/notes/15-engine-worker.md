# Engine in a worker (issue #15, with groundwork for #9)

Date: 2026-10-06 · Status: handed over (seam built and measured; worker opt-in) · Issues: #15, #9, epic #14

## What was done
- **What to play next is plain data.** `src/engine/schedule.ts`: `windowAt(plan, from, length)` gives a window's notes and its moving tapes' speeds; `retime` puts it on the audio clock. `Player` and `renderOffline` both use it (the Player's own copy of the tape sampling is gone). `VoiceBank.play` takes one note object (`Played`, audio times).
- **The `Engine` seam** (`src/audio/engine.ts`): `load(plan, source)`, `window(from, length)`, `grab`, `reset`, `stats`. `LocalEngine` works on the app's plan (the default). `WorkerEngine` talks to `engine.worker.ts`, a shell around `src/engine/host.ts` (pure, tested in node): it compiles the same source with the same env, plans it as the app does (code shifts, `off`), mirrors every hand and Reset, and answers windows in order. A window not answered in 40 ms is worked out locally (the main thread keeps its plan anyway: the views read it), and a worker that errors is dropped for good. Choose it with `?engine=worker` or `localStorage['cell-studio:engine'] = 'worker'`.
- **`LiveSource`** (`src/audio/live.ts`): what views ask of the sound and how hands reach it, one object from `App` to `Graph` (was ten props). `GraphContext extends LiveSource` (since #144 it has one: `ctx.sound`). A hand on a motor or belt now goes `ctx.grab → Player.grab → engine.grab` (was `Graph` calling `physics.grab` on the program itself), so it reaches a worker too.
- **voices.ts split** (#9's first audio item): `voices.ts` 1,039 → 351 lines (the bank: which voices exist, mixes, what feeds tapes and resonators); parts in `src/audio/voice/`. The 19 `as unknown as` casts there are now 3, in `voice/nodes.ts`.
- **Golden renders** (`tools/golden.mjs`, `cellStudio.render`): how the "no change in sound" was checked, for every commit. See [testing.md](../testing.md).

## Measurements (production build, headless Chromium, `tools/profile/measure.mjs`, 20 s, same session)

Main-thread busy % (long tasks, longest ms):

| piece | local ×1 | worker ×1 | local ×4 | worker ×4 |
|---|---|---|---|---|
| Metronome | 10.8 | 11.3 | 45.9 | 51.8 |
| Zelluläre Aktivität | 22.1 | 22.1 | 81.2 (12, 75) | 83.9 (20, 82) |
| Baustelle II | 27.7 | 27.5 | 89.2 (36, 90) | 92.5 (51, 94) |
| Cellular Brothers | 27.6 | 28.5 | 90.8 (99, 120) | 90.0 (75, 104) |
| Prelude and Fugue in C minor | 48.0 (9, 113) | 50.2 (10, 129) | 93.7 (101, 712) | 93.5 (103, 728) |
| Test Tones on Tape | 24.8 | 24.4 | 90.4 (42, 78) | 90.4 (22, 97) |
| Hypercell | 36.7 | 33.1 | 92.3 (117, 130) | 91.4 (115, 103) |

No difference beyond run-to-run noise, as #13 predicted (scheduling is < 1 % of the main thread). Worker round trip, all 52 pieces in the smoke test: ~1.3 ms average, 41 ms worst, no window late; window compute ≤ 23 ms (Bach), worker compile + plan ~10 ms. **So the worker stays opt-in**: per #15's own rule ("abandon if the gain is below noise") for scheduling alone.

## What's open
- **Task 3 of #15, the part that could pay:** the per-frame live state (`liveAt`, `valuesAt`, `notesAt`, labels, tape motion) still runs on the main thread from `ctx.program`. Moving it means views read a snapshot type, not the `CompileResult` (the large refactor #15 describes). The host already holds the piece and mirrors hands; a `live(t)` message is the next step. Measure it the same way before making it the default.
- Hand latency in a real browser (grab a motor, hear it within one window): the order of messages guarantees it (a grab is posted before the next window is asked), and `engine.test.ts` checks the mirroring, but there is no Playwright test of the audible path yet.
- The rest of #9 is untouched: `Player` still mixes transport, held tapes and the UI clock (only "what to play next" moved out); engine file sizes; `routedNodes`; the per-frame `valuesAt` cache; `App.svelte`; ESLint/Prettier; strictness.

## Gotchas
- Offline renders are not bit-repeatable in Chromium, not even with Math.random seeded: a resonator strike disconnects its burst and mallet from `onended` on the main thread while the offline context renders on, so forks and kalimba vary by up to about −45 dB from run to run (#65). `golden.mjs` compares block levels and renders a differing piece again before it counts. With that disconnect taken out (in base and change alike, temporarily) the split matched to −88 dB.
- The worker compiles the program's *source*: `App` keeps the text of the last version that compiled (`good.source`), held `free()` values included, with its env. The plan must be made the way `planOf` makes it (`codeShifts`, `result.off`), or worker and views disagree.
