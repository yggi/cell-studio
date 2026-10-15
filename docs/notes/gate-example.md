# The *A gate* example, one change at a time

Date: 2026-10-11 · Status: open (round 2 built: the wiring, junctions as gates, the spelling; the consolidation and the implicit `&out` open) · Issues: [#234](https://github.com/yggi/cell-studio/issues/234) (the minimal grammar, the implicit `&out`), [#10](https://github.com/yggi/cell-studio/issues/10) (the shakedown) · Follows [cells: notes/gate-node.md](https://github.com/yggi/cells/blob/main/docs/notes/gate-node.md)

The owner went through `examples/gate.cells` and asked for four changes to how it is drawn and four questions to be thought through against #10 and #234's minimal grammar (four primitives: shift-with-carry, dilate, look up, combine: [multiscale.md](https://github.com/yggi/cells/blob/main/docs/notes/multiscale.md)).

## Done (drawing only; no saved piece changes)

1. **A kit's voices are bulbs on the kit**, each just outside its own slice, where the number that picks it points (`layout/kit.ts`; [decision 021](../decisions/021-tape-heads.md) gains the row).
2. **A gate is a level meter** (`ui/GateMeter.svelte`, `layout/gate.ts`): a bar per note its trigger sounds now, side by side for a chord, in the note's colour, as tall as `velocity=`; `gate=` a dashed ceiling.
3. **A gate's wire out carries its voice's sound** (it was grey: the edge named the gate as its sound, and no voice is called that). A kit's gate stays neutral: a kit has no one pitch.
4. **`&lead` and `&bell` are not bulbs on `&leadOut`**: a gate plays its voices, they are not part of it (a kit's are). Their edges into the gate are sound now.
5. **The wires follow the notes, then the sound** (the owner, on the first round): the gate has one output, a note bus to its voices; their sound goes from their own wheels into `&out`, and the gate has no edge to `&out`.

The layout baseline was recorded with 1 and 4: crossings over the library 47.9 → 48.

## Do `gate=` and `velocity=` do different things?

**No.** The compiler reads `&leadOut trigger=&tune velocity=&accent gate=&duck gain=.4 &lead` as the product `[&tune * &accent * &duck * &lead * .4]` (`compiler/declare.ts: gates`). In the product, `&accent` and `&duck` are both volume streams, and `realize.ts` multiplies every volume stream together over the whole note: the order doesn't matter (`*` commutes, [decision 006](https://github.com/yggi/cells/blob/main/docs/decisions/006-mix-algebra.md)), and neither is sampled only at the onset. MIDI out sends that product at the onset as the velocity (`midi.ts: velocityOf`), so not even MIDI tells them apart. `gain=` is the same factor again, constant.

What the names say (per note, over time, fixed) is **how fast the factor moves**, and that is already in the cell: `&accent step=&bar/2`, `&duck step=&bar*4`, `.4` never. The tower ([multiscale.md](https://github.com/yggi/cells/blob/main/docs/notes/multiscale.md)) draws exactly that difference. So three ports name one operation three times; by #10's rule (one canonical form per family) two of them go.

**Recommendation:** one port for intensity, taking a product: `level=&accent*&duck*.4` (or the factors written in the braid, below). Keep the per-note meaning only where a receiver really has one: a MIDI receiver could send the factors that step with the trigger as note velocity and the slower ones as CC 7/11 (channel volume, expression). That is a rendering choice of the receiver, decided by rate, not a port.

## The body-less junction of `&bass`

`&out … [&roots * &bass * .5]` is a product with no name, so the graph draws it as a junction: a dot where `&roots` and `&bass` meet, between them and the card, with no wheel. A gate is exactly that product, named. Ways out:

- **(a) Draw every junction as a small gate meter** (no name, or `&(…)` as an unnamed cell is labelled). One construct, one drawing: the junction gets a body, the gate stops being a special node. Cheap: `JunctionNode.svelte` takes the meter. *Recommended*: it is the graph saying what the code already says (the gate is sugar for the product).
- **(b) Shorten suggests naming it** when it is the only unnamed product of a mix (a gate written out). Teaches the named form; doesn't help pieces that keep the short form.
- **(c) With an implicit `&out` (below) the product has nowhere to live** but a line of its own: `&bassOut …`. The junction goes away in that piece by itself.

## Is `trigger=` the right name? Is it another `over=`?

A gate gates **an index** (a note number, or which kit member) **with an optional intensity**. That is a MIDI note (key, velocity, length) and modular's gate + pitch CV + velocity CV.

**For a kit it is `over=`, exactly**: `&drumOut trigger=&beat &kit` plays what `&beat over=&kit` plays, and the compiler already treats a trigger read through its kit as the sound. **For a voice it is `over=` too**, if a voice is read as a table from note number to sound: `&tune over=&major` looks degrees up in a scale, `&tune` through `&lead` looks pitches up in a voice. So in #234's grammar both are **look up**. The difference is only where the edge is written:

| written on | names | example |
|---|---|---|
| the reader (`over=`) | its table | `&tune over=&major`, `&beat over=&kit` |
| the table (`trigger=`) | its reader | `&drumOut trigger=&beat &kit` |

One primitive, two spellings: #10 would keep one. And `trigger` names only the onset (the gate's rising edge), while it carries the index and the length as well.

**One real difference**: a gate's braid of several voices plays them **all** (`&lead &bell`: layered), while a cell of voices is a **kit**, which picks **one** (`&kit &bd &sd &hh`). The same braid, `&lead &bell`, means *both* on a gate and *one of them* in a kit. If the gate is look-up, its braid should read as a kit reads, and layering should be spelled as a chord, as everywhere else: `[&lead, &bell]`.

**A name:** `play=` reads as English (`&leadOut play=&tune &lead`: it plays the tune on the lead) and is already the language's word for reading a stream and sounding it (a tape's read head, `&near play=&tape`). Its sort would come from the cell it names (a tape: a head; a melody or a pattern: a gate), as a factor's sort does (decision 006). Collisions to check: a head with a braid of its own.

Sketch of the example under these, not a proposal to apply yet (not compiled):

```text
&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]
&drumOut play=&beat level=.5 &kit
&bassOut play=&roots level=.5 &bass
```

## The implicit `&out`

*Every output that is open (nothing reads it) is hot and goes to the sound card.*

- **Today a piece with no card is silent**: it compiles with no outputs and no error. Every example writes one. So "an implicit card **when none is written**" changes no saved piece that makes a sound, and fits decision 019's rule (a piece with a card sends only what its cards name; one without keeps the default). "Always, even beside a written card" would make a sound left unconnected in a piece with a card start sounding: that could change saved pieces (⚖ owner, as #234 says).
- **What counts as open**: a gate or a named mix nothing reads (`&leadOut`, `&drumOut`); a voice played by a melody directly, nothing reading it. Not a voice only a gate or a kit plays (the gate reads it), not a mix only a tape records. #234's probe found 16 cells read by nothing in the library, none a voice or a mix.
- **What needs a home**: the card's `level=` (every example carries one, from the loudness check: [display.md](https://github.com/yggi/cells/blob/main/docs/language/display.md)). Without a card it would go on the piece's card (`&piece … level=-6`), or the implicit card keeps 0 and the gates' `level=` carry it.
- **In this example**: `&out` and `about=&out` go, the bass product needs a name (`&bassOut`, above), and the graph has no `&out` wheel (the tower already draws the card at its top). The open outputs' wires would end at the graph's edge, or at the tower's card.

The cheapest way to try it is in the compiler, before bindings: no `map=sample` cell → add one, hidden from the graph, whose entries are the open outputs. Routing, gains, MIDI and the views then work unchanged.

## Questions for the owner

1. One intensity port (`level=`, a product), dropping `velocity=`/`gate=`/`gain=` on a gate (Shorten migrates)?
2. Junctions drawn as small gate meters (a)?
3. `trigger=` renamed (`play=`?), and a gate's braid read as a kit reads, layering as a chord?
4. The implicit `&out` only when no card is written, and where the master `level=` goes?

## Round 2: the owner's answers, and what was built

1. **One `level=`**: yes. 2. **Unnamed products as small gate meters**: yes. 3. **`play=`, the braid read as a kit, layering as a chord**: yes, try it. 4. **The implicit `&out`**: deferred, `&out` stays.

And: *our wires are wrong: audio comes out of the gate node and the voices have no output.* A gate's one output is a note bus to its voices, whose sound goes on into `&out`.

- **The wiring** ([decision 022](../decisions/022-gates-send-notes.md)): `&leadOut` → `&lead`, `&bell` (a note net, a strand per note at once), `&lead`, `&bell` → `&out` (sound); no edge from the gate to `&out`. A product's junction the same (its notes to its voice, `is`; the voice's sound into the mix, one wire per mix). Drawing only.
- **Junctions as small gate meters** (32 px, on the voice's rim). One meter component for both: bars as tall as the product of the level streams and the gain. Layout baseline 48 → 52.7 crossings (Cellscape, Zell better; Korobeiniki, Hypercell worse: a voice in several mixes fans out).
- **The spelling** ([decision 023](https://github.com/yggi/cells/blob/main/docs/decisions/023-gate-spelling.md)): `&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]`; the example is written so and plays the same notes (40 s compared). The old spelling still reads; Shorten rewrites it.

- **The meter's bus snaps as `&key`'s does**: a meter's net is laid by the same tree as every net (`netTree`: each cell joined to the nearest one already joined, the meter or another of its cells) and laid again every tick, so a dragged cell's trace jumps to the nearer cell. It was a separate Kruskal tree, worked out only at rest. Library crossings 52.7 → 49.2.
- **One place for sub-wheels**: `src/layout/subwheels.ts`, a table of rules (a tap on its table, a read head on its tape, a voice on its kit, a splice on its braid), each saying when a cell is inlined, the room round its host, where it sits and whether its edges leave from it. `graph.ts` asks it; no change in what is drawn.
- **One place for what draws a node**: `src/layout/wheels.ts` (`wheelOf`, `glyphOf`), read by `flownode.ts` (the node type) and `CellNode.svelte` (the glyph).

### What is still two things: the edges

The colour of an edge (`ui/edgeStyle.ts`), what travels along it (`ui/payload.ts`) and what it carries (`ui/flowedges.ts: carried`, one lookup by band and port) are each in one place already. What is not one: **a meter's trace is drawn by a component of its own** (`MeterEdge.svelte`: a wide line in the meter's colour that blinks on its steps, no pulse) while every other net segment is a `PulseEdge` (a bus's strands, a sync wire's tick train). With the meter's net now laid as a bus's, the next step would be to draw its traces as the sync band's net segments (`PulseEdge`, its ticks travelling), and retire `MeterEdge` and the ground special case (`groundsOf`): the meter's colour and its blink would then be the sync band's style. That changes how every piece looks, so it waits for the owner: keep the meter's own look (a backbone that blinks), or make it a sync bus like any other?

## Round 3

- `&duck` out of the example; a voice's envelope on its top, then (round 3) a box as wide as the voice, filled to the level now, the voice's sound leaving from its top, the waveform in its note's colour, the voice 160 px (PR #295).
- **`level=`, linear or dB**: the owner names it the prime case of the lin/log domain seam (#9, #234, #179), recorded in [decision 023](https://github.com/yggi/cells/blob/main/docs/decisions/023-gate-spelling.md). Not decided here.
- The work is a stack of PRs: #290 (drawing), #291 (decision 022), #292 (decision 023), #293 (nets and wheels in one place), #294 (the example, the envelope on top), #295 (the larger voice and its envelope box).
