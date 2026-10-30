# 039 · Cell studio sounds what a MIDI card sends: "sent, not heard" dropped

**Date:** 2026-10-27 · **Status:** superseded by [cells decision 064](https://github.com/yggi/cells/blob/main/docs/decisions/064-what-sounds.md), which makes it the language's (`heardHere` removed, #523); accepted before that (owner, on #503: "019 is a mistake. cell-studio should play") · Cells: [decision 019](https://github.com/yggi/cells/blob/main/docs/decisions/019-midi-card.md), which this app no longer follows on that point; the language's side is [yggi/cells#333](https://github.com/yggi/cells/issues/333), beside its renderer, [yggi/cells#315](https://github.com/yggi/cells/issues/315)

## Context

Cells decision 019 says a voice only on a MIDI card (`map=midi`) is sent, not heard: cells gives its notes `unheard`, their gains 0, and Cell studio's voices skipped them.
Every Jambot section text puts all its notes on one MIDI card (`&out map=midi …`) and states no sound card, so a followed session was silent in Cell studio and reached MIDI out only (#502). #492's click check, tapping Cell studio's output, found nothing to measure: every switch was silent.

## Decision

- **A note on a MIDI card and on no sound card is heard in Cell studio too**, and still sent on its card.
- **Its level is its entry's gain on the card** (`MidiDest.gain`: the numbers in its product there, which its velocity reads as a sound card's gains are read), in the middle; on several cards, the loudest.
- **A note silent for another reason stays silent**: its sound card switched off, or its card's entry.
- This is Cell studio's playing, `heardHere` in `audio/voices.ts`; cells' meaning is untouched (`unheard` still marks such a note, MIDI out still sends only what the cards name). A cells decision to the same effect (yggi/cells#333: `realize` giving such a note its gains) makes this a no-op, removed when the pin moves.

## Consequences

- A followed Jambot session is heard on Cell studio's voices.
- A piece whose voice is on a MIDI card only now sounds it here too (the example `midi-out`'s `&sub`; the smoke test checks it is heard and sent).
- The graph's routing (what it lights as heard, `routing.ts` in cells) still treats such a voice as not heard; that follows cells.
