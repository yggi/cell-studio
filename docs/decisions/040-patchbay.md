# 040 · The MIDI page is webmidi's patchbay

**Date:** 2026-11-04 · **Status:** accepted (the rulings it builds on are the owner's, on webmidi's patchbay proposal, yggi/webmidi#12; the defaults rule below is this move's own, accepted by the owner with yggi/cell-studio#538; this app's move is the proposal's rung 4) · Part of [yggi/webmidi#3](https://github.com/yggi/webmidi/issues/3) · webmidi: [decision 002](https://github.com/yggi/webmidi/blob/main/docs/decisions/002-setups-device-profiles-and-inputs-as-rows.md), [proposals/patchbay.md](https://github.com/yggi/webmidi/blob/main/docs/proposals/patchbay.md)

## Context

The MIDI page was this app's own (`MidiPanel.svelte`, `state/midi.svelte.ts`): one configuration in `cell-studio:midi`, with a device's facts, the outputs, the input and the routes per piece in one store.
webmidi v0.1.2 holds the same model generalised to several setups (its decision 002) and the components to show it, shared with Jambot.
Two things in this app's routing don't map one to one onto webmidi's book:

- **Defaults.** Here a piece nobody routed plays cells' defaults (every gate and voice on the first output, numbered 1, 2, 3 … skipping the kit's 10), and a row left unchosen on the first output takes its default even when others are chosen; 0 is *not sent*. In the book a crossing that is absent sends nothing, and 0 is *as played* (an input's).
- **Thru.** The keys' thru echoes a key where the voice it plays goes out; the book has no crossing for "with the voice played" yet (decision 002's consequences).

## Decision

- **The book is the store**, kept through webmidi's `localBookStore` (`cell-studio:midi-setups`); the page is webmidi's `MidiStatus`, `SetupPicker`, `PatchMatrix` and `DeviceInspector`, with the theme's colours (`--wm-*`), and the keys and MIDI learn under them, as Cell studio's.
- **A piece the setup in use has no routes for plays what it played before**: cells' defaults, or, for a piece the store before the book had a matrix for, that matrix as it was read (the book's migration leaves the pieces' routes out and this app keeps them beside it, `legacy`). The matrix shows that. **Its first change writes it into the setup, then the change**; from then on its routes are the setup's exactly: a row with no crossing, a voice added to the piece later too, goes nowhere until routed. So the same settings send the same bytes (every example, four stores, 103,981 messages compared with the class before it), and the book's rule holds once a person has routed a piece.
- **An input's crossing forwards** a channel's messages as they come, the channel replaced or kept (*as played*); system messages are not forwarded. The Heard switches are what the keys and MIDI learn listen to.
- **The keys' thru stays as it is**, an option of the keys, until the book has a crossing for the voice played.
- **A device's latency** (its profile) sends its notes and clock that many ms earlier; 0 changes nothing.

## Consequences

- A person's settings migrate once: one named setup, *Cell studio*; the first change makes *Cell studio - custom*.
- A piece routed by its MIDI cards shows them read only, inputs and clock included (but the Heard switches): the matrix locks every row (a webmidi follow-up).
- The store before the book is left as it was, read on each load for the routes it chose.
