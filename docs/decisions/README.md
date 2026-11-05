# Decisions

One file per decision: `NNN-slug.md`, numbered in order, never renumbered. A record has a date, a status (proposed, accepted, superseded by NNN), the context, the decision and the consequences. Add its line to the list below, `NNN · the decision, in a sentence · → decisions/NNN-slug.md`, and the same in a few words to [../MEMORY.md](../MEMORY.md)'s list (a test checks every record MEMORY.md links exists).

The decisions about the language (002, 003, 006–010, 012, 013, 015–020, 023, 026–033) moved to yggi/cells with their numbers: [its list](https://github.com/yggi/cells/blob/main/docs/decisions/README.md).

Write a record when a choice has a rationale a later reader would otherwise have to rediscover (a rejected alternative, a trade-off). Don't write one for things the code or the language docs already say.

## The list

One line each, the decision's substance; the record has the rationale.

- 001 · The wiki is dropped; `docs/` is the project memory · → [001-no-wiki.md](001-no-wiki.md)
- 004 · Agents open PRs and never merge; the `senior` skill triages, reviews and merges with the owner's approval · → [004-agents-dont-merge.md](004-agents-dont-merge.md)
- 005 · The audio context is `balanced` (not `playback`, not yet `interactive`), and the pictures show what is heard · → [005-balanced-latency-and-heard-pictures.md](005-balanced-latency-and-heard-pictures.md)
- 011 · The core stays lean: `show=` wheels beyond the language are plugins: the app ships a bundle of built-in ones (the sun first), and a piece can carry its own as a block; a piece's own runs only if the user chose it · → [011-plugins.md](011-plugins.md)
- 014 · A splice is a bulb on its braid's track (the ring and its bulbs one curve, the hand bending into them); a cell spliced into one braid only has no node of its own; one read elsewhere is a net-ref, drawn hollow · → [014-splices-are-bulbs.md](014-splices-are-bulbs.md)
- 021 · One rule for every sub-wheel: a cell that is only part of another is drawn on it as a bulb, placed by the host's own coordinate (a splice by its time, a section in its fan, a kit's voice as its piece of a drum kit, by its name, a tape's read head by `at=` of `length=`; a gate's voices are not part of it and keep their nodes); a section's and a head's edges leave from the bulb; a tape's head bulbs stay put while the reel turns and turn with the layout's turn of the tape · → [021-tape-heads.md](021-tape-heads.md)
- 022 · A gate sends notes, the sound leaves from the voice: a gate's (and a product's junction's, an unnamed gate drawn as a small meter) one output is a note bus to its voices; each voice's sound goes into each mix it is in, one wire per mix; drawing only · → [022-gates-send-notes.md](022-gates-send-notes.md)
- 024 · A resonator is drawn as its body: its disc of its material, the body engraved over its mode rings, each exciter its body's element at its turn out to its strand (a bus through the loom, a single strand straight to it) · → [024-resonator-bodies.md](024-resonator-bodies.md)
- 025 · A MIDI file opens as it is: its text in the code editor (`engine/miditext.ts` in `@yggi/cells`), playing through its notes written out behind the scenes; Convert to cells is an action (its graph: 034) · → [025-midi-documents.md](025-midi-documents.md)
- 034 · A MIDI file's graph is its machine (the cells it plays through), read only (*Convert to cells first*); Convert to cells folds first, then replays the fold's story, the code set a frame at a time, a cell coming in each (supersedes 025's waiting graph) · → [034-midi-machine.md](034-midi-machine.md)
- 035 · Labels sit on what they name: an edge's on its wire (along it, upright, level where steep, off the wheels), a net's name once on its trunk and each reader's change at its socket on its rim, a name too long for its bulb round its rim, a node's name a pill with what it is under it (round its rim when small and crowded), a belt's along its run · → [035-labels.md](035-labels.md)
- 036 · White where another value would mean nothing: a cell's 0 that is only *now* (a section's clock, a reel, a groove of one drum) is white (`--unit`), a 0 that is a pitch red, any other value coloured; measured by playing 7 for 0 · → [036-one-value-is-white.md](036-one-value-is-white.md)
- 037 · One frame of four slots that make room, never cover: the header (the transport, the views' switch *Library · Graph · Time*), the code at the left (a pane on a wide screen), the stage, the inspector at the right (a cell's sheet and the sidebar's pages, one pane), the keys below; a phone keeps its sheets · → [037-one-frame.md](037-one-frame.md)
- 038 · A `use` line's cells are a cluster named by its line, what nothing reads folded into the name; an edit writes its line into the piece · → [038-use-groups.md](038-use-groups.md)
- 039 · Cell studio sounds what a MIDI card sends (a voice on a card alone, at its entry's gain): superseded by cells decision 064, which says it in the language · → [039-midi-cards-heard.md](039-midi-cards-heard.md)
- 040 · The MIDI page is webmidi's patchbay (its setups, its components): a piece the setup has no routes for plays cells' defaults (or the old store's choices) until its first change writes them in; then its routes are exact; inputs are rows forwarded as they come; the keys' thru stays Cell studio's · → [040-patchbay.md](040-patchbay.md)
