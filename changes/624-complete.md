### Added
- **Completion after `from` in the code view** (#624, #587): typing after `from ` lists the library's fragments, each with its facet and its distance to the piece's style.
  - Those whose signature names the head the line gives come first (`&bassV from` offers the voices headed `&bassV`), then the rest by distance to the piece's style: its `&style` where it writes one, else the centre of style space.
  - ↑ ↓ choose, Enter or Tab takes one, Esc closes the list.

  Saved pieces are unchanged.
