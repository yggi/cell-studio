### Changed

- **The language is cells v0.21.0** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md#v0210--2026-11-08)):
  - **Two new examples:** *Circle* (the diatonic circle, with chords as a level of the key) and *Radio* (a station's style on sliders, drifting a section at a time).
  - **Any number may be a slider** (`free(v, lo..hi)` wherever a number is written). A count, an index or a turn (`cycle=`, `laps=`, `x!n` …) is whole, and its slider and a MIDI knob move it by ones, writing whole numbers back into the code (#607).
  - **`:pairs` on a swing says nothing more:** cells warns of it, and Migrate drops it.
  - Nothing an existing piece plays changes. Two gaps in drawing *Radio*: the wires its new forms write and the routing of its band's outs aren't drawn yet (yggi/cells#618).
