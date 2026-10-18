# Roadmap

The big jobs, at a high level. Detail lives in the issues — this page names the target and the epics, not tasks, so it changes rarely. What exists today but is rough is on [limits.md](limits.md).

## The target: one model, read by everything

The text compiles to one model — cells joined by **wires** (a port, a band, a transform, a width) on **nets**, in three bands (sync, CV, audio; [notes/nets.md](https://github.com/yggi/cells/blob/main/docs/notes/nets.md)) — and the sound's wiring, the graph's drawing, the layout, the live states and the editor all read it. Done when:

1. **The graph is the code**: every `&name` token on a line is exactly one wire, and every wire one token; products are junctions.
2. **One description of where sound goes**, read by the audio wiring and the graph alike.
3. **One spelling per meaning**: a canonical form for each family of equal spellings, which Shorten writes; every port has a band, and its units follow from it.
4. **Nothing fails silently.**
5. **Sameness is checked by machine**: event snapshots in `npm test`, renders within −100 dB on the smoke run.
6. **The examples are written in the settled language**, sound the same, and a beginner's ladder teaches it.

Points 1–2 are this app's, and they hold: the bijection test covers every example with no exception (#189), and the off rule every cell, a kit's members too (#202). Points 3–6 are the language's: the language's roadmap, [yggi/cells#26](https://github.com/yggi/cells/issues/26). The path from here, the eternal jam (the seam, the repository of fragments, the composer selecting from it), is the central roadmap, [yggi/cells#81](https://github.com/yggi/cells/issues/81); the epics below are this app's tracks beside it.

## Epics

| epic | what | issues |
|---|---|---|
| One model | the target above: points 1–2 hold; the language settled and taught (points 3–6) is yggi/cells' | the language's roadmap: [yggi/cells#26](https://github.com/yggi/cells/issues/26) |
| Language | what the language means and how it's spelled lives in yggi/cells, led by the central roadmap; what the app draws or offers of a language change is an issue here | [yggi/cells#81](https://github.com/yggi/cells/issues/81) (central), [yggi/cells#26](https://github.com/yggi/cells/issues/26); the app's halves: #29, #232 ([yggi/cells#56](https://github.com/yggi/cells/issues/56)), #431 ([yggi/cells#36](https://github.com/yggi/cells/issues/36)), #432 ([yggi/cells#28](https://github.com/yggi/cells/issues/28)) |
| Auto-layout | code becomes a grouped, compact, readable graph with as few hints as possible, for any cellular architecture | #27 (#235, #373, #309, #299, #298) |
| Multiscale | the piece as a tower of scales (MERA, wavelets, GTTM), drawn: strata by time constant, the strip, junctions that project; its language half is yggi/cells' ([notes/multiscale.md](https://github.com/yggi/cells/blob/main/docs/notes/multiscale.md)) | #234 (#440, #416, #445, #448, #374, #375, #376, #377); the language: [yggi/cells#51](https://github.com/yggi/cells/issues/51) |
| Eternal jam | back together with Jambot: Cell studio plays from a cells tag and takes MIDI from yggi/webmidi; left, a jam's client loading the code a session sends, and the repository of fragments shown ([notes/eternal-jam.md](notes/eternal-jam.md)) | #406, #449; the path: [yggi/cells#81](https://github.com/yggi/cells/issues/81), the repository [yggi/cells#49](https://github.com/yggi/cells/issues/49) |
| Refactoring | the engine went to yggi/cells; left here: the graph's props, the nodes' pure logic into `layout/`, stricter types | #318, #319, #320 |
| Phone and speed | what the page costs per piece, layout and device: the numbers, then the plan they order; the audio's robustness on a phone beside it | #422 (#423, #424); #56, #185 |
| Audio engine | parked: dropping Tone, an `AudioWorklet` (a tape's own buffer, coupled resonators, FM operator loops); FM in the voice (decision 030's app half); sound in the language (FM, physics part 2) is yggi/cells' | #16, #17 (parked), #28; the language: [yggi/cells#52](https://github.com/yggi/cells/issues/52) |
| Audio into cells | the app's half of the disassembler: renders as ground truth, a loader for recordings, the rendered judge | #399, #400; the epic: [yggi/cells#35](https://github.com/yggi/cells/issues/35) |
| Library and editor | the picker and its graph, a MIDI corpus searched from the app; everything the language can say, editable in the graph, and undone | #12, #333, #33, #248 |

The other open issues stand alone (bugs, leftovers, small features): the tracker, by label.
