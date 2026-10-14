# 036 · White where another value would mean nothing: a 0 that is only *now*

**Date:** 2026-10-14 · **Status:** accepted (owner, on the tower's sky, #234) · Issue: #234

## Context

Every pitch drew as its pitch class's colour, so 0 was always red (C), even where it means no pitch at all: a
section's clock (`&bassBar 0`, a tap a selector steps on), a tape's reel (`&reel step=84bpm … 0`), a groove of one
drum (Korobeiniki's `&hats`). The owner's rule: colours appear where things have to be told apart; any value but 0 is
always a value, coloured, so the question is only red or white for 0 — white *if another value would not mean
anything different for this wheel* (it is binary, a tick).

## Decision

**A cell's 0 is white (`--unit`) when another value would change nothing** (`blank` in `layout/cellview.ts`): every
step 0, rests aside; the cell has a clock of its own (it isn't spliced into a melody); everything that leaves it is
a clock's tick (a section's clock, a reel's motor), a tap into its selector's table, or, for a groove over a kit of
one drum, its own sound; and it reads no other table. Its wheel's steps and what it sends are white. Otherwise its
0 is a pitch or a choice and red, as before: played on a voice (a kick on a sine, Hypercell's offbeat bass `&off`),
spliced (the waltz's `&I`), read through a scale, picking from a kit of several drums.

Also white, by the same reasoning: a selector's part when it has only one (`partColour(k, 1)`), and what has no note
to show (a drum kit's socket, noise).

The rule was found by measuring, not guessing: `tools/probe/colours.test.ts` plays each of the library's 102 cells
whose steps are all 0 with 7 in their place, over each piece's hearing (ten minutes at most), and compares every note.
67 change nothing, 35 change notes; `blank` agrees on all 102.

## Consequences

- What turns white on screen: one-drum grooves (Korobeiniki's `&hats`, Jazz's and Coltrane's `&ride`, the arrangement's
  `&kick`) and reels; the 57 section clocks are white too, though their wheels draw beats, not pitches. Hypercell,
  Pop and the golden graph show no change.
- A drum pattern on a pitched voice stays red: its 0 is the drum's tuning, another value retunes it.
- A rule a colour follows is in the colour table, [ui/theme.md](../ui/theme.md#colour-rules).
- Drawing only: no piece sounds different.
