# Known limits

What Cell studio doesn't do yet or does with a catch, documented rather than tracked. Planned work is in [roadmap.md](roadmap.md) and the issues.

## Language

- Filters are one per voice (as on a monosynth): overlapping notes share the last envelope.
- Selectors switch taps of a meter's bus only ([decision 016](decisions/016-arranging-at-the-input.md)); they don't read in a voice's position (orchestration) or a melody's (multiplexing). A part switched on always starts from its top (no resume yet), and label templates have no `{lap}`.
- A voice can't be a pitch source in a product (`&op2 * &op1` is an error: "a voice, not a pitch"); FM is `fm=` ([language/physics.md](language/physics.md)), without feedback or loops.
- No inversion within a scale (`(7 - &theme) * &lead` mirrors in semitones; keeping the scale's steps would need something like `&theme[-]`).
- A braid of note names turned with `shift=` climbs by its table's lap, not the root's: `&u C shift=2` is C6, where `&u 0 shift=2` is D.
- Choices `[a|b]` take numbers only: not note names, nor Strudel's sequences (`[0 2|4]`, an error says so).
- `scale(…)` knows the names in `SCALES` (`theory/modes.ts`): not yet `diminished` or `chromatic`.

## Engine and audio

- Belts don't pull back on their driver (load is static `mass=`/`friction=`); no live display of a belt's stretch or slips; belts between non-meter cells in chains aren't supported; no flutter beside `wow=`.
- Two renders of a piece are not bit-identical: Chromium sums three or more inputs of a node in an order that changes from run to run, so the last bit of a float differs (about −180 dB). Nor are two plays: Tone's reverb impulse and a tape's hiss are made from `Math.random()`, which we leave to Tone, so the reverb's tail and a hiss differ a little each time. Nothing of ours is random ([testing.md](testing.md#promises)). Pieces whose resonators form a feedback loop (`couple=`, a board: forks, kalimba) vary much more, up to about −45 dB: Chromium processes a loop in an order that changes from run to run (#65; accepted).
- A mix's wheel hears the notes that go through it (#77), but a voice's tap into it is opened for as long as such a note sounds, and it hears the voice whole while it is open: while one voice plays notes through two mixes at once, each of the two wheels hears both (the voice's notes meet in its filters and grit before they reach a tap; telling them apart would take a chain per mix, and grit doesn't add up). A resonator's tap is always open: it rings from more than its notes.
- A sound tape is a delay network on the audio clock. Held (the transport not playing) a tape with a loop is frozen — its write gate and hiss closed, its loop going round on its own with no loss — so it keeps its lap for as long as it is held, and turning it plays that lap over and over. A tape without a loop (`length=` 0: heads only) cannot be frozen: its heads read what the delays still hold, for 4 tape lengths and a second (at most 3 minutes) after the pause, then silence. Playing again from a scrolled tape goes on from where the pause left the loop, not where the scroll left it (the loop is not turned to match). A true buffer of its own would be an `AudioWorklet` (#17).
- Scopes, spectrum wheels and tape levels read the signal as it is made, so they run ahead of the speaker by the output lag (about 55 ms with the default `balanced` hint; the position, notes, cells and edges are held back to match what is heard: [decision 005](decisions/005-balanced-latency-and-heard-pictures.md)).
- Tape Machine peaks at −0.2 dB, a little over the −1 dB convention, and its average level doesn't follow its parts' gains as expected ([#95](https://github.com/yggi/cell-studio/issues/95)).
- A key held live (MIDI in, the computer keys, the dock, the piano roll's keys) is cut when its voice is rebuilt: an edit to the voice's line, or a `free()` moved on its params, while the key is down.
- A drone (a voice alone, held: [decision 028](decisions/028-the-smallest-piece.md)) is one note held ten minutes at a time (`HELD`, engine/realize.ts), then struck again, a fresh attack over the old one's release; what moves in it (its `pitch=`, levels, moving parameters) is worked out and scheduled a note at a time, so a fast vibrato costs one window about 20 ms when play starts. Playing from the middle starts it there; scrubbing by hand doesn't strike it. MIDI out sends it as one note, let go at Pause or Stop; its envelope's playhead isn't drawn.
- The live views, not the audio, are what loads the main thread; on a slow phone a large graph can still saturate it (measure with [testing.md](testing.md); the numbers are in the profile skill's README).

## Editor

- Unnamed cells `&( … )` are read-only in the node editor: edit their line.
- Multi-line mixes and in-place sound-card channels are edited in the code.
- Mixes have no visual editor for their expressions (pitch terms, gains).
- Pinning is layout, not music, so it isn't saved in the code.

## Layout

- Tags start as blocks and hubs pull a cluster as one, but clusters still touch in the largest pieces (30 overlapping pairs over the library; [notes/27-layout.md](notes/27-layout.md)); BWV 847 is wide. A meter's net crosses some edges in the densest pieces (about 12 crossings over the library).
- A voice with more than about ten products in one mix has its junction dots stacked on its rim (they sit within 60° of 12 o'clock): they overlap rather than spread (#194).
- A restarted part's playhead shows the global clock, not its own restarted time.
- A piece with an `anchor=` clock shows its heads at 0 while stopped; they jump to the anchored time of day at Play.
- Splices nest seven deep in a braid's track (`MAX_DEPTH` is 6 and the top level counts as 0, `layout/track.ts`); deeper ones are not drawn as bulbs.
- A note about a cell drawn as a bulb (not a node) has no rim to wear its number; a cell watched by several scopes wears one dot per scope, which tells them apart only while a scope is pointed at in the margin.
- A column pull (keeping nodes in their symmetric columns while they settle) costs crossings at every strength tried (0.005–0.06): it's a slider, off by default; the columns shape only the start.
- The layout is more sensitive to node size than it should be: `free()` sliders hang under their node's label but aren't counted in its collision size, and giving them room (even +8 px each) shifts the waltz and per tonos into crossings.
- Sailor (the densest example) settles with a few drawn crossings; Lullaby's `&sink` drifts away from `&song`; in the waltz's physics without its fixed layout, the outer motif `&V` settles level with the meter.
- The library's graph: a tag only one piece carries keeps only a small room in the layout (it shows only zoomed in, from 0.6), so its word may overlap other words there — accepted. At the full view the titles are about 8–9 px on a desktop: all 52 titles and the tags' words fill the wheel at that size.
