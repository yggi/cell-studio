# Testing

What the tests promise and how to run them; see [architecture.md](architecture.md) for the code they cover.

## Run

CI (`.github/workflows/ci.yml`, Node 22) runs these three after `npm ci`:

- `npm run check`: svelte-check with `tsconfig.json`.
- `npm test`: `vitest run` (`npm run test:watch` while editing).
- `npm run build`: `vite build`.

Tests are `*.test.ts` beside their source, in node: they can only cover `engine/`, `layout/`, `theory/`, a few `ui/` helpers and the docs.

## Groups

- Theory: `src/theory/modes.test.ts`.
- Parser: `parser.test.ts`. Compile: `compile.test.ts`, `duration.test.ts`, `physics.test.ts`, `fiveto12.test.ts`.
- Realize (what sounds): `realize.test.ts` (notes, times, levels, per example), `tape.test.ts`, `resonator.test.ts`, `fm.test.ts`, `wave.test.ts`; `edit.test.ts` for line rewrites.
- Layout: `src/layout/*.test.ts` (belts, cellview, describe, dial, geometry, labels, physics, show, spectrum).
- UI helpers: `src/ui/colour`, `highlight`, `suggest` tests.

## Promises

- Shorten (`src/engine/compress.ts`) preserves every note: `compress.test.ts` runs `shorten` on every preset; each suggestion is shorter and `sounds()` is identical (events from `plan` + `eventsBetween`). `shortenAll` is tested too.
- BWV 847: `tools/bwv847.reference.json` (written by `tools/bwv847.py`, which downloads the CCARH encoding itself and also writes `examples/bwv847.cells`) is checked note by note in `realize.test.ts`: onset, length and pitch per voice, as sounded through the tempo map.
- Counterpoint: the Ricercar's passes obey the species rules in `realize.test.ts` (`problems(...)` on what sounds, also per tonos). `tools/counterpoint.py` searched for the lines under the same species rules.
- Loudness: not in vitest (needs Web Audio). Measure in the browser with `window.cellStudio` (defined in `src/App.svelte`):
  - `await cellStudio.measure(seconds?)` renders offline, returns `{ rms, peak, clipped }` (dB below full scale; `clipped` counts samples at the ceiling).
  - `cellStudio.length()`: default render length in seconds.
  - `cellStudio.level(name)`: a voice's current peak level, or `null`.
- Docs: `src/docs.test.ts` compiles every ```` ```cells ```` block under `docs/language/` with no diagnostics, checks `docs/INDEX.md` lists each page, and that relative links resolve.

## Profiling

Not a test. See `.claude/skills/profile/SKILL.md` and [tools/profile/README.md](../tools/profile/README.md).
