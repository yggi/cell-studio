# Changelog

What changed in Cell studio, newest first. The app is deployed from `main` on every push, so
this lists user-visible changes; each release (a version bump in `package.json` and a `vX.Y.Z`
tag) gathers the entries under *Unreleased* beneath its own heading. The version and commit of
the running build are shown in the piece picker's **Files** menu.

Format: [Keep a Changelog](https://keepachangelog.com/). Add a line to *Unreleased* in the PR
that makes the change. Also note changes to the language that could affect saved `.cells` pieces.

## Unreleased

### Added
- The running build's version and commit, shown in the **Files** menu.
- A favicon.

### Changed
- Sound: Tone's default audio context is now closed when the app creates its own, so only one runs (less battery use on Android).
- Tests run without per-file isolation (faster).

### Developer
- CI runs `npm run check`, the tests and the build on pull requests and on `main`.
- `window.cellStudio` (`measure`, `length`, `level`) is documented in the README.
- `.gitignore` covers Python caches, editor files, coverage and logs.

## 0.9.0 — 2026-10-06

The first version in this repository, seeded from cell-studio-19 (#1) and deployed to gh-pages (#2).
Earlier history was not kept; what 0.9.0 contains is described in the README (the language, the
graph editor, the example pieces, offline WAV rendering) and in `TODO.md` (open questions and known limits).
