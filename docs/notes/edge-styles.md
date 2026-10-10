# Edge styles: what an edge shows, and the bus's geometry

**2026-10-10 · open: surveyed and planned, mock-ups drawn; waiting on the owner's choices (below) · #137, #238, #183, #150; on top of [nets.md](nets.md)**

The owner's ask: edges and net segments by colour and style, the bus's geometry, one mechanism and one place for the rules. Meter nets are good as they are. The colour bus needs a constant width through bends and a clean join between the loom and the bus. The other edges: what they show should follow what their source pushes, one style per band, and the payload should drive it while playing (a wave's height and length by the sound, pulse trains on clocks). Some edges are unstyled.

Pictures: `node tools/gallery.mjs edges` (every kind today), `golden 3 chords pop` (the real graph), and the new subject `node tools/gallery.mjs edge-mockups` (`tools/gallery/edgemocks/`: the options below, plain SVG on the theme; the geometry prototypes are in `proto.ts`). No open PR touches the edges: #268 adds the tower axis to `Graph.svelte`, #240 changes the layout, #267 and #269 are MIDI and the tutorial.

## What is drawn today

37 kinds on the edge sheet, by band:

| band | kinds | stopped | live | gap |
|---|---|---|---|---|
| none | `about`, `is` | fine dots, dashes | never live | none: structure |
| sync | `step`, `step·cycle`, `step·loop`, a belt, the meter's net | dotted (`0.5 8`) | the tick's colour, one dot at the step's phase | the dot says where in a step, not the clock: a ×4 clock looks like a ÷4 one |
| cv · pointer | `braid` (refs, picks, `[<<]`, `^n`), `over`, `map` | solid; a bus as strands | the note under the source's playhead | a bus narrows in bends and kinks off its loom (below) |
| cv · value | `voice`, `pitch`, `level`, `lpf` `hpf` `lpq`, `write`/`play` of notes, `trigger` `velocity` `gate` | solid | one colour along the whole wire: the voice's note, or the level's brightness | the payload's shape never shows; `trigger=` is white (below) |
| audio | `mix`, `mix·gain`, `fm`, `excite`, `couple` | one ripple | the fundamental's hue | one ripple for every sound: amplitude 2.5 px and period 11 px, whatever it carries |

### Under-styled or mis-banded: what can be inferred

- **The sound through a selector is CV** ([#238](https://github.com/yggi/cell-studio/issues/238)): `&keysPart → &parts → &song → &out` in 10 pieces is drawn as plain lines. Inferable: a wire whose source sounds (a mix, a table of mixes, a selector reading one) is audio, decided once in `engine/graph.ts`.
- **`trigger=` (the gate, #264) is white.** It is a melody into a gate, but `carried()` takes the colour from the target's note (`INTO_VOICE`: `voice = target`), and a gate is not a voice. Inferable: `trigger=` is the `voice` port (pitch and gate), coloured by what its source plays. `velocity=` and `gate=` are levels and are drawn as levels already.
- **Edges colour by the target, not the source.** A melody's wire takes the voice's heard note, after the transform, so `&roots − 24` shows the note two octaves down along the whole wire, before and after its label. The rule the owner asks for, *the edge follows what its source pushes*, puts the source's value on the wire and the transform at the label.
- **Levels** (`level`, `lpf`, `hpf`, `lpq`, `velocity`, `gate`) show only the level now, as brightness.
- **A melody into its voice is a 2-wire bus** (gate and pitch: nets.md §3), drawn as one wire with a dot.
- **A belt has no label** (#137): `÷2 · belt` is never shown.

Genuinely open (not inferable): whether a **pointer** (a ref, `over=`) moves at all, since decision 3 calls it an indirection and the reader's wheel already shows its content; how fast things travel (D5).

### Where the rules live today

Six places: `edges.css` (stroke by band and by state, `transition` set twice: #137); `PulseEdge.svelte` (seven path builders, the colour in five branches, `GAP`, `STRANDS`, the pulse radii, the sheath); `MeterEdge.svelte` (its own flash and `color-mix`); `BeltEdge.svelte` (its own colour mix 45/55/25: #183); `flowedges.ts` (`carried()`: which voice colours an edge); `geometry.ts` (`strandPath`, `loomParts`, `ripplePath`, `radialPath`) with `STRAND_GAP` in `looms.ts`.

## 1 · The bus's geometry (no choice needed)

![today and new: a bent bus off its loom](edge-styles-bus.jpg)
![today and new: 12 strands, and a chord's bus on a hard bend](edge-styles-bus-2.jpg)

Two faults, both in how strands are offset:

- **Width.** `strandPath` and `loomParts`' run move a strand by moving the spline's control point along one fixed normal (the chord's, or the exit's). In a bend the normal turns, so the bundle narrows (a chord's bus on a hard bend, right). Where it meets the reader the curve no longer runs along the exit's direction, so the strands close up there too (*Chords*: `&minor → &chords`). Fix: one centreline per bus, sampled; each strand is its true offset (`offset()` in `proto.ts`). The width is then the same along the whole length.
- **The join.** A strand comes round its track and turns off it at a right angle onto the run (`L` after the arc), each at its own distance out, so the bundle leaves the loom in steps. Fix: every run starts at one distance out (the bundle leaves square), and each strand turns through a fillet tangent to its track and to its run. An inner track's fillet is longer and gentler, an outer one's tighter, so they nest like a harness bending round a corner.

Left for the build: the one strand that comes from the far side of the seam (the red one at 12 o'clock) still makes an S to reach its place; it wants a shorter fillet or its own side. The same centreline also serves the hop (a bus out of a reader's hub), a pick's strands and the tines.

## 2 · One mechanism: the wire is a delay line

While playing, what is *s* px along a wire is what its source pushed *s* / SPEED seconds ago, at **one visual speed for every edge** (mocked at 90 px/s). The head of the wire is now. This is not latency: nothing is heard later. Each band then draws the same idea its own way:

| band | what travels | drawn | stopped |
|---|---|---|---|
| audio | the sound | a wave: its shape the voice's, its height the level, its length the pitch (λ = SPEED-like, compressed: an octave up ×1/√2, 5 … 28 px) | a flat, faint wave |
| sync | ticks | a pulse train: a tick every SPEED / rate px, the bar's first in `--meter-0`, a beat `--meter-1` | dotted, as today |
| cv · pitch | notes | runs in each note's colour, a bead at each onset (the gate) | neutral |
| cv · level | a level | a ribbon, its width and brightness the level as it left | neutral |

So the edge's state is the source's (what it pushes, before the transform on the tap), one style per band, and the payload drives it. A net's taps share their owner's signal, so it is computed once per source per frame, not per edge. Meter nets stay as they are: they draw the same sync signal, flashing on the tick.

### The choices (owner)

**D1 · Sound.** A today · B a sine, its height the level, its length the pitch · C the sound's own shape (sine, triangle, saw, square), height and length the same. A fourth, D, is C travelling along the flow at the wire's speed (four frames on the mock-up sheet).
![sound on a wire: A, B, C](edge-styles-audio.jpg)
*Recommended: C, travelling (D).* A mix of several sounds is neutral, as now. It falls back to C still if the profile says moving waves cost too much.

**D2 · Clocks.** A today · B a pulse train with ticks a fixed 18 px apart, the rate shown as speed · C a pulse train at the wire's speed, ticks SPEED / rate apart, the rate shown as density.
![clock: A, B, C](edge-styles-sync.jpg)
*Recommended: C.* It moves at the same speed as the notes the clock steps, so a clock and its melody travel together, and `&bar/4` reads as four times as dense. The catch is that a slow clock shows one tick on a short wire; the dotted rest line stays under it.

**D3 · A melody into its voice.** A today: the voice's note on the whole wire, a dot at the step · B a delay line, notes as runs of colour with a bead at each onset · C two wires, the pitch as in B and a thin gate strand beside it.
![melody into voice: A, B, C](edge-styles-voice.jpg)
*Recommended: B.* One wire carries both halves: the colour is the pitch, the beads are the gate. C is the literal 2-wire bus, and it costs a second strand on the most common edge (69 examples).

**D4 · Levels.** A today: brightness now · B width and brightness now · C a ribbon along the wire.
![levels: A, B, C](edge-styles-level.jpg)
*Recommended: C.* An envelope or a duck shows its shape travelling. B is the cheap fallback.

**D5 · The speed.** One constant in px/s (mocked at 90), or relative to the tempo (a beat = n px, so pieces at different tempi look alike). *Recommended: a constant:* simpler, and a fast piece looks fast.

**D6 · Pointers** (refs, `over=`). Still lines, coloured by what they point at now (as today), or a delay line as in D3. *Recommended: still.* They are indirections (decision 3), and the reader's wheel shows what is read.

## 3 · Where it lives (one place for the rules)

- `src/layout/wire.ts` (pure, tested): the centreline (a spline, or a loom's exit then a curve), `offset`, the bus's strands, the loom's fillets, a wave along a curve, the places of pulses and runs. It replaces `strandPath`, `loomParts`' run and `ripplePath` at their call sites. Its test checks the width: adjacent strands keep their gap within ±0.3 px along the whole length, on bends.
- `src/layout/signal.ts` (pure): what a cell pushes at time *t*, by band: its note (the plan's events), its level, its ticks (rate, phase, level), its sound (pitch and shape). It is read back over the wire's length (*t* − *s* / SPEED). Loudness is the only input from audio (`LiveSource.waveform`'s RMS, passed in).
- `src/ui/edgeStyle.ts` with tokens in `theme.ts` / `app.css`: one table by band and state (widths, dashes, rest opacity, pulse sizes, the wave's range). `edges.css` reads its tokens; the magic numbers of #137 and #183 move here.
- `PulseEdge` becomes a dispatcher over per-band drawers that share the centreline (bus, wave, pulse train, runs, ribbon); `MeterEdge` and `BeltEdge` read the same sync signal; `carried()` names the source, not the target's voice.
- Cost: one signal per source per frame; pulse trains and runs by dash offsets on a fixed path where they can be (no path rebuilt); waves quantised (height and length in buckets), so a path is rebuilt only when its bucket changes. Measured with the `profile` skill before and after, on Bach 847 (#36) and Pop.

## 4 · Order (a PR each)

1. **The bus's geometry** (§1): `wire.ts` and its test, the loom's fillets, the chord bus, the hop, the reader's end. No choice needed. Verified with the `edges` and `zoom` sheets before and after, and the golden graph's crossings unchanged.
2. **Bands right**: audio from a sounding source (closes #238); `trigger=` as the `voice` port. Saved pieces aren't affected (drawing only).
3. **Rules in one place**: `edgeStyle.ts` and its tokens, the `PulseEdge` split, colour from the source; #137's duplicate transition and tokens, #183's magic numbers. The only visible change is colour from the source.
4. **The payload** (§2), as chosen in D1 to D6: `signal.ts` and the per-band drawers, profiled.
5. Leftovers: the belt's label (#137).
