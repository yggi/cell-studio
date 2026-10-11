# How a resonator's body could look

Date: 2026-10-11 · Status: open (options for the owner) · Issues: [#234](https://github.com/yggi/cell-studio/issues/234) (the visual pass) · Follows #302 (a kalimba's exciters as tines)

#302 drew `body=tine` as a kalimba: each exciter a tine where its pad was, reaching out to its strand. The owner asked for the same pass over the other bodies (`fork bell bar plate box pipe wire spring`, [physics.md](../language/physics.md#resonators)). Mock-ups: `node tools/gallery.mjs mockups` → `shots/wheel-mockups/2-resonator-bodies.png` (`tools/gallery/wheels/BodyMock.svelte`, SVG only: nothing in the app changes).

## What the library writes

| body | examples | exciters |
|---|---|---|
| fork | Two Tuning Forks, Sympathy, Five to 12 (6×) | one |
| wire | Resonanz, Harmonograph, Sympathy | one; Sympathy's strings `0 7 12 19` |
| pipe | Harmonograph (2×, driven by `excite=`) | one |
| tine | Kalimba, golden | 6–8 |
| bar, plate, spring | Resonanz (one each) | one |
| bell, box | none (`box` only as every `board=`) | — |

**Most resonators have one exciter**, and then today's wheel shows no pads at all: a fork, a plate, a girder and a spring are the same brass disc, told apart only by their mode rings.

## Options (columns of the mock-up)

- **A · now**: the brass disc and its mode rings; brass pads round it when it has more than one exciter.
- **B · the exciters take the body** (#302 for every body): each exciter is its body's element at its pad's turn, its free end out to its strand, sized by its pitch:
  - a bar: rosewood, with its two nodal cords at 0.224 of its length, 1/√f;
  - a pipe: an organ pipe, open end out, its mouth near the rim, 1/f (an octave is half);
  - a wire: a string from a peg to a bridge, thinner as it goes up;
  - a bell: a cup, smaller as it goes up (1/∛f);
  - a fork: two prongs on a stem;
  - a plate: a small square;
  - a box: a temple block;
  - a spring: a coil.

  Clear and cheap: it is `layout/tines.ts` with a shape per body. But it **changes nothing for a single exciter**, the usual case.
- **C · B + the body on its face**: the body engraved on the disc around the axle:
  - a fork's prongs either side of the axle;
  - a bell from above: lip, shoulder, crown, with its nodal meridians;
  - a bar with its nodal lines;
  - a square plate with a Chladni figure;
  - a box with its sound hole;
  - an organ pipe;
  - strings between two bridges;
  - a coil.

  This is what makes a fork read as a fork with no pads. It replaces the mode rings, which only an expert reads.
- **D · C + its material**: the disc in the body's material:
  - brass: fork, bell;
  - steel: tine, plate, spring;
  - wood: bar, box, a wire's soundboard;
  - organ metal: pipe.

  It reads at a glance across a graph, but it costs 9 × 3 tokens in `app.css` and moves away from one brass "resonator" family (the turntables' look: wood, chrome, brass, question 1 of the same mock-ups, #107).
- **D · ringing**: the moving part ghosted (a fork's prongs, a bar's mode shape, a pipe's standing wave, a string's loop) and the struck exciter glowing. The app has the ring already (`ctx.sound.resonance`: each mode's level); this only draws it on the body instead of on the rings.

## Recommendation

**C, with the ghosting from "ringing"; D only if the owner wants material to carry the kind.** C is the one option that changes the common case (one exciter), and with B it is one rule for all nine bodies: exciters on the rim take the body's element, and the body's own form is on the face. Keep the brass disc (one family), and let the engraving and the exciters say which body it is.

Gotchas found in the mock-ups:
- The axle (0.2 r) sits in the middle of every face, so each figure is drawn round it: the fork's prongs either side, the box's sound hole round it, the pipe and the bar wide enough to hold it.
- Radial strings (B, `wire`) read as a crosshair. A zither's parallel strings across the face read better, but they leave the angular positions where the loom's strands end. Keep them radial, or draw the strings on the face (C) and short pegs on the rim.
- A pipe's 1/f makes an octave half as long: with `0 7 12` the top pipe is short; a floor at 0.3 r keeps it tappable.

## Questions for the owner

1. Which column: B, C, or D?
2. Mode rings: replaced by the face (C), or kept under it?
3. `wire` with several exciters: radial strings (as tines), or strings across the face?
