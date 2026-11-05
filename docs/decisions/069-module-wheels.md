# 069 · A module is one wheel, its jacks on the rim; a voice shows the jacks in use; a wheel grows to keep its jacks a finger apart

**Date:** 2026-11-05 · **Status:** accepted (the owner, on #556: "1) all with unused hidden 2) grow the wheels") · Issue: [#554](https://github.com/yggi/cell-studio/issues/554) · Mock-up: [notes/554-module-wheel.md](../notes/554-module-wheel.md) · From yggi/cells [decision 067](https://github.com/yggi/cells/blob/main/docs/decisions/067-a-module-after-its-voices.md) (modules as fragments, a cable as a reference) and its patching API (`@yggi/cells/engine/patch`: `jacksOf`, `patch`, `unpatch`)

## Context

cells makes a modular patch out of text: a module is a `from` line on a fragment with a signature, its optional parameters are its jacks, and a cable is a reference written where the language reads it. `jacksOf` says, for any cell, which jacks it offers, their band (CV or sound), what is patched into each, and its knob.

Today this app draws a module as a use's cluster ([decision 038](038-use-groups.md)): the head among the private cells its use gave (Patchbay's `&vcf_in`, `&vca_eg`, `&vca_level`, `&saw_pitch`), with cables arriving as plain wires that don't say which jack they fill.

The mock-up compared three ways on yggi/cells' Patchbay, at a desktop's width and a phone's:
- `cluster`: today's, with tabs;
- `module`: one wheel, with its jacks on the rim;
- `all`: as `module`, and a voice's jacks too.

It found that six jacks crowd a voice's wheel (about 24 px apart on a phone, four of them unset), and that a wheel's radius sets how many finger targets fit on it.

## Decision

1. **A module is one wheel.**
   - Its face is the head's own glyph: a filter's response, an amp's level, an LFO's wave, a sample and hold's steps, an oscillator's wave.
   - Its jacks sit on its rim, inputs over the lower half in its signature's order and its output on top. Its private cells (the defaults and inputs its use gave) have no node of their own.
   - A use of a collection (a kit, the envelopes) stays a cluster, as decision 038 draws it.
2. **Any cell with jacks shows them the same way**: a voice's moving sound parameters, `pitch=`, `env=` and `fm=`, and an instrument's filters, as `jacksOf` gives them.
3. **At rest a wheel shows only the jacks in use**: those holding a cable, a value written on the line, or a knob's default. A jack with no value written is hidden.
4. **While a cable is dragged** (#555), every jack of the band it can take shows, lit, used or not. A hidden one says why it can't take the cable yet (cells' `PatchError`: write its value first).
5. **A jack is drawn by what it holds:**
   - filled: a cable, in its band's colour;
   - a ring with a dot: a value set on the line;
   - a knob: its default, its pointer where the value sits.

   A cable is drawn in its band's stroke, from the source's output to the jack: sound a wave, CV solid (the graph's palette).
6. **A wheel grows to keep its jacks a finger apart on a phone.** Its n jacks shown over its lower half (0.9 π of it) are 44 px apart in a straight line at 1:1, the chord a fingertip measures: a radius of at least 22 / sin(0.45 π / (n − 1)) px, 22 px for two jacks, 48 px for four, 79 px for six. (Corrected while building it, #560: the record first gave 44 (n − 1) / (0.9 π), which keeps the jacks 44 px apart along the arc, and two of them only 28 px apart in a straight line.) It never shrinks below the size it has today. The jacks don't go on a ring outside the rim. **On a voice** (a disc with its envelope's band under it) its outline is the rim, and its jacks go round the band's three straight sides, down its left, along its bottom and up its right, evenly: about 1.72 times its size, so six a finger apart on a 160 px voice, and no voice in the library grows (#560's rung B).

## Why not

- **Today's cluster with tabs:** it keeps the private cells as nodes, and the tabs, the head's name and the wash's name compete for one strip under the head.
- **`module` alone**, with no jacks on voices: a voice's filter, envelope and pitch take cables just as a module's do (`jacksOf` gives both alike), so the two would be drawn differently for no reason in the text.
- **Every jack shown at rest:** Patchbay's kick would show six, four of them unable to take a cable; hidden, it shows two (`pitch`, `env`).
- **A ring of jacks outside the rim:** a second circle round every wheel with jacks, where growing the wheel keeps one shape. The owner chose growth.

## Consequences

- The private cells of a module leave the graph: four of Patchbay's 28 nodes.
- A cell's sheet (its detail) is where its hidden jacks are set (a value written), as attributes are today.
- The layout places a module's sources under the jacks they fill, to keep cables from crossing (the rim follows the signature's order). Tuning that is the layout's, measured with the probe skill when it is built.
- Built at the pin that carries yggi/cells#474 (the one-cable rule, after v0.17.0); the drawing, then the dragged cables, #555.
