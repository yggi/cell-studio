### Changed

- **The language is cells v0.19.0** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md#v0190--2026-11-07)):
  - **`beat=` is an error.** A meter counts its beats by its signature or its levels: alla breve is `meter("2/2", 2)`. Migrate's rule `beats` rewrites it. **A saved piece with `beat=` stops compiling** until it's rewritten.
  - **The thirteen meters are one `meter` fragment**, its grouping and swing its arguments: `&bar from meter &tempo`, `meter(swing=8n:2/3)`. The old ids (`meter_4_4`) still read for this minor version, with a warning, and Migrate rewrites them. The graph draws the template's grouping as its own cell, `bar_grouping`.
  - **Four examples are louder, by level only:** Acid-Cell, Moving, Patchbay and Baustelle, their cards set to about −24 dB average (1.6 to 4.3 dB).
  - **Two examples get notes' attacks back:** a ramped line that loops starts each lap at its first value (`waveforms`, `lullaby`).
  - A MIDI file no longer runs a note into the next on its key, and the MIDI clock follows a swing finer than the meter's steps.
