# 016 · Arranging at the input: a section is a switched tap of the meter's bus

**Date:** 2026-10-10 · **Status:** accepted as the direction (owner, #234, #29); the spelling is open

## Context

A selector today reads a table of parts (mixes) and their sound goes through it to the sound card (`&song over=&parts`, `&out … &song`). A part not picked keeps running, stepped but not heard; a piece whose sections differ in length can't use a selector, and writes its form into every voice instead (BWV 847's `&tacetFugue ~@511`). Measured, a selector is the slowest clocked cell of its piece and yet sits after every voice it picks: drawn by time, its sound runs down into it ([../notes/tower-rows.md](../notes/tower-rows.md)). Rewired at the input, with the selector switching which clock each part is stepped by, *Pop* draws with 0.7 crossings where every way of gating its output cost 5 to 35 ([../notes/selector-gates.md](../notes/selector-gates.md)).

## Decision

1. **A section is a tap of the meter's bus, switched on and off by the selector.** What a tap steps plays; what it doesn't stands still. The parts' sound goes straight out, through no selector.
2. **A clock is a pattern with every onset firing; a pattern is a mask for a clock.** So a tap switched by a selector is a clock masked by the selector's pattern, and a trigger may be a clock or a pattern alike.
3. **Switched on, a section restarts** from its top (a reset on the switch's rising edge: #29's `restart=`); switched off, it stands still.
4. **A section owns only what is stepped or looped from its tap.** A vibrato on `loop=6`, a drone on its own clock, a tape's motor go on.
5. **Two mechanisms, for now:** the switch on the meter's bus (time: whether a section moves) and the gate node (output: whether what it plays passes). They may converge ([../notes/gate-node.md](../notes/gate-node.md)).

## Why

The selector is the slowest thing in a piece, and its job is the form: it belongs at the bottom of the tower, sending time up, not at the top taking sound in. Switching time, not sound, removes the running-but-unheard sections and their couplings (the tacets) and lets sections differ in length. The two mechanisms are kept apart because they answer different questions (does it move, does it sound) and combine: a part may count on in silence, or hold a sound with its time stopped.

## Consequences

- Nothing changes yet: no spelling is decided, and the engine selects mixes as before. The layout and drawing probes behind `?taps=on` show the shape ([../notes/selector-gates.md](../notes/selector-gates.md), round 4).
- When it is built, every example arranged by a selector (10) and BWV 847 are rewritten, and must sound the same (`tools/corpus.mjs --check`); a saved piece with a selector would change: a CHANGELOG line and a migration (Shorten could write it).
- #29's "a part picked starts from its top" becomes the reset of item 3.
