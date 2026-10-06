# Known limits

What Cell studio doesn't do yet or does with a catch, documented rather than tracked. Planned work is in [roadmap.md](roadmap.md) and the issues.

## Language

- Filters are one per voice (as on a monosynth): overlapping notes share the last envelope.
- Selectors choose parts in a braid's position only; they don't read in a voice's position (orchestration) or a melody's (multiplexing). There is no `restart=&x`, and label templates have no `{lap}`.
- A voice can't be a pitch source in a product (`&op2 * &op1` is an error: "a voice, not a pitch"); FM is `fm=` ([language/physics.md](language/physics.md)), without feedback or loops.
- No inversion within a scale (`(7 - &theme) * &lead` mirrors in semitones; keeping the scale's steps would need something like `&theme[-]`).
- Mixes and the sound card colour by the 12-tone grid; they may hear several grids.

## Engine and audio

- Belts don't pull back on their driver (load is static `mass=`/`friction=`); no live display of a belt's stretch or slips; belts between non-meter cells in chains aren't supported; no flutter beside `wow=`.
- Two renders of a piece are not bit-identical: Chromium sums three or more inputs of a node in an order that changes from run to run, so the last bit of a float differs (about −180 dB). Nor are two plays: Tone's reverb impulse and a tape's hiss are made from `Math.random()`, which we leave to Tone, so the reverb's tail and a hiss differ a little each time. Nothing of ours is random ([testing.md](testing.md#promises)). Pieces with a resonator vary much more (#65).
- A mix's spectrum wheel hears its voices whole, not only the notes that go through it: a voice in two mixes shows in both ([#77](https://github.com/yggi/cell-studio/issues/77)). The graph's states and edges do say which mix plays now.
- Scopes, spectrum wheels and tape levels read the signal as it is made, so they run ahead of the speaker by the output lag (about 55 ms with the default `balanced` hint; the position, notes, cells and edges are held back to match what is heard: [decision 005](decisions/005-balanced-latency-and-heard-pictures.md)).
- Tape Machine peaks at −0.2 dB, a little over the −1 dB convention, and its average level doesn't follow its parts' gains as expected ([#95](https://github.com/yggi/cell-studio/issues/95)).
- The live views, not the audio, are what loads the main thread; on a slow phone a large graph can still saturate it (measure with [testing.md](testing.md); the numbers are in the profile skill's README).

## Editor

- Unnamed cells `&( … )` are read-only in the node editor: edit their line.
- Multi-line mixes and in-place sound-card channels are edited in the code.
- Mixes have no visual editor for their expressions (pitch terms, gains).
- Pinning is layout, not music, so it isn't saved in the code.

## Layout

- Tags start as blocks and hubs pull a cluster as one, but clusters still touch in the largest pieces (30 overlapping pairs over the library; [notes/27-layout.md](notes/27-layout.md)); BWV 847 is wide. A meter is placed last, where most of its edges cross nothing; in the densest pieces only a few of them can be drawn (the rings say the rest).
- A restarted part's playhead shows the global clock, not its own restarted time.
- Notes float near the top; a note can't point at the cell it explains.
- A column pull (keeping nodes in their symmetric columns while they settle) costs crossings at every strength tried (0.005–0.06): it's a slider, off by default; the columns shape only the start.
- The layout is more sensitive to node size than it should be: `free()` sliders hang under their node's label but aren't counted in its collision size, and giving them room (even +8 px each) shifts the waltz and per tonos into crossings.
- Sailor (the densest example) settles with a few drawn crossings; Lullaby's `&sink` drifts away from `&song`; in the waltz's physics without its fixed layout, the outer motif `&V` settles level with the meter.
- The library's graph: a tag only one piece carries keeps only a small room in the layout (it shows only zoomed in, from 0.6), so its word may overlap other words there — accepted. At the full view the titles are about 8–9 px on a desktop: all 52 titles and the tags' words fill the wheel at that size.
