# Shorten

A linter in the code view that offers what's written out longhand, shorter. Implemented in `src/engine/shorten/` (one rule a file, their shared harness in `harness.ts`), UI in `src/ui/Shorten.svelte`.

It offers:

- **runs**: `0 0 0 0` → `0!4`
- **a phrase written more than once**, anywhere, as a cell of its own used where it was: as written, backwards (`&m[::-1]`), or — where the numbers are grid steps — transposed (`&m^$7`)
- **fractions**: every step held a multiple of n — divide it out and slow the clock: `4@2 2@2` with `step=&bar*2` → `4 2` with `step=&bar`
- **degrees**: a phrase written again a few steps up the scale it is read through becomes `&m^k` (through a grid, `&m^$k`); a cell whose only job is to read motifs through a shifted table (`&mid over=&scale[>>] &down`, or written in place) becomes `&down^1` where it is used — unless it has a label
- **progressions**: a pitch that only transposes, written `loop=&bar/48` over twelve steps, becomes `step=&bar/4` (it holds under the finer melody beside it), so its runs can be counted
- **defaults**: an attribute that says what would be so anyway — `loop=SAMPLE_RATE` on the sound card, a turning table's `cycle=` equal to its own length, `pan=.5`
- **stereo**: a sound card with two chords that hold the same sounds at different gains becomes one chord and a `pan=` on each voice ([decision 007](../decisions/007-pan-is-back.md)), when each pan is exact and each voice plays nowhere else
- **the same**: two cells written exactly alike become one

The measure is the code's length (a new cell's line counts too; a run of spaces counts as one, so the padding that keeps comments aligned isn't code). A rule that rewrites whole lines checks the whole piece's first minute, note for note, before it offers anything; on the longest piece (BWV 847) the list takes about a third of a second. **The promise is the sound:** the tests apply every suggestion to every example and compare every note ([../testing.md](../testing.md)).
