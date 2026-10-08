# MIDI

MIDI on this device: the connection, the ports, and All notes off (#203, the epic; this page grows with it).
Nothing here sounds yet, and nothing is written into a piece: what a device is belongs to this browser, not to the code.

- **Where.** *MIDI…* in the picker's **Files** menu opens the dialog (`src/ui/MidiDialog.svelte`): Connect MIDI, then Refresh ports, the output (*No MIDI output* or a port) and the input (*No MIDI input*, *All inputs* or a port) to use, and All notes off. Under them, in words, what was found or why there is no connection: no Web MIDI in this browser (Safari, Firefox without its add-on), or access blocked (a denied prompt, an iframe). Without MIDI everything else works as before.
- **Kept.** The ports chosen are kept in this browser by id and by name (`storageKey('cell-studio:midi')`). A port chosen before is connected again on load without a click, since a permission already granted needs no gesture; a first visit asks for nothing until Connect.
- **Unplugged and plugged in again.** Every change of the ports adopts the chosen ones again, since a port plugged in again is a new object: the output by its id, or, when that id is gone, a port with the same name (ids change on replug on some systems), and the input listened to anew. A chosen port that is absent shows as *Not connected*.
- **All notes off** sends CC 123 on every channel sent on since the last time (on all 16 when none was), and forgets them. It runs by itself when the tab comes back into view, since a tab frozen while hidden can leave a release unscheduled and hardware sounding.

The code: `src/midi/` is the browser glue (`access.ts` the Web MIDI connection, `routing.ts` adopting the ports, `surfaces.ts` reading a message, `fixtures.ts` the fakes the tests use instead of a device); `src/ui/state/midi.svelte.ts` is the `Midi` class in the `Studio` context. Much of it is lifted from Jambot (`yggi/jambot` @ `8cdb6b8`); each lifted file says from where.
