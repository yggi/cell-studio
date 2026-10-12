# 024 · A resonator is drawn as its body

**Date:** 2026-10-11 · **Status:** accepted (owner: the answers on [the note](../notes/resonator-bodies.md)) · Issues: #234

## Context

A resonator (`body=fork|bell|bar|plate|box|tine|pipe|wire|spring`, [physics.md](../language/physics.md#resonators))
was a brass disc with its mode rings, and brass pads round it only when it had more than one exciter. Most resonators
in the library have one, so a fork, a plate, a girder, a spring and a pipe looked the same. #302 drew a kalimba's
exciters as tines; the mock-ups (`node tools/gallery.mjs mockups`, question 2) tried the same for every body.

## Decision

- **The disc is the body's material** (option D): brass for a fork or a bell, steel for a tine, a plate or a spring, wood
  for a bar or a box, a soundboard's spruce for a wire, organ metal for a pipe (`layout/exciters.ts: materialOf`, the
  tokens `--body-<material>-…`).
- **The body is engraved on its face, over its mode rings** (`ui/BodyFace.svelte`), drawn round the axle; while it
  rings its moving part is ghosted as far as its first mode rings.
- **Each exciter is its body's element at its turn**, its free end out to where its strand meets it
  (`exciterPlaces`, `ui/ExciterShape.svelte`), sized by its pitch as the body rings. A string points outward, as a tine
  does. A single exciter has its element too, at the top.
- **A note's strand**: a bus into several exciters goes round through the loom; a single exciter takes its strand
  straight to its element, a tune's or a product's alike.

## Why

The common case, one exciter, had nothing that said which body it was. The engraving says it for every body, the
material says it at a glance across a graph, and the exciters stay where the strands already met them (no layout
change). Keeping the mode rings under the engraving keeps what the rings show while it rings.

## Consequences

Drawing only: nothing a piece sounds or saves changes. Nine bodies, five materials: a new body is a row in
`exciters.ts` and a figure in `BodyFace.svelte`.
