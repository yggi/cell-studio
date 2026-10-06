# Known limits

What Cell studio doesn't do yet or does with a catch, documented rather than tracked. Planned work is in [roadmap.md](roadmap.md) and the issues.

## Language

- Filters are one per voice (as on a monosynth): overlapping notes share the last envelope.
- A pitch drop is the sound parameters `penv`/`pdec`, not a `pitch=` shape in seconds.
- Selectors choose parts in a braid's position only; they don't read in a voice's position (orchestration) or a melody's (multiplexing). There is no `restart=&x`, and label templates have no `{lap}`.
- A voice can't be a pitch source in a product (`&op2 * &op1` is an error: "a voice, not a pitch"); FM is `fm=` ([language/physics.md](language/physics.md)), without feedback or loops.
- No inversion within a scale (`(7 - &theme) * &lead` mirrors in semitones; keeping the scale's steps would need something like `&theme[-]`).
- Mixes and the sound card colour by the 12-tone grid; they may hear several grids.

## Engine and audio

- Belts don't pull back on their driver (load is static `mass=`/`friction=`); no live display of a belt's stretch or slips; belts between non-meter cells in chains aren't supported; no flutter beside `wow=`.
- A noise voice starts at a random point of its noise buffer on each note, so no two plays or renders are bit-identical (pitch, level and timing are).
- The live views, not the audio, are what loads the main thread; on a slow phone a large graph can still saturate it (measure with [testing.md](testing.md); the numbers are in the profile skill's README).

## Editor

- Unnamed cells `&( … )` are read-only in the node editor: edit their line.
- Multi-line mixes and in-place sound-card channels are edited in the code.
- Mixes have no visual editor for their expressions (pitch terms, gains).
- Pinning is layout, not music, so it isn't saved in the code.

## Layout

- Clusters overlap in the largest pieces (a cluster-level first placement is the fix: lay the tags out as a graph, then each tag's cells inside its region); BWV 847 is wide.
- A restarted part's playhead shows the global clock, not its own restarted time.
- Notes float near the top; a note can't point at the cell it explains.
- A column pull (keeping nodes in their symmetric columns while they settle) costs crossings at every strength tried (0.005–0.06): it's a slider, off by default; the columns shape only the start.
- The layout is more sensitive to node size than it should be: `free()` sliders hang under their node's label but aren't counted in its collision size, and giving them room (even +8 px each) shifts the waltz and per tonos into crossings.
- Sailor (the densest example) settles with a few drawn crossings; Lullaby's `&sink` drifts away from `&song`; in the waltz's physics without its fixed layout, the outer motif `&V` settles level with the meter.
