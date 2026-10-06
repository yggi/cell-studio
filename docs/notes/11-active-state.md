# #11 Active and inactive cells and edges

2026-10-06 · status: implemented on `claude/bug-11-investigation-toqp49` (below: what was found, then what was done) · [#11](https://github.com/yggi/cell-studio/issues/11), the `routedNodes` item of [#9](https://github.com/yggi/cell-studio/issues/9)

The owner's screenshots are Baustelle (cells that sound are drawn idle; the selector's edges to parts that aren't picked look the same as the edge to the part that is; `&beamv → &einsturz` takes a note's colour while `&einsturz` isn't picked) and Sound on Tape (`&dry` is drawn idle while it plays into the speakers and onto the tape). Everything below was reproduced with the pure functions in node (a throwaway vitest probe over every example, sampled every 50 ms of its main length). Nothing was checked in a browser.

## What decides what's drawn

| What | Computed by | When | From |
|---|---|---|---|
| node `off` | `program.off` | per program | the `off` flags in the code |
| node `unrouted` (opacity .28) | `routedNodes(program, muted)`, realize.ts | per program | a walk from each output, written by hand |
| node `on` / `idle` (opacity .72, desaturated) / `live` | `nodeState`, ui/context.ts | per frame | `liveAt(…).cells`; tapes, heads, resonators, scopes are always `live` while playing |
| edge `edge-cut` (opacity .2) | `toFlowEdge`, Graph.svelte | per program | both ends in `routedNodes` and not off |
| edge `edge-live` (accent, wider) | `toFlowEdge` | per frame | `liveAt(…).edges`, a second walk written by hand, with its own edge ids |
| edge colour | `PulseEdge.svelte` | per frame | `Player.note(voice)`: the voice's last started note. Gated only by off, not by live |
| pulse dot on an edge | `PulseEdge.svelte` | per frame | `live.phases` of a cell: its clock's phase, note or rest |
| playheads and lit entries inside a cell | `CellGlyph` and others | per frame | `liveAt(…).cells` (`local`, `entries`) |
| spectrum wheels (voice, mix, sound card) | `voices.spectrum`, audio | per frame | analysers: real sound |
| tape reels | `Player.tapePos` | per frame | `tapeMotion`, worked out from the clocks, not read from the audio |

So the graph has four descriptions of the same signal flow, and they disagree:

1. `compile` → `Output[]` → `plan` → audio. This is what's heard. An output carries `via`, an unordered bag of the mixes, the sound card, the selector, its table and the part. It doesn't record the path through them.
2. `buildGraph` → the edges as written. Petals (`&( … )`, `show=petal`) get their edges re-routed to their parent under a new id.
3. `routedNodes`: nodes only, and its own test of what sounds (`cell.hasValues`), which differs from the plan's test (`flatten` events).
4. `liveAt`: nodes and edges, with edge ids it builds itself.

Graph.svelte combines 2, 3 and 4 edge by edge. Nothing checks that they agree.

## What's wrong

1. **Active cells drawn dimmed (`unrouted`).** `routedNodes` doesn't follow a voice's moving parameters (`lpf=… * &edge`, `pitch=&(…)`), so oscillators that move a filter sound but are dimmed. That's 13 examples, e.g. `&edge` and `&vowel` (Baustelle), `&sweep`, `&filt`, `&up`, `&knob` and `&res` (acid), `&tideA` and `&tideB`. A cell whose steps are all chance choices (`[a|b]?`) has `hasValues` false, so its whole output counts as silent: `&glints`/`&glint` (Cellscape II) and `&glitch`/`&blip` (Ghost-Cells) play but are dimmed, and their live edges are drawn cut.
2. **Most routing edges never light.** `liveAt` builds mix edges from the `via` bag: from the voice to every mix in it (only one of those edges exists in the graph), and from the sound card to the mix (the graph's edge goes from the mix to the sound card). Instruments (`through`, e.g. `&dry`) aren't marked live at all. The selector's chain (`&out → &tag → &teile → &part`), tape `write`/`play`, envelopes and parameter cells never light. Over all examples, 201 edges that are routed never light (72 ref, 43 step, 34 mix, 30 over, 22 out). `liveAt` also produces 346 edge ids that aren't in the graph: inherited tables, petals, and the reversed mix edges.
3. **Inactive edges look active.** Since (2) leaves almost every routing edge in its static `routed` style, the edge to a picked part and the edge to an idle part look the same. The colour comes from the voice's note and isn't gated by live. `Player.note` never goes back to null (it returns the last started note, with no end), so an edge stays coloured through rests, and every edge out of a shared voice takes its colour: `&beamv → &einsturz` while only `&metalPart` is picked.
4. **`live` means "its output is active", not "sounding".** Rests, missed chances and level 0 are all drawn live. Share of samples where a voice is drawn live while none of its notes sounds: bwv847 57%, Baustelle 46%, idm 31%. `liveAt` doesn't throw the chance dice; the scheduler does (`thrown`).
5. **Mix wheels show each voice's whole sound, not the sound along the path.** A mix's tap (`voices.ts`, the `mixes` rewire) sums its member voices' whole output; the mix nodes are analysis taps only, and the sound goes from voice to master with each note's gain. A voice in two mixes shows in both: `&einsturz`'s wheel moves while only `&metalPart` is picked (`&beamv`, `&platev`, `&sub` are shared). This is audio, not graph state (follow-up, near #14).
6. **Forced live.** Tapes, heads, resonators and scopes are drawn `live` whenever anything plays, whether or not they're routed or reached.

**Running without being drawn:** `show=off` cells and the implicit default grid run but aren't drawn. Petals are drawn but their edge ids are remapped, so their live edges never match.

**Running independently of the audio:** yes. Every node and edge state is worked out again on the main thread, from the compile result at `transportClock.seconds` (`Tone.immediate()` held back by the output latency since #67, `audio/heard.ts`). Nothing reads what the engine scheduled (`Window`/`Played`), so chance and laps don't come from the scheduler, and in worker mode the views never see the worker's windows. Only the spectra, waveforms, resonance, tape levels and `note()` come from the audio.

## Design (implemented)

- **Routes, recorded where they're made.** `compile`'s `expand` already walks the mix tree from each sound card down to each voice. It should record the path as edges of the written graph, instead of the `via` bag: voice → instruments (`through`) → mix → part → selector, via the table of parts → sound card. Each output's route then adds:
  - its trigger's braid (ref and over edges, the table chains)
  - its step and clock chains
  - mods, levels, the envelope and the voice's parameter cells, each with its own chains
  - kit members, tape write/play and returns
  - fm, excite and couple

  `via` is derived from the route for `liveGains`.
- **`engine/routing.ts`** (pure) replaces `routedNodes` and the node and edge parts of `liveAt`:
  - `routing(result, muted)`: the union of the routes of the outputs where `outputSounds` holds (the same test `plan` uses).
  - `liveRouting(result, statics, muted, t)`: the union of the routes of the outputs active at `t` (`endOf`, `picksNow`, the same gates the scheduler uses). Within the trigger's braid, only the descent to the current step (`liveAt`'s descent, kept, and checked against the route). Live is then a subset of routed by construction.
- **One state function.** `graphState(model, routing, live)` returns `off | unrouted | on | idle | live` for every drawn node and edge. It maps written edge ids through the petal aliases (which `buildGraph` returns). It's pure and tested; `nodeState` and `toFlowEdge` only read it. An edge takes its note colour only while it's live.
- **Invariants, tested over every example and sampled times** (these replace the hand-picked cases):
  - every routed or live edge id is a graph edge
  - live ⊆ routed
  - every voice with an event at `t` (`eventsBetween`) is routed
  - every cell that moves something that sounds is routed
  - every node and edge switched off is neither routed nor live

  Plus #11's minimal cases: a modulation-only cell, a `step=` chain, a table read only by a selector, a kit, a tape head, an off ancestor, a cell with `off`.

## What was done

- `engine/routing.ts`: routes. One deviation from the plan above: compile is unchanged. An output's sound path is the set of graph flow edges between the names in its `via` and `through` (plus its source), which is exact because those names form one chain. Tapes and bodies are worked out by flow from what reaches them, and everything is cut to what reaches a sound card. `drawn()` maps ids through petals (`buildGraph` now returns `alias`).
- `engine/live.ts`: `liveAt`, moved out of `realize.ts`. It keeps the playheads and lit entries, and its node and edge sets come from `liveRouting`, so live is within routed. Tables that turn light their `step=` chain. A table is credited to the cell that lends it.
- The UI: `nodeState` and `toFlowEdge` read `nodeStateOf` and `edgeStateOf`. Edges are `edge-live`, `edge-idle`, `edge-on`, `edge-unrouted` or `edge-off`. Only a live edge takes a note's colour and pulses. Turntables and scopes carry `data-state`. The forced-live case for tapes, heads, bodies and scopes is gone (they're live when routed and playing).
- A changed meaning: a cell that only turns a table that sounding notes read (Royal's `&theme` with `&lead` off) stays routed. Its notes don't sound, but its laps still turn the key.
- Verified with `routing.test.ts` (the #11 cases, and invariants over every example) and in the browser with `tools/shots.mjs` before and after (Sound on Tape, Baustelle, Baustelle II), comparing the DOM states.
- Filed: #76 (`off` doesn't reach the offline render or export, nor the tapes and bodies in playback; the render part checked in the browser), #77 (mix wheels hear voices whole).

Open questions for the owner:

- Should **live** stay "its part plays now" (steady, implemented), or become "a note sounds now", taken from the plan's events with the chance thrown (exact, but blinks with every drum hit)?
