# 034 · A MIDI file's graph is its machine, read only

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

## Why

The machine is the piece a conversion starts from, so converting can be shown as that graph being reworked. Read only
keeps decision 025's reason (no text to rewrite) without hiding what the file is.

## Consequences

- A MIDI file's Stats (#390) are its machine's.
