# Changelog

What changed in Cell studio, newest first. The app is deployed from `main` on every push, so
this lists user-visible changes; each release (a version bump in `package.json` and a `vX.Y.Z`
tag) gathers the entries under *Unreleased* beneath its own heading. The version and commit of
the running build are shown in the piece picker's **Files** menu.

Format: [Keep a Changelog](https://keepachangelog.com/). Add a line to *Unreleased* in the PR
that makes the change. Also note changes to the language that could affect saved `.cells` pieces.

## Unreleased

### Changed
- The examples are no longer all in the first download: the library is listed from an index made at build time (nothing is compiled to show it), and each piece's text is fetched when its card is drawn or it is opened (the first bundle is about 24 kB smaller gzipped). If a piece can't be fetched (offline, never opened before), it says so instead of opening. Saved `.cells` pieces are not affected.
- Cell studio is now an installable app (PWA): it has an icon and a manifest, works offline after the first visit, and shows "New version ready" when an update is waiting (it never reloads by itself, so a playing piece is not cut off). The build is no longer one `index.html` but normal files with Tone loaded on first Play. Saved `.cells` pieces are not affected.

### Fixed
- Opening a piece now starts it from rest: the transport stops at 0 and nothing sounds, even if another piece was playing (it used to carry on from where it was) or the new piece has tapes (their hiss sounded as soon as the piece opened).

### Added
- A performance overlay and a copyable performance report for measuring on a real device: open the app with `?perf` (or Files ▾ → Show performance report), press Record, play a piece, Stop, Copy report. See `docs/ui/performance.md`.
- The running build's version and commit, shown in the **Files** menu.
- A favicon.

### Changed
- On long braids drawn coarser (Bach's Prelude and Fugue), the thin border between segments is gone, so their notes show as clear coloured bars instead of slivers between dark lines. Wheels with wider segments keep their border. Under the hood a key turn is far cheaper (the once-a-bar stalls while the Prelude plays: 9 long tasks of up to 100-200 ms in 20 s become 0-2 of about 50 ms); the look and the sound are otherwise unchanged.
- Very long braids (over ~160 segments, in the examples only Bach's Prelude and Fugue) are drawn with coarser segments on the graph wheel: neighbouring steps are merged into one of at most ~2° and show their first note, so the notes of a 1,000-step wheel are visible instead of lost between rests, and a key turn rewrites a third of the paths (Prelude and Fugue: main-thread busy while playing ~55 → ~41 %, longest stall ~150 → ~105 ms). The cell sheet's wheel still draws every step; wheels under the cap, the sound and the code are unchanged.
- Lighter live views, second round (main-thread load while playing, headless at normal speed: Test Tones on Tape 40 → 24 %, Baustelle II 39 → 28 %, Hypercell 42 → 35 %): spectrum wheels are drawn at the size they are seen (zoomed-out wheels are cheaper and refresh less often), a tape's recording ring turns as one group instead of redrawing ~100 lines a frame, resonator and tape animations run at ~30 a second and back off when the page is busy, and scopes no longer read their traces through reactive proxies. The look is unchanged.
- Lighter live views while playing: scopes and spectrum wheels do much less work per frame (about half the main-thread load on the busiest pieces), skip it when off screen or silent, and refresh less often when the page falls behind. The sound is unchanged; wheels are drawn at up to 1.5× (was 2×) the layout size.
- Sound: Tone's default audio context is now closed when the app creates its own, so only one runs (less battery use on Android).
- Tests run without per-file isolation (faster).

### Developer
- Audio refactoring (#15, #9), no change in sound (every example's offline render compared before and after): what to play next is worked out as plain data (`engine/schedule.ts`) behind an `Engine` that runs in this thread (the default) or, opt-in with `?engine=worker`, in a Web Worker; `voices.ts` is split into `audio/voice/` parts behind the unchanged `VoiceBank`, with Tone's wrapped nodes bridged in one typed place; the graph gets the sound as one `LiveSource` object instead of ten callbacks. Measured: the worker doesn't lighten the main thread (`docs/notes/15-engine-worker.md`).
- `tools/golden.mjs` (golden renders: every example rendered offline and compared with a recorded run), `cellStudio.render(source, seconds)` and `cellStudio.engine()`, `ENGINE=worker npm run smoke`.
- Agent workflow (#6): `AGENTS.md` rewritten (what is enforced, what is judgment, what an agent decides alone), the `senior` skill for triaging, reviewing and merging PRs with the owner's approval, a PR template, a SessionStart hook that installs dependencies in cloud sessions, `.claude/settings.json` allowlist.
- CI: a smoke test (`npm run smoke`, `tools/smoke.mjs`) opens and plays every piece in Chrome; `deploy` is a job of the CI workflow and publishes the build CI made instead of testing and building again; a layering test keeps `engine/` and `layout/` pure.
- `tools/profile`: `bursts.mjs`, `burstlines.mjs`, `cellview-time.ts` (what a long task rewrites and spends its time on; what a table turn costs); `engine-time.ts` reads `examples/`.
- `docs/notes/41-prelude-bursts.md`: measured analysis and fix plan for the once-a-bar stalls in Bach's Prelude.
- `TODO.md` is gone: its open work is in the issues (#27–#37), its known limits in `docs/limits.md`, the rest in `docs/`.
- `tools/profile/trace.mjs`: a Chrome-trace breakdown of the browser's own time, with CSS ablation.
- `tools/profile/`: scripts to measure main-thread load while a piece plays (Playwright + CDP) and to attribute it to code.
- `.claude/skills/profile`: a Claude Code skill for using them (measure, attribute, compare before/after).
- CI runs `npm run check`, the tests and the build on pull requests and on `main`.
- `window.cellStudio` (`measure`, `length`, `level`) is documented in the README.
- `.gitignore` covers Python caches, editor files, coverage and logs.

## 0.9.0 — 2026-10-06

The first version in this repository, seeded from cell-studio-19 (#1) and deployed to gh-pages (#2).
Earlier history was not kept; what 0.9.0 contains is described in the README (the language, the
graph editor, the example pieces, offline WAV rendering).
