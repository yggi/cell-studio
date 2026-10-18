# 037 · One frame: four slots that make room, never cover

**Date:** 2026-10-18 · **Status:** accepted (owner, the desktop layout round) · Issue: #12 (the way back to the library)

## Context

On a wide screen four things wanted the right edge and none knew of the others: the sidebar (☰) was fixed over the
whole window, over the transport's seek bar and tempo and over a cell's card; the cell's card floated over the
graph, 380 px from the window's right, and the tower strip measured where the card was to stand left of it; the time
view was a button in the graph's toolbar on a wide screen and a tab on a phone; and nothing led back from a piece to
the library on a wide screen (the tabs were hidden, the header's path had no root): only a reload got there.

## Decision

**The app is one frame of four slots, the same words at every size** (`App.svelte`'s grid):

- **The header**: the transport, and one switch of the views, *Library · Graph · Time* (a phone adds *Code*, its
  own view there).
- **The left**: the code, on a wide screen a pane beside the stage, shown or hidden (*Code* in the header).
- **The stage**: the library, the graph (its tower strip part of it) or the piece in time.
- **The right**: the **inspector** (`Sidebar.svelte`), one pane whose pages are the open cell (`&blues`: its sheet)
  and the sidebar's (Controls, MIDI, Forces, Files, Stats). It takes its width from the stage, so nothing is covered
  and the graph is framed again in the room left.
- **The bottom**: the keys and pads.

On a phone the right and the bottom are sheets over the view, as they were (a cell's sheet rises from the bottom,
the sidebar is a drawer).

A cell's sheet is still drawn by the graph (it needs the graph's context); on a wide screen it is not modal and lies
where the inspector's cell page is, which the inspector says in `--inspect-left`, `-top`, `-width` and `-height`.

## Consequences

- The graph and the strip no longer measure a card (`cardCover` is gone); the toolbar's *time* button and the time
  view's *graph* button are gone (the switch is the way).
- Choosing another page of the inspector keeps the cell open, its tab first; closing the inspector closes the cell.
- A new panel is a page of the inspector, or a slot's content: not another layer over the window.
