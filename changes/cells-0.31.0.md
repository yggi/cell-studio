### Changed
- **The language moves to v0.31.0** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md)):
  - **Pop is the 24th style**, a landmark on the library's style map, with four new seed progressions in the Fragments cell and on the map: `authentic_cadence` and `four_chord_pop` beside Pop, `pachelbel_canon` beside Baroque and `bebop_ii_v_i` beside Swing jazz.
  - **A number read as the piece is built may be a cell**: `seed=&s`, `chance=&p`, `cycle=&n`, a count `x!&n`, a pick `&x[&n]`, `fifths(&n)` and the others take a cell that is one number, where each was an error. `wander` takes a seed, and `metric_accent` a meter (`metric_accent(meter=&bar)`), so 3/4, 5/4 and 7/8 get their own accents.
  - **A fragment of your own filed from a selection is filed as itself**: a text of `from` lines alone, such as a vamp and its bass, was filed as the seed `stick_count`; Extract now relies on the language to tell them apart.
  - **A fragment's lock is written `e3:`**, the hash of what its cells play, so a label, tags or the order of its lines move nothing. A lock written `e1:` or `e2:` still checks as it was.
  - **Messages say where a cell written in place is**, "the cell at line 3, column 12", not its made-up name `&λ3_12`.
  - **A query on a workbench of a meter alone no longer offers the song forms**: the fit filter shows fewer, and right, fits.
  - No example's notes move. The examples whose noise voices now write `seed=` (*Acid*, *Bossa nova*, *IDM*, *Baustelle*) start some of their noise from another place in it: the same noise, its grains moved.

  A saved piece plays as it did. A saved piece's lockfile keeps its `e1:` or `e2:` entries as recorded, and a `metric_accent` taken with `steps=12` for four beats of three now weighs 4/4 in triplets.
