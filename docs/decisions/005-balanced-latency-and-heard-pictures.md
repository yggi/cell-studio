# 005 · The audio context is `balanced`, and the pictures show what is heard

**Date:** 2026-10-06 · **Status:** accepted · **Issues:** #67 (PRs #84, #86, #90)

## Context

The context was made with `latencyHint: 'playback'` (a large buffer) as a stop gate against dropped notes and starved sound when a busy main thread was the problem. On the owner's Android phone that gave 280 ms from a sample being made to being heard, and the pictures (driven from the audio clock, which says when a sample is *made*) ran that far ahead of the sound. Since the live-view work (#13, #78, #79) the main thread is idle during playback, so the gate could be re-measured.

The one-button test (`docs/ui/performance.md`; Android 10, Chrome 154; Hypercell, Bach 847, Test Tones on Tape, Baustelle II × 4 settings × 25 s) gave: `playback` 280 ms, `balanced` 56 ms, `interactive` 24 ms (look-ahead 0.1 s the same); no late or left-out notes, a steady audio clock, 0 % of the main thread blocked, in all 16 runs. That phone gave no `renderCapacity` report, so underruns inside the audio thread were not visible.

## Decision

1. The default hint is **`balanced`**, not `interactive`: five times lower than before, with a buffer twice `interactive`'s, because the one signal that would show underruns was missing. `?latency=interactive` stays an opt-in and `?latency=playback` the way back; both are kept until `?latency=off`.
2. The look-ahead stays (0.3 s, 0.12 s with hands): it is the page's margin before a note is late, it does not delay sound or pictures, and lowering it dropped notes in earlier headless runs.
3. The pictures are drawn from the position of what is **heard**: the transport at `Tone.immediate() − lag`, with `lag` the output timestamp's made-to-heard time, smoothed (`audio/heard.ts`). The other way (accepting the skew and lowering latency only) was rejected: any latency leaves a skew, and a Bluetooth sink makes it large.

## Consequences

- What is not held back: scopes, spectra and tape levels read the signal as it is made, so they run ahead of the speaker by the lag (about 55 ms by default). Holding them back needs a delay on each analyser; not done.
- Hands are heard sooner by the same amount as everything else. A hand's picture is drawn at the touch.
- If a device clicks, `?latency=playback`. Making `interactive` the default waits for an audio-thread report on the phone, or for listening.
