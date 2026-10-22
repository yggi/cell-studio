# The library

Choosing a piece: the picker, a piece's card and its wheel, and the library as a graph.

The **Select** tab chooses a piece: every example and every piece you've saved, as cards with their graph in miniature, filtered by words and by tag — one dropdown per kind of tag (genre, artist, topic; choose in several and all of them hold). The tutorial comes first, a section of its own, tier by tier, each piece numbered with its tier; then the other examples, smallest first.

The header has a quicker way: the open piece's place in the library as a path, *kind › tag › piece* (`artist › Neubauten › Baustelle II`), each step a dropdown (the phone's own picker). Choose another kind or tag and the last step lists the pieces there; choose one and it opens. A piece of the tutorial shows *tutorial › tutorial › 2 · A voice…*, its pieces listed tier by tier: the next one is the next piece. On a phone the path is *tag › piece*, and the tag's list holds every kind. There you can open a file, save to a file (a piece file, `.md`, for a piece opened from one, as every example is; else `.cells`, plain text), or save in this browser (where the browser allows it). The examples are listed in [../examples.md](../examples.md).

## A piece's file

A piece is a file (cells' decision 047): its title, tags, tier and description in the frontmatter, the piece in its cells blocks, prose around them (cells' decision 051, literate cells: the code is the blocks joined, in order). The examples have no card (cells #199): what the piece is, is its frontmatter.

````markdown
---
title: Swing blues
tags: [genre:jazz, genre:blues, caprice]
description: A 12-bar blues in C, swung.
---

The voice first.

```cells
&a loop=A4
```
````

The picker reads the frontmatter; **the editor shows the code, the blocks joined, not the file**: diagnostics, the graph's edits and *Show in code* all speak in the code's lines. The open piece keeps the frontmatter, the prose and where each block was beside it, and saving writes each line back into the block it came from, the prose byte for byte (`writePiece` with the file's layout), so a piece is saved under its title and with its prose. A Markdown file of cells blocks with no frontmatter is a piece too (cells #212): it opens with an empty frontmatter and saves without one while it has none. A piece may take a fragment of cells' seed library by its id, `use "core kit"` ([cells' use.md](https://github.com/yggi/cells/blob/main/docs/language/use.md)): what plays is the piece's own lines, then the fragment's lines it doesn't define; the code keeps the `use` line, and the graph draws the used cells as cells of the piece. A piece file records what each `use` resolved to in its frontmatter, `uses:` (a lockfile), the first time it is saved; a fragment that has changed since plays its current version, with a warning on the `use` line, and the file keeps the version it was saved with. A text written the old way (`title=`, `tags=`, `tier=` or `label=` on a `&piece` card) still opens and plays, with one warning on the card; Shorten offers to move it into the frontmatter, its label as the description, and the card's line goes.

Every piece is shown as one node — the same in the list, its details and the library's graph: a wheel with its own graph in miniature inside, its tags round the rim (named along their arcs where there's room), its facts as petals (how many cells; how long, or how often round), its title (on a card beneath; in the library's graph, see below). The wheel is a picture: a tap anywhere on it is the piece's (a card opens it, the graph shows its details); tags are chosen from the dropdowns, or as chips in a piece's details. The graph opens fitted (on a phone, on the middle, zoomed in to where the titles read at 11 px); pinch (or ctrl + wheel) to zoom. Each wheel says how long the piece is: when it ends, or its cycle (every layer — melodies, meters, what oscillates, selects or turns — back together: the least common multiple of their periods), and whether chance makes every time round different.

## Select

The first view, **Library**, is the library (*Library · Graph · Time* is the header's switch, a phone's tabs with *Code*; on a wide screen the library covers the code and the stage, the inspector beside it: [decision 037](../decisions/037-one-frame.md)): as a graph by default, or as cards.

- The five main genres (`genre:`: classical, jazz, electronic, experimental, world) — are the rim of one large cell wheel, a braid of five named arcs at even angles (tap one to light its pieces). The pieces and the other tags sit on the disc within, the tags as quiet words.
- **The cells beside the wheel fold** (`foldSides` in `layout/library.ts`): the tutorial and each collection of the MIDI library is a small disc just outside the rim, its name and how many pieces it holds (how many found, searching), its area by that count, where the layout put it round the wheel, spread till none overlap; so the wheel has the frame, and at the full view on a wide screen its titles read (1440×900: 39 titles, none over another). A tap opens one whole, out beyond the others the same way round, and the view flies to it (close enough that its titles read); a tap on its rim, or *Fit*, folds it again; a search whose finds are all in one cell opens it.
- The tutorial (the pieces tagged `tutorial`, [display.md](https://github.com/yggi/cells/blob/main/docs/language/display.md#the-tutorial-tier)) is a cell of its own beside the wheel: its rim is named TUTORIAL (tap it to light its pieces), its pieces sit in rows tier by tier (the library's order within a tier), numbered with their tier, a row left to right and the next back, with a faint thread through them. They grow with the wheel when it opens; they are washed by no tag (their tags still light them).
- The rim keeps every colour (a tag's angle) in place; a tag's saturation grows with its distance from the centre; tags one piece alone carries step back when zoomed out.
- One level up, every piece is a wheel and every tag a node the size of how many carry it. The tags organise it, and it's grown, not placed: every node starts tiny in the middle and the tag edges pull each piece to its tags, so the groups gather while there's room to move (each piece leaning to its genres' side, so the knot is turned to the rim); then the nodes grow until the wheel is filled enough, each keeping only its neighbours off (an exclusion zone and a near field, no long-range push), so the groups keep together as they swell (`layout/library.ts`, d3-force as in a piece's graph, [graph.md](graph.md)).
- At the full view a piece is its title, a pill: what matters there is reading what's where. With less room than an 8 px title (a wide library zoomed out), it is a dot, its title shown under the pointer or zoomed in: titles never lie over each other. Zoom in and its wheel grows behind its title (the title moves down the wheel, its cells and cycle in a row beneath it), with its miniature inside — fetched only then; hover or press-and-hold shows one piece's wheel at any zoom. A piece's room in the layout is its title pill's, with some air above and below; its wheel takes the room free around it (half the way to the next piece), so wheels never overlap; the tags' words lie over the wheels, the titles over everything.
- Rooms are boxes (pills are wide): the exclusion zone sets two apart sideways unless up or down is much shorter, and the cloud is kept round as its wheel is (pills set apart only the shortest way would stack into a column).
- That growth is the library's opening, drawn as it happens (fewer, larger steps on a slow device). The result is kept in the browser; on the next visit the opening is replayed from it — out from the middle in 0.7 s, no physics. With reduced motion, it simply appears.
- Tap a tag to light its pieces (tied to it by lines; other tags step back); tap a piece for its card (description, tags, Open).
- A tag's colour is its angle round the cloud's centre — the cloud is a colour wheel by construction; the same colours everywhere tags appear. Each tag washes its pieces in its colour, as cells tagged alike are washed in a piece's graph (one wash, `layout/clusters.ts`, kept to the heart of a tag carried all over).
