# The library

Choosing a piece: the picker, a piece's card and its wheel, and the library as a graph.

Tap the title in the header to choose a piece: every example and every piece you've saved, as cards with their graph in miniature, filtered by tag (exercise, étude, caprice, fantasy, rhythm, harmony, jazz, baroque, electronic, tuning …) and by words. There you can open a file, save to a file (`.cells`, plain text), or save in this browser (where the browser allows it). The examples are listed in [../examples.md](../examples.md).

## A piece's card

A piece's card is a note with a title: the first note with `title=` names the piece, its label describes it, `tags=` tags it (see [../language/display.md](../language/display.md)):

```cells-fragment
&piece title="Swing blues" tags="genre:jazz, genre:blues, caprice" label="A 12-bar blues in C, swung …"
```

It's an ordinary note in the graph; the picker reads it, and a saved piece is saved under its title.

Every piece is shown as one node — the same in the list, its details and the library's graph: a wheel with its own graph in miniature inside, its tags round the rim (named along their arcs where there's room), its facts as petals (how many cells; how long, or how often round), its label beneath. The wheel is a picture: a tap anywhere on it is the piece's (a card opens it, the graph shows its details); tags are chosen as chips, in the cards' row or a piece's details. The graph opens fitted; pinch (or ctrl + wheel) to zoom; labels show when there's room, or on hover and press-and-hold. Each wheel says how long the piece is: when it ends, or its cycle (every layer — melodies, meters, what oscillates, selects or turns — back together: the least common multiple of their periods), and whether chance makes every time round different.

## Select

The first view, **Select**, is the library (Select · Graph · Code are the tabs; on a wide screen, Select covers both panes): as a graph by default, or as cards.

- The five main genres (`genre:`: classical, jazz, electronic, experimental, world) — are the rim of one large cell wheel, a braid of five named arcs at even angles (tap one to light its pieces). The pieces and the other tags sit on the disc within, the tags as quiet words.
- The rim keeps every colour (a tag's angle) in place; a tag's saturation grows with its distance from the centre; tags one piece alone carries step back when zoomed out; the tag chips belong to the cards.
- One level up, every piece is a wheel and every tag a node the size of how many carry it, laid out by the same physics as a piece's graph ([graph.md](graph.md)) — without its ranks, held together both ways: a cloud where pieces that share tags gather.
- Tap a tag to light its pieces; tap a piece for its card (description, tags, Open).
- A tag's colour is its angle round the cloud's centre — the cloud is a colour wheel by construction — and each tag washes its surroundings in its colour; the same colours everywhere tags appear.
