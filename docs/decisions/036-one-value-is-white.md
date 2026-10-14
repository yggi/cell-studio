# 036 · One value is white: colours appear where things have to be told apart

**Date:** 2026-10-14 · **Status:** accepted (owner, on the tower's sky, #234) · Issue: #234

## Context

Every pitch drew as its pitch class's colour, so a drum pattern written on the voice's own pitch (`&off ~ 0 ~ 0`,
`&kick 0 ~ 0 ~`) was a red wheel (0 is C's colour) with red wires, as if C meant something there; a groove of one drum
(`&hh &hh &hh`, Pop's hats) took that drum's colour; a selector of one part was red too. And in the tower layout's sky
(docs/notes/tower-sky.md) each out needs a colour to tell it from the others in the strip's sum: a piece with one out
has nothing to tell apart.

## Decision

A colour says *this one, not that one*. Where there is only one, it is **white** (`--unit`, all colours; theme.ts
`UNIT`):

- **A cell that plays one value** (`layout/cellview.ts: unitary`): every step 0, the voice's own pitch, or one drum
  (a groove over its kit, or hits of one voice), rests aside, and nothing moves it (no stride, no table read through
  but a kit). Its wheel's steps and what it sends (its edges' colours, a gate's meter) are white. A cell of one other
  degree (`&V -3 ~ ~`, `&alto 12`) keeps its colour: it is a pitch, a phrase among others.
- **A part of one** (`partColour(k, 1)`, `tapTint(k, 1)`): a selector of one tap, a tag's wash from it.
- **The sky's outs** (the tower layout): a tint each, spread round the colour wheel as a selector's taps are; their
  section's where a selector makes sections; one out alone, white.

## Consequences

- Over the library 107 cells in 37 pieces turn white on their wheels and wires; most are drum patterns (Hypercell's
  `&off`, Pop's `&hats`, the tape pieces' `&kick`), reels on 0, and the selectors' section clocks (`&bassBar`), whose
  wheels draw beats, not pitches, so they look the same. The golden graph shows none: its unitary cells are drawn as
  a turntable (`&hats`, belted) or as clocks.
- The waltz's `&I 0 ~ ~` turns white beside `&V -3 ~ ~`, which stays coloured: the root is the voice's own pitch.
- Several drums in one groove (`&bd &sd`) still share their drums' colour (all C): telling them apart is a rule for
  the kit's pieces, not decided here.
- Drawing only: no piece sounds different.
