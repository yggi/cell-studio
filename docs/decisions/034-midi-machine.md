# 034 · A MIDI file's graph is its machine, read only; Convert to cells is its story replayed

**Date:** 2026-10-13 · **Status:** accepted (owner, on #390: "midi graph is read only, attempt to edit / opening details
show 'convert to cells first'"; "the flat graph") · Issues: #390, #307 · Supersedes the graph part of
[025](025-midi-documents.md)

## Context

Decision 025 opened a MIDI file as it is: its text in the editor, playing through its notes written out as cells
behind the scenes. The graph waited, with a message and two buttons, because a graph edit has no cell in the text to
rewrite. The owner wants a MIDI file to have a graph too, the **MIDI machine**, with **Convert to cells** as a hero
button on it, and the conversion shown as a followable reworking of that graph.

## Decision

- **A MIDI text's graph is the graph of the cells it plays through** (`cellsFromMidi`, flat: a line a track and
  channel, its voice, `&tempo`, the card). It is drawn as any piece's is, **read only**. Opening a cell's details,
  switching one off, turning one, moving a free value or adding a cell does nothing but say *Convert to cells first*.
  Moving a cell around still moves it. A MIDI file opens on its graph, no longer on the time view.
- **Convert to cells** is a large button over the machine, as well as in the strip under the editor and on the Files
  page.
- **Converting folds first and replays after** (`fold/story.ts`, `state/convert.svelte.ts`). The folder runs to the
  end in a worker. Its result is told as a story: from the notes written out to the piece folded, a cell coming in each
  frame, each frame playing the same notes. The replay is the code set a frame at a time on a timer: the compile, the
  graph, the layout, the editor and the Stats page follow as they do for any edit. There is no animation engine. The
  only layout change is that a version set while a story plays is taken gently (`setGraph(…, { gentle })`: never
  afresh, a light reheat, a lower speed cap) and the view is framed again only when something goes out of it.

## Why

The machine is exactly the story's first frame, so the replay starts from what is on screen. Read only keeps decision
025's reason (no text to rewrite) without hiding what the file is. Replaying the result rather than the search shows
the piece being built, not the folder trying and taking back (the old replay of the Minuet in F: 694 steps, 171 of
them undoing others, and two fresh starts). Editing the code in steps keeps the one source of truth and needs nothing
the app doesn't already have.

## Consequences

- A MIDI file's Stats (#390) are its machine's.
- The tower layout crosses a little less during a story but moves more and drifts out of view, so the flow layout
  stays the conversion's default ([notes/conversion.md](../notes/conversion.md)).
- A cell spliced into one braid is a bulb (decision 014). When a later frame uses it in a second place it becomes a
  node of its own; the replay can't smooth that change of drawing.
