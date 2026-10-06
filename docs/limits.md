# Known limits

What Cell studio doesn't do yet or does with a catch, documented rather than tracked. Planned work is in [roadmap.md](roadmap.md) and the issues.

## Language

- Filters are one per voice (as on a monosynth): overlapping notes share the last envelope.
- `penv`/`pdec` (a pitch drop) are sound parameters, not a `pitch=` shape in seconds.
- Mixes and the sound card colour by the 12-tone grid; they may hear several grids.
- Selectors choose parts in a braid, not yet in a voice's position or a melody's.

## Engine and audio

- Noise voices take only a volume's level at the note start (Tone's NoiseSynth).
- Belts don't pull back on their driver (load is static mass and friction); belts between non-meter cells in chains aren't supported; no flutter beside wow.
- Rendering uses Tone.js and the main thread; on a slow phone a large graph keeps it ~30% busy playing (measure with [testing.md](testing.md)).

## Editor

- Unnamed cells `&( … )` are read-only in the node editor: edit their line.
- Multi-line mixes and in-place sound-card channels are edited in the code.
- Mixes have no visual editor for their expressions (pitch terms, gains).
- Pinning is layout, not music, so it isn't saved in the code.

## Layout

- Clusters overlap in the largest pieces; BWV 847 is wide.
- A restarted part's playhead shows the global clock, not its own restarted time.
- Notes float near the top; a note can't point at the cell it explains.
