# Testing

What the tests promise and how to run them; see [architecture.md](architecture.md) for the code they cover.

## Run

CI (`.github/workflows/ci.yml`, Node 22) is the gate on every PR and on `main` (the ruleset requires the `check` job; see [decision 004](decisions/004-agents-dont-merge.md#the-ruleset)):

- `check` job: `npm run check` (svelte-check), `npm test` (`vitest run`; `npm run test:watch` while editing), `npm run build`. It uploads the build.
- `smoke` job: `npm run smoke` on that build, in the runner's Chrome: `tools/smoke.mjs` opens every piece of the library, plays it for 2 s, and fails on any page error, console error, or an AudioContext that isn't running and advancing. This is the only check that builds the audio graph of every voice kind (tapes, resonators, FM, kits), since vitest has no Web Audio.
- The build is a PWA (`vite-plugin-pwa` in `vite.config.ts`): `dist/sw.js` precaches the shell and the Tone chunk; a new version waits for the user (`src/ui/UpdateToast.svelte`). `base` is `./`, so the same `dist/` works under `/cell-studio/` or any preview folder.
- `deploy` job (`main` only): publishes the `check` job's build to gh-pages; it doesn't test or build again. Deploys queue and never cancel each other; a run whose commit is no longer the head of `main` skips, so the newest commit is the one that ends up live.

Locally, run `npm test && npm run check` before pushing, and one file while iterating (`npx vitest run src/engine/parser.test.ts`). Run the smoke test only when you changed what it covers (audio, UI wiring, assets, `vite.config.ts`): `npm run build && npm run smoke -- 2 "Music Box"` (seconds, then piece-title words; all pieces if none). In a cloud session set `CHROME_PATH=/opt/pw-browsers/chromium`.

Tests are `*.test.ts` beside their source, in node: they can only cover `engine/`, `layout/`, `theory/`, a few `ui/` helpers, the examples and the docs.

## Groups

- Theory: `src/theory/modes.test.ts`.
- Parser: `parser.test.ts`. Compile: `compile.test.ts`, `duration.test.ts`, `physics.test.ts`, `fiveto12.test.ts`.
- Realize (what sounds): `realize.test.ts` (notes, times, levels, per example), `tape.test.ts`, `resonator.test.ts`, `fm.test.ts`, `wave.test.ts`; `edit.test.ts` for line rewrites.
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
- Layering: `src/architecture.test.ts` fails if a non-test file in `engine/` or `layout/` imports Svelte, Tone, `@xyflow`, `audio/` or `ui/`.
- Docs: `src/docs.test.ts` compiles every ```` ```cells ```` block under `docs/language/` with no diagnostics, checks `docs/INDEX.md` lists each page, and that relative links resolve.

## Profiling

Not a test. See `.claude/skills/profile/SKILL.md` and [tools/profile/README.md](../tools/profile/README.md).
