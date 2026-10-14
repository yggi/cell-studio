# Roadmap

The big jobs, at a high level. Detail lives in the issues — this page names the target and the epics, not tasks, so it changes rarely. What exists today but is rough is on [limits.md](limits.md).

## The target: one model, read by everything

The text compiles to one model — cells joined by **wires** (a port, a band, a transform, a width) on **nets**, in three bands (sync, CV, audio; [notes/nets.md](notes/nets.md)) — and the sound's wiring, the graph's drawing, the layout, the live states and the editor all read it. Done when:

1. **The graph is the code**: every `&name` token on a line is exactly one wire, and every wire one token; products are junctions.
2. **One description of where sound goes**, read by the audio wiring and the graph alike.
3. **One spelling per meaning**: a canonical form for each family of equal spellings, which Shorten writes; every port has a band, and its units follow from it.
4. **Nothing fails silently.**
5. **Sameness is checked by machine**: event snapshots in `npm test`, renders within −100 dB on the smoke run.
6. **The examples are written in the settled language**, sound the same, and a beginner's ladder teaches it.

The sequence of work towards it, phase by phase, is [#141](https://github.com/yggi/cell-studio/issues/141); the epics below are its views from the code, the language and the layout, plus the tracks beside it.

## Epics

| epic | what | issues |
|---|---|---|
| One model | the target above, in phases: ground truth, one snapshot and one flow, the model complete, the language settled, taught | #141 |
| Language | the shakedown: inventory, orthogonality, errors, laws, time, naming, a beginner path; then pitch spaces, selectors, sends | #10 (#29, #31, #143, #149, #150, #151, #152) |
| Auto-layout | code becomes a grouped, compact, readable graph with as few hints as possible, for any cellular architecture | #27 (#145, #147, #148) |
| Refactoring | the engine and audio are split; left: `Graph.svelte`, `physics.ts`, `CellSheet`, `Picker`, one description of where sound goes, stricter types | #9 (#132, #144, #145) |
| Verification | events and renders checked by machine; previews to try a PR on a phone | #142, #92 (#65), #45 |
| Phone and speed | latency, the screen-off crackle and the densest graph's frame rate, answered in one phone session; the graph's own cost | #154 (#91, #56, #36), #153 |
| Audio engine | parked: dropping Tone, worklets (FM feedback, coupled resonators), a shared WASM core; physical cells part 2 | #16, #17, #18, #28, #32 |
| Library and editor | the picker and its graph; everything the language can say, editable in the graph | #12, #33 |
| Multiscale | the piece as a tower of scales (MERA, wavelets, GTTM): rows by time constant, junctions that project, the form sending gates up, a minimal grammar, the implicit `&out` ([notes/multiscale.md](notes/multiscale.md)) | #234 (#235, #236) |
| Eternal jam | back together with Jambot: cells as its score language, the engine as its player, a shared repository of cell fragments with style vectors; the handshake, then a shared base, the seam, the repository ([notes/eternal-jam.md](notes/eternal-jam.md)) | #406, #234, #244, #203 |
| Wish list | pieces and features, as one checklist | #35 |
