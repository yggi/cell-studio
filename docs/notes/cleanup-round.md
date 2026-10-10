# Cleanup round (2026-10-10)

Date: 2026-10-10 · Status: open · Issues: the small cleanup issues listed below · Audited against `main` at 7b693a7

Every open leftover issue was checked item by item against the code. Nothing here is fixed on `main` except what is marked so. The issues carry the corrected checklists as a comment; this note is only the order of work. Delete it when the sessions are done.

## In flight (don't collide)

- **#241** selectors as taps: `engine/compiler/*`, `engine/{graph,routing,clocking,flows,program,duration,ladder}.ts`, `parser/cell.ts`, `shorten/*`, `examples/*.cells`, `snapshot.txt`, `docs/language/{time,tables,reference}.md`, `docs/limits.md`, `CHANGELOG.md`.
- **#236 #237 #239 #240** graph probes (outputs at 12, tower rows, gates): `src/layout/*`, `graphLayout.svelte.ts`, `PulseEdge.svelte`, `geometry.ts`, `ui/outputs.ts`, `tools/gallery`, `tools/probe`, `quality.baseline.json`.
- MIDI: no open PR (#233 merged).

## Sessions (all free of the files above)

Each is one PR, no sound change unless said.

1. **Audio and MIDI tidy** (#225 PR1, #222). S each.
   - `releaseAll`: trim `b.notes`, drop dead `b.last`, `stop(now + 0.06)` (audible: a click on Stop; verify with `cellStudio.measure`); `dropGates` trims `b.notes`.
   - `MidiAccess.close()` + disposed guard in `connect`; `panic` `return` → `continue`; an `idNow` same-name test; one docs line in `ui/midi.md` (scroll goes to `voices.play`, not the MIDI sink).
2. **Docs and small UI** (#225 PR2, #229, #215, #137, #183). All S.
   - FM wording in `ui/transport.md`; `anchor=` heads line in `limits.md`; `NodeState` comment in `ui/context.ts` (not the four `?? still`: `PulseEdge.svelte` collides).
   - Bulbs: bulb names in `CellGlyph`'s aria-label; decision 014 consequences (mute, solo, drag); `MAX_DEPTH` in `limits.md`; compress the 1.35 MB `014-splices-are-bulbs.png`.
   - `testTimeout` in `vite.config.ts` (#215, avoids `src/layout`); duplicate `transition` in `edges.css`; `palette()` NaN guard and `C4` out of `SpectrumWheel`.
3. **Plugins and probes of the UI** (#190, #209 from #180, #193, #194). S each.
   - `pluginTree.ts`: cap array lengths, text nodes and attribute values; snapshot `e.t` once. `plugins.ts`: `__proto__` token, CRLF in `pluginKey`; `Object.freeze(BUILTIN_PLUGINS)`.
   - #193: light the read head's `at=` tap in `routing.ts` + a routing test; a `map=&t` routing test.
   - #194: `JunctionNode` keyboard focus check; a `limits.md` line for more than ~10 products on one voice.
4. **Contrast pass** (#120, with #135). S-M, needs the `gallery` skill (`wheels --fast`): scope labels, beat numbers at 55 %, node labels at small sizes.
5. **Optional, M**: #230 carry a learned binding along on a title change (owner chose nothing yet).

Suggested for one sitting: 1 + 2 + 3 (about a morning). Session 4 after, if a visual pass is wanted.

## Wait for the in-flight PRs

- After **#241**: #195 diagnostics (11 silent cases and messages), #196 sameness checks (`notes` hash, one length), #209 shift and picks wording, #193 petal `~` suffix and erroring-program wire, `?? still` in four components.
- After the **graph probes**: #238 banded CV (graph.ts + `flowRanks`), #235 `spread` 0.5 → lower, #194 row-order on the folded model (then drop the timeout bumps), #223 held `free()` re-render, #153, the #229 drawing items, #137 geometry tokens.
- Own sitting: #228 held tapes (L, browser-verified), #232 `free()` tempo jump (L, after #241 touches `clocking.ts`).

## Owner decisions (2026-10-10)

- #186: a tutorial piece without `rung=` goes to the bottom (`Picker.svelte:209` to follow `library.ts`): session 2.
- #195: `free()` gets a runtime rate clamp.
- #209 → #195: a huge `shift=` warns. #209 is closed; its items moved to #195 and #190.
- #137: `tools/shots.mjs` is merged into the gallery (after the graph probes).
- #230: bindings are kept across a rename.

Session 1 is done (this branch).

## Closable now

- #183: its items live in #195, #179, #137, #153 (its own comment says so).
- #173: folded into #195 and #196 (close when they are done).
- #163: two items left, both in #195.
- #120: the library-card petals are done (owner, on a phone).
