# 022 · A gate sends notes; the sound leaves from the voice

**Date:** 2026-10-11 · **Status:** accepted (owner: the request on the *A gate* example, [the note](../notes/gate-example.md)) · Amends nets decision 2 ([nets.md](../notes/nets.md): "voices stop being hubs")

## Context

A gate (`&leadOut trigger=&tune … &lead &bell`, #234) was drawn with its voices' sound going into it and its own sound going on into the mix, and a product (`[&roots * &bass * .5]`) as a dot whose sound went into the mix while its voice hung off it as its definition (a dotted `is`). The owner, looking at the example: *our wires are wrong: audio comes out of the gate node and the voices have no output.* A gate decides which notes are played, how loud and when; the sound is made by the voice. And a product is a gate with no name.

## Decision

**A gate's one output is a note bus to the voices it plays; each voice's sound leaves from its own wheel into the mix.** The same for every product: its junction is an unnamed gate, drawn as a small gate meter on its voice's rim.

- The gate (and the junction) takes its notes and levels in; its output is a net of notes (a strand per note at once, the trigger's chords), to each voice it plays (`voice` from a gate, `is` from a junction).
- The voice's sound goes into each mix it is in, **one wire per mix**, however many of its products go there; the gain is on it when there is one product, else on the products' meters (their bars are as tall as their level times their gain).
- So a voice is a hub again: notes in from its gates, sound out to its mixes. A voice in several mixes is a net of sound.
- Drawing only: the audio graph, the routing and the flows are unchanged. A drawn wire stands for the written pairs (`routes`): the voice into the gate and the gate into the mix.

## Why

The wires say what flows: notes from where they are decided to what plays them, sound from what makes it to where it is heard. It is also one picture for the two spellings of the same thing (a gate, a product), the owner's "unnamed as small gate meters".

## Consequences

- The library's layout baseline: drawn crossings 48 → 52.7 (better in Cellscape 8.3 → 5.3, Zell, One more; worse in Korobeiniki 7.7 → 12 and Hypercell 3.3 → 7.7, where a voice in several mixes fans out to each).
- A junction is 32 px across (it was a 14 px dot); its room in the layout a radius of 16.
- Saved `.cells` pieces are not affected.
