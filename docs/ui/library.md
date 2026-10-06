# The library

Choosing a piece: the picker, a piece's card and its wheel, and the library as a graph.

The **Select** tab chooses a piece: every example and every piece you've saved, as cards with their graph in miniature, filtered by words and by tag — one dropdown per kind of tag (genre, artist, topic; choose in several and all of them hold).

The header has a quicker way: the open piece's place in the library as a path, *kind › tag › piece* (`artist › Neubauten › Baustelle II`), each step a dropdown (the phone's own picker). Choose another kind or tag and the last step lists the pieces there; choose one and it opens. On a phone the path is *tag › piece*, and the tag's list holds every kind. There you can open a file, save to a file (`.cells`, plain text), or save in this browser (where the browser allows it). The examples are listed in [../examples.md](../examples.md).

## A piece's card

A piece's card is a note with a title: the first note with `title=` names the piece, its label describes it, `tags=` tags it (see [../language/display.md](../language/display.md)):

```cells-fragment
&piece title="Swing blues" tags="genre:jazz, genre:blues, caprice" label="A 12-bar blues in C, swung …"
```

It's an ordinary note in the graph; the picker reads it, and a saved piece is saved under its title.

Every piece is shown as one node — the same in the list, its details and the library's graph: a wheel with its own graph in miniature inside, its tags round the rim (named along their arcs where there's room), its facts as petals (how many cells; how long, or how often round), its title (on a card beneath; in the library's graph a pill over the wheel's lower third, straight). The wheel is a picture: a tap anywhere on it is the piece's (a card opens it, the graph shows its details); tags are chosen from the dropdowns, or as chips in a piece's details. The graph opens fitted; pinch (or ctrl + wheel) to zoom; titles show when there's room, or on hover and press-and-hold. Each wheel says how long the piece is: when it ends, or its cycle (every layer — melodies, meters, what oscillates, selects or turns — back together: the least common multiple of their periods), and whether chance makes every time round different.

## Select

The first view, **Select**, is the library (Select · Graph · Code are the tabs; on a wide screen, Select covers both panes): as a graph by default, or as cards.

- The five main genres (`genre:`: classical, jazz, electronic, experimental, world) — are the rim of one large cell wheel, a braid of five named arcs at even angles (tap one to light its pieces). The pieces and the other tags sit on the disc within, the tags as quiet words.
- The rim keeps every colour (a tag's angle) in place; a tag's saturation grows with its distance from the centre; tags one piece alone carries step back when zoomed out.
- One level up, every piece is a wheel and every tag a node the size of how many carry it. The tags organise it, and it's grown, not placed: every node starts tiny in the middle and the tag edges pull each piece to its tags, so the groups gather while there's room to move (each piece leaning to its genres' side, so the knot is turned to the rim); then the nodes grow until the wheel is filled enough, each keeping only its neighbours off (an exclusion zone and a near field, no long-range push), so the groups keep together as they swell (`layout/library.ts`, d3-force as in a piece's graph, [graph.md](graph.md)).
- That growth is the library's opening, drawn as it happens (fewer, larger steps on a slow device). The result is kept in the browser; on the next visit the opening is replayed from it — out from the middle in 0.7 s, no physics. With reduced motion, it simply appears.
- Tap a tag to light its pieces (tied to it by lines; other tags step back); tap a piece for its card (description, tags, Open).
- A tag's colour is its angle round the cloud's centre — the cloud is a colour wheel by construction; the same colours everywhere tags appear. Each tag washes its pieces in its colour, as cells tagged alike are washed in a piece's graph (one wash, `layout/clusters.ts`, kept to the heart of a tag carried all over).
