# 025 · A MIDI file opens as it is: its text, playing

**Date:** 2026-10-12 · **Status:** proposed (owner's direction on #307: "midi-files should open as they are and shown in
the code editor … playable as unconverted midi; 'convert to cells' is an action") · Issues: #307, #234

## Context

Opening a `.mid` wrote it out as a `.cells` piece at once (#310). The owner wants both kinds of file handled natively:
a MIDI file shown and played as it is, and converting it to cells a step the user takes. The app's rule is that the code
is the single source of truth, and every graph edit is a rewrite of a cell's line (`engine/edit.ts`).

## Decision

- **A MIDI file is a text too** (`engine/miditext.ts`): a header (`midi format=1 ppq=480 name="…"`), its tempos and
  meters, then a track at a time, a line an event at its place in bar:beat:tick (`1:1:0 ch1 C5 120 v90`). The code editor
  shows it and it is edited there; saved, it is a `.mid` again (`writeMidi`), event for event. Which kind a text is
  follows from the text itself (`isMidiText`: its first line that isn't blank or a comment starts `midi`), so the code is
  still the one source of truth, saved here or in a file alike.
- **It plays as it is.** `Piece` reads a MIDI text and writes its notes out as cells behind the scenes
  (`cellsFromMidi`, a fixed tempo), which compile and play: the transport, the time view, MIDI out, rendering all work
  on it. A line it can't read is an error on that line (the rest plays; with errors, the last version that could).
- **The graph waits for the conversion.** A MIDI text has no cells to rewrite, so the graph's edits (turn, switch off,
  add, a free value moved) do nothing, and its pane says so, with **Convert to cells** and **Show it in time**. A
  MIDI file opens on the time view.
- **Convert to cells is an action** (the graph pane, the strip under the editor in place of Shorten, the Files page):
  the text becomes the piece written out (`cellsFromMidi`, its tempo a slider), the file's name `.cells`; then Shorten.

## Why

The text staying the source of truth keeps one model (one editor, one save, one compile path); only the step from text
to cells differs. A MIDI text that can be read, edited and saved back exactly is the file "as it is"; its notes behind
the scenes are what the app already plays. A graph drawn from the hidden cells could be looked at but not edited
without writing cells the text doesn't have, so it waits for the conversion instead.

## Consequences

- Velocities, bends and programs are in the text and the saved file, but not yet in what plays (`cellsFromMidi`
  keeps notes only), nor in a conversion.
- Every keystroke in a MIDI text reads, converts and compiles it again: BWV 847's 5,449 lines take 15 ms (median of
  ten, node; its .cells example compiles in 8 ms). Measured on the engine alone, not in the page.
