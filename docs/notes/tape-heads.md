# A tape's read heads as bulbs on it

Date: 2026-10-10 · Status: done (decision [021](../decisions/021-tape-heads.md)) · Issue: none (the owner's request in a session)

**Question.** Can a tape's read heads sit on the tape's wheel as sub-wheels, as a braid's splices (014), a table's taps (016) and a gate's voices (#234) sit on theirs, under one rule? And does that survive the tape turning: the reel running under its heads, and the layout turning the whole wheel to face them?

**Method.** Two probes over the library's six tape pieces, three seeds each: `tools/probe/tape-heads.test.ts` (each head: what it takes besides its tape, what reads it; every cell a node against the graph as drawn) and `tools/probe/tape-aims.test.ts` (how well the tape faces its heads at what they connect to, and how many edges from a head run over its own tape).

```
PROBE=out.txt npx vitest run tools/probe/tape-heads.test.ts
```

## Every head qualifies

All 15 heads take nothing but their tape (no edge in besides `play=`), all read `at=` in seconds; they play into a voice, a mix, or a braid that splices them (Test Tones' `&first`, `&third`).

| piece | wheels | crossings | overlap |
|---|---|---|---|
| echotape | 25 → 22 | 0.0 → 0.7 | 0 → 0 |
| worn | 15 → 13 | 0.0 → 0.0 | 0 → 0 |
| soundtape | 21 → 18 | 0.0 → 0.0 | 0 → 0 |
| testtones | 31 → 28 | 0.3 → 0.7 | 0 → 0 |
| resonanz | 26 → 24 | 2.3 → 0.7 | 0 → 0 |
| fiveto12 | 18 → 16 | 0.0 → 0.3 | 0 → 0 |

The whole library (`quality.baseline.json`): crossings 53.3 → 53.1, weighed by what they cross 117.2 → 118.7, overlap 0.

## The turning tape

The reel and its recording turn under the heads; the bulbs stay where the heads are, outside that rotation (`MaterialNode.svelte`). The layout's turn of the tape (`fitTurn`) carries the bulbs round: the drawing through each head's handle, the layout by turning `GraphEdge.bulbAt` (given unturned) by the tape's turn (`bulbOf`, `nets.ts`). With the heads' own wheels gone, the tape faces what they play into:

| piece | face error, mean / max (°): nodes → bulbs | edges from a head over its own tape (of all, 3 seeds): nodes → bulbs |
|---|---|---|
| echotape | 7 / 19 → 53 / 116 | 0 → 1 of 12 |
| soundtape | 7 / 21 → 47 / 118 | 1 → 0 of 9 |
| worn | 8 / 16 → 46 / 72 | 0 → 0 of 6 |
| testtones | 10 / 17 → 70 / 176 | 1 → 3 of 15 |
| resonanz | 6 / 17 → 34 / 67 | 0 → 0 of 12 |
| fiveto12 | 6 / 15 → 44 / 70 | 1 → 0 of 6 |

The face error grows because several heads, at their fixed spacing, often play into one hub (`&out`, one mix): no turn faces them all at it. A head's own wheel used to move to its head instead. What the eye sees is an edge from a bulb across its tape, and that is as rare as before (3 of 60 either way). So the tape test checks that (at most one a piece), and the 30° facing only for the write head and heads that are nodes.

## What's next

- Long head names (`&message`, `&second`) get small in a bulb; a sub-label (`at=`) doesn't fit at all. The head's sheet says it.
- A resonator's exciters are pads round its wheel already: a row of the same table, if they ever need to be cells drawn there.
- A splice's other edges are drawn from its braid, not from its bulb (a tap's and a head's leave from the bulb). Leaving from the bulb would be the same rule all the way; not measured.
