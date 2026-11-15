### Added
- **A selection turned into a fragment of your own** (#626): select lines in the code and press *Turn into a fragment* (under Shorten). A dialog shows cells' proposal:
  - an id and a facet;
  - its signature, each name with why it is there: the heads the rest of the piece reads, the main parameter it is passed, the cells it keeps to itself;
  - its text, and the line the piece will take it with;
  - two checks: the piece plays the same, and whether the library holds it already.

  ▶ hears it alone. *File as mine* keeps it in this browser (IndexedDB) and rewrites the piece to take it; after a reload it plays the same. Saving the piece as a file writes your fragments back into it, so a shared file plays anywhere. Saved pieces are unchanged.
