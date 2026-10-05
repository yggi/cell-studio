# TODO

Open language questions and known limits, roughly in order of what they unlock.

## Language

### Done since: `map=edo` (cycle= has one job), kits as tables of voices, `map=lin`, the sound card holding its mix, `map=adsr`, mixes used like voices (instruments).

### Done: sound parameters as cells (lpf=200..3000 * &fenv * &accent), times as clocks (delaytime=&bar*3/4).
Still open: a pitch drop (`penv`/`pdec`) as `pitch=` with a per-note shape in
seconds — a pitch counterpart of map=adsr — and they could retire. Filters are
one per voice (as on a monosynth): overlapping notes share the last envelope.

### Done: transposing a reference in place, `&x^n` (grid steps, after its tables).

### Maybe: scale-step inversion
Real inversion already works in a pitch sum: `(7 - &theme) * &lead` mirrors the
theme round G, in semitones. Inversion *within the scale* — keeping its steps —
needs the theme's values negated before the scale reads them, e.g. `&theme[-]`.
Retrograde is done (`&theme[::-1]`).

### Grids: done — map=ed(r), map=ratios, fractions, geo() in scans, map=db, colours and names on a voice's grid.
Still open: mixes and the sound card colour by the 12-tone grid (they may hear several grids).

### Done: the graph laid out in layers (layered.ts): rows by flow, barycentre order with swaps,
places towards neighbours, long rows staggered; the physics only relaxes; nothing pinned. size=.
Done too: balanced forces (spread, kinds, clusters), tracks for crowded rows, tags= clusters, FM.
Still open: clusters overlap in the largest pieces (a cluster-level first placement: lay the tags
out as a graph of their own, then each tag's cells inside its region); BWV 847 is still wide;
Physical cells — done: motor/mass/friction/wind/wow on meters, belts (belt/damping/slip) on driven
cells, varispeed; Music Box, Tape Machine, Automaton; belted step edges labelled. Still: belts don't
pull back on their driver (load is static mass/friction); showing a belt's stretch and slips live;
belts between non-meter cells in chains; flutter (fast, irregular) beside wow.
Done: crackle — headroom (playback latency, 0.3 s look-ahead), late notes start from silence (or are left
out past 50 ms), live views ~24/s, spectrum wheels only when seen (15/s), the hidden tab truly hidden;
the time slider (seeking); the screen kept awake while playing; tags reworked.
Still: the main thread is ~30% busy playing a large graph (live glyph updates, Tone's scheduling) — on a
slow phone, measure again; a worklet-free audio path is fine, the page work is what's left to trim.
Done: offline rendering (Render to WAV; window.cellStudio.measure for tests), loudness audit and
level= on every example, Cell Phase (euclid() in use). Next on the wish list: seeking (play from a
section), slides (a step gliding into the next: the 303), selectors choosing voices/melodies,
In Cell (after Riley), a gamelan (pelog, kotekan), a tempo canon (Nancarrow), a Bach chorale,
tintinnabuli (cells derived from cells by a rule), Web MIDI out with clock, share links.
FM feedback (an operator on itself), parked. Open questions:
  1. how: a fixed wavetable (y = sin(φ + β·y), exact, static) → crossfaded tables (moving) → a worklet
     (true feedback, but worklets have failed to load in some contexts);
  2. loops between operators (A→B→A): allow as an experimental feature, or keep forbidding them?
  3. drawing: a self-loop edge with the amount, or a ring that thickens on the wheel?
  4. spectrum: exact via an FFT of the table (no closed form like Bessel), or approximate?
  5. a piece: a DX7 brass or bass patch (feedback is the rasp). Done: FM spectrum (Bessel),
BWV 847 tagged, the large pieces tagged by role, rows tightened (no row wider than its nodes need).
Earlier: very long rows (BWV 847's fugue) — a voice's many parts could form a column under it
instead of a row; edge bundling for the meter's timing edges.

### Done: selectors (a stepped cell reading a table of parts: arrangement, restart on each pick), laps=n, the transport stopping at the end.
Next for selectors:
- In a voice's position (orchestration: `&theme * &(over=&band step=… 0 1 2)`)
  and a melody's (multiplexing: `&solo over=[&a, &b] …`) — the same reading.
- A restarted part's playhead in the graph shows the global clock, not its own
  restarted time; the live view should count from its window's start.
- `{lap}` in label templates; `restart=&x` (start again when &x completes a lap).

### 7. Not built yet
- **Voices as pitch sources (FM)**: `&op2 * &op1`, the gain as modulation depth.

## Engine / audio
- Noise voices take only a volume's level at the note start (Tone's NoiseSynth);
  give them the same per-note level path as oscillators.
- `scale(t, p)` is documented as shorthand for two unnamed cells; keep it.

## show= / label=: done — wave, levels, petal, off, conventions, labels by room, notes.
- Notes float near the top; a note can't yet point at the cell it explains (an edge to it).

## Editor
- Unnamed cells `&( … )` are read-only in the node editor (edit their line).
- Multi-line mixes and in-place sound-card channels are edited in the code.
- Mixes have no visual editor for their expressions (pitch terms, gains).

## Layout
- A column pull (keeping nodes in their symmetric columns while they settle)
  costs crossings at every strength tried (0.005–0.06): it's a slider, off by
  default; the columns shape only the start.
- In the waltz's physics (without its fixed layout), the outer motif `&V`
  settles level with the meter.
- free(…) sliders hang under their node's label but aren't counted in its
  collision size; giving them room (even +8 px per slider) shifts the waltz and
  per tonos into crossings — the layout is more sensitive to node size than it
  should be. Look at that before adding room.
- Sailor (the densest example) still settles with a few drawn crossings.
- Lullaby's `&sink` drifts away from `&song` (a long edge past `&roots`).
