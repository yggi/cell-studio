# The piano roll

A braid cell's sheet has a **piano roll** under its wheel: the helix unrolled, its steps across and its rows up (#211). It writes the same braid the wheel and the code do: every edit is a rewrite of the cell's line ([editor.md](editor.md)).

## What it shows

- **Across: the cell's steps.** Lines fall on its meter's beats, stronger on each bar, in the cell's own steps: `step=&bar/4` over a 4/4 `scan(1 1 1 1)` has a bar of 16 steps and a beat of 4. A cell that is its own clock (`step=2`) has no bars. A dashed line marks where the braid comes round; past it, dimmed, is room to write (whole bars, a bar more once it fills one).
- **Up: its rows**, the entries of the table it reads, over the laps. Over a scale (`over=scale(dorian, D)`) a row is a degree: 7 rows a lap, so no row is a wrong note. Without `over=` a row is a semitone (the black keys darker), or a grid step over another grid (19 rows a lap on `&edo19 cycle=19 map=edo`). Over a kit a row is a voice, by name. The rows run from the first entry to the one that closes the lap (C4 to C5), widened to every note; **+ above** and **+ below** add a lap. At most 128 rows are drawn (`MAX_ROWS`, a few laps): past that the laps are a window round the notes, and a braid whose notes spread wider, or lie that far outside the table's first lap (`&a 0 5000`), is not editable in the roll ("a note far outside its table").
- **The notes** in the colour they sound (the palette's pitch rainbow on its grid, muted by octave). Notes in one column are a chord.
- **Ghosts**: dim notes of what else plays the same table on the same clock (a bass on the same scale), in this cell's steps, repeated round their own length. They are degrees of the same table, not pitches: a bass two octaves down shows on the same rows.
- **The playhead**: the heard step, lit, while playing or paused (from the transport's clock, as the wheels read it).
- **The keys** on the left, one per row, light while pressed or held. They don't sound yet: playing the cell's voice from them waits for MIDI in's `press`/`release` (#207).

## Editing

- **Tap** an empty cell: a note there (added to the chord that starts in that column; inside a note held over it, the held note stops there). **Tap a note**: it goes; the steps it held stay as rests.
- **Two fingers** drag the roll sideways when it is wider than the sheet (a phone): one finger taps and drags notes, and scrolls the sheet up and down.
- **Drag right** from a note, or from where you start one: it holds (`x@n`), up to the next note (lengthening never eats one). Past the end, the braid grows.
- **Keyboard**: the roll takes focus as one control. The arrows move a cursor, Enter or Space toggle the note under it, Delete removes it, Shift with ← → holds it shorter or longer, Home and End go to the first and last step. The cursor is said in the roll's label.
- **Undo** (or Ctrl/⌘+Z on the roll) writes back the braid the roll's last edit replaced, while the braid is still what it wrote. It is kept per piece opened (`src/ui/rollHistory.ts`). Keys with Alt, or the arrows and Enter with Ctrl or ⌘, are left to the browser.

## How it writes

A column is one step of the braid, written short: a note `4`, a chord `[0,2,4]`, a hold `4@3`, a rest `~`, a rest of several `~@4`, the same step again `0!4` (as Shorten counts it). So `0 0 0 4` comes back `0!3 4`, `~ ~ ~` comes back `~@3`, and what the examples write is mostly given back as written. For every braid of the examples it can show, reading it into the roll and writing it back plays the same steps (`src/layout/roll.test.ts`).

**Not editable in the roll** (it says why, and leaves the braid alone): a generator (`scan()`, `euclid()`, `meter()` …), a splice or a pick (`&motif`, `&x[0]`), a ratchet (`x*n`), chance (`x?`), a choice (`[a|b]`), a note by name (`C`, a pitch rather than a row), an accidental or a decimal (between rows), a chord that doubles a note, notes far outside the table. A blank braid plays its table; a note written in the roll makes it a braid.

The roll shows for a braid on one line (a melody, a bass, chords, a pattern over a kit): not for voices, mixes, meters, tables, curves (`map=`), or a cell written over several lines. Nor for what has a braid but isn't notes: a tape (`write=`) and its read heads (`play=`), a law (`law=`), a scope, a reel (`motor=`), a resonator; a clock or a table that an attribute reads and nothing plays (a tap of the bar, `map=&curve`); a waveform at audio rate (`step=8k`). A blank cell rolls only when something plays it as a melody. A sweep over every example holds this (`src/layout/roll.test.ts`).

## Where things are

- `src/layout/roll.ts`: the model, pure: `fromBraid`/`toBraid`, the edits (`toggle`, `remove`, `resize`), the frame (`frameOf`), the rows (`rowsFor`, `rowRange`), which cells roll, the ghosts.
- `src/ui/PianoRoll.svelte`: draws it and reports pointer and keys; `src/ui/RollKeys.svelte`: the key column (`onpress`/`onrelease`, a `held` set).
- `node tools/gallery.mjs roll`: a contact sheet of the roll in each state (the `gallery` skill).
