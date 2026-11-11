### Changed

- **The language is cells v0.24.0** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md#v0240--2026-11-11)):
  - **The grooves read only what they declare** (cells decision 075): a groove is a template whose drums default to the General MIDI kit's. **This can affect saved `.cells` pieces:** a piece that defines its own `&bd` and takes a groove is warned until it passes its own, `* from funk_drums(bd=&bd)`. Migrate writes that argument.
  - **A part and a drum role are values, not names:** `part=bass` on a line or a performer's role cell, `role=kick` on a drum line. **This can affect saved `.cells` pieces:** a line named `&bass` or `&kick` with no `part=` or `role=` plays with no feel. Migrate writes what the name gave. A followed Jambot session plays with its feel once Jambot's text writes them (yggi/jambot#615).
  - **A key's tonic read from a meter is warned of**, `scale(dorian, &bar)`, and plays as before.
  - **Examples take the library's meter and key:** *Radio*, *Swing blues*, *Coltrane changes*, *Five*, *Cell Phase* and *Bossa nova* write `&bar from meter(…) &tempo`, and *Sympathy*, *Sound on a worn tape* and *Patchbay* write `&key from diatonic(…)`. They play the same notes. Their graphs change: the meter's tempo and grouping are drawn beside it, and *Bossa nova*'s bar now takes the second meter colour, after its clave. *Music Box* and *Cell Phase* are `meter("3/4")`, *Five* is `meter("5/4")` and *Bell and scale* is `meter("12/8")`.
  - **The swing slider of *Swing blues*, *Coltrane changes* and *Five* moves the share, 0.5 to 0.75,** where it moved the ratio, 1 to 3. It starts at the same notes.
  - Eight new styles' fragments can be taken by a `from` line (23 styles in all).
  - Nothing else an existing piece plays changes.
