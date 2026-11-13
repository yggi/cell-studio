### Changed

- **The language is cells v0.25.1** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md#v0251--2026-11-13)):
  - **A named product of notes compiles** (cells decision 087): `&phrase [&notes * &accent]`, then `[&phrase * &glass * .3]`, plays `[(&notes * &accent) * &glass * .3]`, where it was an error ("has no voice").
  - **The tutorial pieces *Fifths* and *Chords* are respelled**, each playing the same notes: *Fifths* names its chromatic twelve `&twelve`, and *Chords* takes its key from the library on its tonic, so its third tier shows the tonic and the library's key.
  - **The seed library's fragments are placed by idiom:** the default instruments, the kit (`gm_kit`) and the motif `question` no longer stand at the centre of the style space, and a style takes an instrument only within 0.3 of it. What a piece that takes `gm_kit` or a default instrument by a `from` line plays doesn't change.
  - Nothing else an existing example plays changes. Saved `.cells` pieces are not affected.
