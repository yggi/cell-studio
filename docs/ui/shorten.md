# Shorten

A linter in the code view that offers what's written out longhand, shorter. Implemented in `src/engine/shorten/` (one rule a file, their shared harness in `harness.ts`), UI in `src/ui/Shorten.svelte`.

It offers:

- **runs**: `0 0 0 0` → `0!4`
- **a phrase written more than once**, anywhere, as a cell of its own used where it was: as written, backwards (`&m[::-1]`), or — where the numbers are grid steps — transposed (`&m^7`)
- **fractions**: every step held a multiple of n — divide it out and slow the clock: `4@2 2@2` with `step=&bar/2` → `4 2` with `step=&bar`

The measure is the code's length (a new cell's line counts too). **The promise is the sound:** the tests apply every suggestion to every example and compare every note ([../testing.md](../testing.md)).
