# Roadmap

The big jobs, at a high level. Detail lives in the issues — this page names epics, not tasks, so it changes rarely. What exists today but is rough is on [limits.md](limits.md).

| epic | what | issues |
|---|---|---|
| Language | a systematic pass before more features: inventory, orthogonality, errors, laws, time, naming, a tutorial; then FM, selectors, pitch drop | #10 (#28, #29, #30, #31, #34) |
| Auto-layout | code becomes a grouped, compact, readable graph with as few hints as possible, for any cellular architecture | #27 |
| Audio engine | the engine seam and an opt-in worker are in (it doesn't lighten the main thread by itself: next, the live state off the main thread); dropping Tone, worklets (FM feedback, coupled resonators), a shared WASM core; physical cells part 2 | #14 (#15, #16, #17, #18, #32, #37, #65) |
| Examples | the catalogue generated from the files (lazy loading and the build-time index are done) | #8 (#55) |
| Library | the picker and its graph | #12 |
| Editor | everything the language can say, editable in the graph | #33 |
| Wish list | pieces and features, as one checklist | #35 |
| Visual bugs | active/inactive detection of cells and edges | #11 |
| Performance | live views' cost on large graphs; the first slice (#13) is done | #36 |
| Refactoring | `voices.ts` is split and the graph gets the sound as one object; left: `Player` (transport, held tapes, UI clock), large engine files, `App.svelte`, lint | #9 |
| Deployment | PWA, PR workflow | #7 |
| Agents | the agentic workflow: AGENTS.md, the `senior` skill, CI | #6 |
