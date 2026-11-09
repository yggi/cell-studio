### Changed

- **The language is cells v0.22.0** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md#v0220--2026-11-09)):
  - **A drum's note is its `note=`, not its name** (cells decision 075). **This can affect saved `.cells` pieces:** a piece whose own drums are named as General MIDI's and write no `note=` (`&bd s=sine` in a kit) is warned, and until it writes one each such member takes the next free note from 36, in its kit's order, so MIDI out, the pads, a controller on the kit's channel and the kit's wheel all move to it. Migrate writes the note its name gave (`&bd note=36 s=sine`), and the piece then sends what it sent before. A drum taken from `gm_kit` writes its own note and sends as before. The kit's wheel draws each member by the note it plays.
  - **A swing's share and a bend's depth may move** (cells decision 081): `swing=8n:&lean` takes a cell's values as shares, one each bar, and `bend=4n:&rubato:.5` bends a meter by a table's ratios to a depth, itself a slider or moved by a cell.
  - **A `from` line renames what it takes, `&new=old`**: `&kick=bd, &snare=sd from gm_kit` gives the kit's `&bd` as the piece's `&kick`.
  - Editing a cell that `* from …` gives, which writes its line into the code, keeps the helpers it reads: an edit of one of Radio's band's cells plays as before, where it said `Unknown cell` (#610).
  - Nothing else an existing piece plays changes.
