# The layout's forces: what each does (held)

**Date:** 2026-10-10 · **Status:** held by the owner (the gate wheel and the frequency tower come first) · **Issue:** #234

## The question

The owner asked to reduce and simplify the forces so the crossings stay low, and to remove cruft. The cruft is out (PR on
`claude/simpler-forces`): the switched-off options (`grow*`, `inertia`, `strengthPull`, `netClear`, `insert` and
`insertion.ts`, `endPull`) and the layout before layers (`FORCES_ALONE`, `layered: false`, `orderLayers`). The forces
that are on were measured, not yet reduced.

## Method

`tools/probe/forces.test.ts`: the whole library laid out under each variant, today's options with one force switched
off at a time, the library's sums (`quality.ts`) as the mean over seeds. `CUSTOM="name:key=v,…"` measures several
changes at once.

## What it found

Two seeds (0, 1):

| variant | crossings | cost | intruders | clusters | area (Mpx²) |
|---|---|---|---|---|---|
| today | 52.0 | 114.4 | 87.0 | 34.5 | 84.8 |
| the start alone (no physics) | 63.5 | 161.5 | 64.0 | 37.5 | 100.2 (overlap 1978) |
| no `straighten` | 101.5 | 190.4 | 85.0 | 34.5 | 84.9 |
| no `uncross` | 70.5 | 144.1 | 75.0 | 36.5 | 84.7 |
| no `spread` | 70.5 | 151.5 | 78.0 | 34.5 | 84.6 |
| no `placeLast` | 64.5 | 142.8 | 82.0 | 33.5 | 85.4 |
| no `columnPull` | 63.0 | 131.8 | 72.5 | 34.0 | 87.1 |
| no `centre` | 60.5 | 138.5 | 74.5 | 34.0 | 84.7 |
| no `kindRepel` | 60.5 | 126.3 | 87.5 | 34.0 | 84.8 |
| no `contract` | 60.0 | 132.9 | 66.0 | 32.0 | 97.4 |
| no `massRepel` | 60.0 | 122.8 | 81.5 | 35.0 | 85.1 |
| no `rankPull` | 59.5 | 128.2 | 71.0 | 30.0 | 91.2 |
| no `netPull` | 59.0 | 129.4 | 84.5 | 41.5 | 84.6 |
| no `tagRepel` | 58.5 | 125.5 | 87.0 | 35.5 | 85.0 |
| no `degreeRepel` | 57.5 | 131.5 | 85.5 | 35.5 | 84.6 |
| no `tagPull` | 57.0 | 120.2 | **138.5** | 46.5 | 85.6 |
| no `avoid` | 57.0 | 118.9 | 85.0 | 34.5 | 84.7 |
| no `mux` | 56.0 | 122.8 | 96.0 | 36.5 | 84.4 |

Four other seeds (2–5), stopped after three rows:

| variant | crossings | cost | intruders |
|---|---|---|---|
| today | 59.8 | 125.1 | 73.3 |
| no `avoid` | 56.0 | 122.4 | 73.5 |
| no `contract` | 56.8 | 127.8 | 73.5 |

## What it means

- **The noise is about ±8 crossings over the library.** Today is 52.0 on seeds 0–1 and 59.8 on seeds 2–5. The layout is
  chaotic: removing springs that pulled with zero strength moved it about as much. A single-seed change of less than
  ~8 is not a finding, and today's 52 on the gate's seeds may be partly the tuning fitting those seeds.
- **Clearly needed:** `straighten` (about twice the crossings without it), `uncross`, `spread`, `placeLast`,
  `columnPull`; and `tagPull` for the clusters (intruders 87 → 139 without it).
- **Within the noise, candidates to remove:** `avoid` and `contract` (no worse on seeds 2–5), then `mux`,
  `degreeRepel`, `tagRepel`, `netPull`, `rankPull`, `massRepel`, `centre`, `kindRepel`.
- **Worth trying:** `spread` halved, which took crossings 25.3 → 21.3 in the outputs-top probe ([#235](https://github.com/yggi/cell-studio/issues/235)).

## Next (when resumed)

1. Measure the candidates on six seeds (the gate's three and three more), each against today on the same seeds.
2. Remove those whose cost is within the noise, one at a time, and measure the smaller set together, with `spread`
   halved as a variant (`CUSTOM=`).
3. Record the baseline once the set holds over six seeds; widen the gate to more seeds if one start's luck keeps
   deciding it.

## Crossings by kind (2026-10-10)

The owner's ask: different crossings count differently (a label's link less, two of one kind more), in the measure
and in the force. `weights.ts: crossingCost`: the two edges' strengths (`strengthOf`) times 2 when both are of one
band (two sound wires, two braids or other values, two of a meter's traces); a label's link weighs 0.3. The quality
count (`cost`) and `forceUncross` read it, so the layout pushes hardest where a crossing costs most.

Eight seeds (`tools/probe/forces.test.ts`, `SEEDS=0..7`), library sums, means; cost by the new rule throughout:

| variant | crossings | cost | area |
|---|---|---|---|
| before (every pair pushed alike, `uncross` 0.6) | 58.2 | 183.1 | 89.2 |
| pushed by cost, `uncross` 0.6 | 52.5 | 176.8 | 90.4 |
| pushed by cost, `uncross` 1 | 52.3 | 160.8 | 92.3 |
| pushed by cost, `uncross` 1.2 | 48.7 | 159.4 | 93.4 |
| **pushed by cost, each end by its mass, `uncross` 1** | **55.3** | **179.1** | 90.4 |
| the same, `uncross` 0.8 / 1.2 | 55.5 / 58.1 | 180.5 / 186.9 | 90.1 / 90.8 |

- Pushed by cost alone, the layout wins most, but it turns tapes away from their heads: the library's aim 45 → 62, and
  Test Tones' tape test fails (a head 46° off what it connects to). A push that moves each end as little as it weighs
  keeps the tapes (aim 45 → 51, the tests pass) for a smaller gain: 58 → 55 crossings, cost 183 → 179. Sparing only the
  turntables doesn't keep them: what a head connects to is an ordinary voice.
- **Chosen by the owner: by cost, each end by its mass, `uncross` 1.** The baseline (seeds 0–2) goes 53.3 → 51.0
  crossings, aim 44.6 → 51.4, area +2.8 %; its cost is on the new rule (117 → 163 is the rule, not the layout).

A note for later probes: #275 (a tape's read heads as bulbs) changed what the tape-aim metric measures (the baseline's sum went 44.6 → 260.7 with no layout change worth the name), so aim figures from before and after it are not comparable. And `crossingCost` (weights.ts) is the one table the measure and the push read: change a weight there, not in both places.
