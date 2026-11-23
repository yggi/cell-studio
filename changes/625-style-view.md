### Added
- **The library's Style view** (#625). The library has three views, switched beside its search: Cards, Wheel and Style. The Style view is the fragment map grown into a map of the library on cells' style axes:
  - every fragment;
  - every piece something places there: a style it declares (`* from style=&funk`) or a fragment it takes;
  - cells' preset styles, as named landmarks.
  A piece that declares no style and takes no fragment stays on the wheel, and the map says how many there are. Zoomed in, a piece grows into its wheel, as on the library's wheel. Its chips show pieces, fragments or a fragment's facet, and the library's search is its search. The wheel's Fragments cell opens it, and a fragment opened from it goes ◂ back to it. Saved pieces are unchanged.

### Fixed
- **The library's wheel stays under its search.** On a phone, the wheel's piece titles no longer draw over the search and the view switch when it scrolls under them.
