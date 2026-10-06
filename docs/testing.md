# Testing

What the tests promise and how to run them; see [architecture.md](architecture.md) for the code they cover.

## Run

CI (`.github/workflows/ci.yml`, Node 22) is the gate on every PR and on `main` (the ruleset requires the `check` job; see [decision 004](decisions/004-agents-dont-merge.md#the-ruleset)):

- `check` job: `npm run check` (svelte-check), `npm test` (`vitest run`; `npm run test:watch` while editing), `npm run build`. It uploads the build.
- Smoke test (`.github/workflows/smoke.yml`, not part of `ci.yml`): `npm run smoke` on a fresh build, in the runner's Chrome: `tools/smoke.mjs` opens every piece of the library, plays it for 2 s, and fails on any page error, console error, or an AudioContext that isn't running and advancing. This is the only check that builds the audio graph of every voice kind (tapes, resonators, FM, kits), since vitest has no Web Audio. It takes minutes, so it runs only for the **merge candidate**: label a PR `candidate` and it runs once on its head (and again after each push to it); other PRs and `main` don't run it. It isn't a required check: whoever merges waits for it (the `senior` skill).
- The build is a PWA (`vite-plugin-pwa` in `vite.config.ts`): `dist/sw.js` precaches the shell and the Tone chunk; a new version waits for the user (`src/ui/UpdateToast.svelte`). `base` is `./`, so the same `dist/` works under `/cell-studio/` or any preview folder.
- `deploy` job (`main` only): publishes the `check` job's build to gh-pages; it doesn't test or build again. Deploys queue and never cancel each other; a run whose commit is no longer the head of `main` skips, so the newest commit is the one that ends up live.

Locally, run `npm test && npm run check` before pushing, and one file while iterating (`npx vitest run src/engine/parser.test.ts`). Run the smoke test only when you changed what it covers (audio, UI wiring, assets, `vite.config.ts`): `npm run build && npm run smoke -- 2 "Music Box"` (seconds, then piece-title words; all pieces if none). In a cloud session set `CHROME_PATH=/opt/pw-browsers/chromium`.

Tests are `*.test.ts` beside their source, in node: they can only cover `engine/`, `layout/`, `theory/`, the audio engines (not Web Audio), a few `ui/` helpers, the examples and the docs.

## Groups

- Theory: `src/theory/modes.test.ts`.
- Parser: `parser.test.ts`. Compile: `compile.test.ts`, `duration.test.ts`, `physics.test.ts`, `fiveto12.test.ts`.
- Realize (what sounds): `realize.test.ts` (notes, times, levels, per example), `tape.test.ts`, `resonator.test.ts`, `fm.test.ts`, `wave.test.ts`; `edit.test.ts` for line rewrites; `schedule.test.ts` (windows, the engine host).
- Routing (what the graph draws as sounding): `routing.test.ts`: the cases of #11, and for every example that routed and live states agree (live within routed, edges with routed ends, every routed edge drawn), every voice that plays is routed and live while its note sounds, and what moves a voice is routed.
- Audio: `src/audio/engine.test.ts` (local and worker engines; no Web Audio needed).
- Layout: `src/layout/*.test.ts` (belts, cellview, describe, dial, geometry, labels, physics, show, spectrum).
- Examples: `src/engine/examples.test.ts` — every `examples/*.cells` file is listed, compiles with zero diagnostics, and has a title, tags and `level=`.
- UI helpers: `src/ui/colour`, `highlight`, `suggest` tests.

## Promises

- Shorten (`src/engine/compress.ts`) preserves every note: `compress.test.ts` runs `shorten` on every preset; each suggestion is shorter and `sounds()` is identical (events from `plan` + `eventsBetween`). `shortenAll` is tested too.
- BWV 847: `tools/bwv847.reference.json` (written by `tools/bwv847.py`, which downloads the CCARH encoding itself and also writes `examples/bwv847.cells`) is checked note by note in `realize.test.ts`: onset, length and pitch per voice, as sounded through the tempo map.
- Counterpoint: the Ricercar's passes obey the species rules in `realize.test.ts` (`problems(...)` on what sounds, also per tonos). `tools/counterpoint.py` searched for the lines under the same species rules.
- Loudness: not in vitest (needs Web Audio). Measure in the browser with `window.cellStudio` (defined in `src/App.svelte`):
  - `await cellStudio.measure(seconds?)` renders offline, returns `{ rms, peak, clipped }` (dB below full scale; `clipped` counts samples at the ceiling).
  - `cellStudio.length()`: default render length in seconds.
  - `cellStudio.level(name)`: a voice's current peak level, or `null`.
  - `await cellStudio.render(source, seconds?)`: renders any source (not only the open piece); adds `hash` (of the samples) and `blocks` (the level of every 2048 samples).
  - `cellStudio.engine()`: how the engine's windows went (which engine, how many, compute and round-trip ms, how many a worker answered too late).
- Golden renders (audio refactors): `tools/golden.mjs` renders every example offline in the browser (Math.random seeded) and compares block levels with a recorded run: record on the base commit (`npm run build && node tools/golden.mjs 6 > /tmp/golden.json`), then check the change (`… --check /tmp/golden.json`). Within −80 dB counts as the same; forks and kalimba vary by up to about −45 dB from run to run on their own (a resonator strike's nodes are disconnected while the offline render runs), so a differing piece is rendered twice more before it counts. Not in CI yet (#18).
- Engines (#15): `src/engine/schedule.test.ts` (windows match `eventsBetween` and survive a structured clone; the host mirrors hands), `src/audio/engine.test.ts` (the worker engine through a fake port: same windows, a late or failed worker falls back to the local plan). In the browser: `ENGINE=worker npm run smoke` plays every piece with the engine in a Web Worker.
- Graph states in the browser: `tools/shots.mjs` plays pieces and saves a screenshot and each node's and edge's drawn state (`npm run build && node tools/shots.mjs 3 "Sound on Tape"`; `DIST=` another build to compare).
- Layering: `src/architecture.test.ts` fails if a non-test file in `engine/` or `layout/` imports Svelte, Tone, `@xyflow`, `audio/` or `ui/`.
- Docs: `src/docs.test.ts` compiles every ```` ```cells ```` block under `docs/language/` with no diagnostics, checks `docs/INDEX.md` lists each page, and that relative links resolve.

## Profiling

Not a test. See `.claude/skills/profile/SKILL.md` and [tools/profile/README.md](../tools/profile/README.md).
