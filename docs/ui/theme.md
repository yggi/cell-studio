# Theme

Where the colours, sizes and motion come from.

- **One place**: the variables at the top of `src/app.css` (surfaces, ink, accent, status, the note rainbow, radii, spacing, type sizes, shadows); components use those names only.
- Colours computed in code (note fills in SVG) come from `src/ui/theme.ts`, which mirrors the note settings.
- **The palette is the note rainbow** — C red, D yellow, G light blue … — in the notes and spectra, and in the chrome: the title, the active tab, Play's rim while playing.
- **One palette for what flows** (`src/ui/palette.ts`, `palette(band, value, grid)`): a value and its band make the colour, never a kind of edge. Pitch: the rainbow on its grid, muted by octave (`noteColour`). Level (an envelope, a gain, `lpf=`): lightness on one neutral hue, the edge's own (`LEVEL` in `theme.ts`: 46 % at 0, 3:1 against `--bg`, to 86 % at 1). Sync: the meter's level tokens, `--meter-0` the bar's first … `--meter-3` the finest. Audio: the hue of its fundamental, as bright as it is loud (`SOUND`; the spectrum wheels' bands). No grid (a mix of voices on several grids): pitch and sound are neutral. Which grid: [graph.md](graph.md).
- **Every colour rule**, in one table (below): what a colour says, where it is made.

- **How edges are drawn**: their widths, dashes and the opacity of each state are `--edge-*` tokens in `app.css` (a belt's colour mix `--belt-*`), the numbers drawn in code are `EDGE` in `theme.ts` (a bus's most strands, a live edge's opacity, the pulse's radius, sound's ripple, a meter's flash). Which colour a live edge takes is one rule, `liveColour` in `src/ui/edgeStyle.ts`.
- **What travels along an edge** (`PAYLOAD` in `theme.ts`): the one speed (px a second), how often it is redrawn, a wave's height and length, a run's width, a level's ribbon, a bead's and a tick's size ([graph.md](graph.md)).
- There is one theme, dark (`color-scheme: dark`); colours are checked against its surfaces.
- The chrome itself is muted and neutral, so what sounds and what you act on shine: nodes at rest are quieter and less coloured, sounding ones full with a soft glow.
- **Motion** is subtle: a melody's wheel eases into a turn, a hub value that changes pops once, the sheet rises in — and none of it with reduced motion.
- **Layout**: on a phone, Graph and Code are full-size views switched by tabs; on a wide screen they sit side by side ([graph.md](graph.md)).

## Colour rules

A colour says what something is or carries; where another value would mean nothing different, it is white ([decision 036](../decisions/036-one-value-is-white.md)).

| what | colour | made by |
|---|---|---|
| a pitch (a step, a note, a CV of pitch) | its pitch class's hue on its grid (C red, D yellow, G light blue …); by its octave, full in the fourth (C4 … B4), darker below, brighter above | `noteHsl`, `noteColour` (theme.ts), `palette('pitch')` |
| an accidental | striped: its own colour and its natural's | `CellGlyph` |
| a 0 that means nothing but *now* (a section's clock, a reel's motor, a groove of one drum) | white, `--unit` | `blank` (layout/cellview.ts), checked by `tools/probe/colours.test.ts` |
| any other value | a pitch's colour, always (a 0 that is a pitch is red: C) | as a pitch |
| a level (an envelope, a gain, `lpf=`) | one neutral hue, lighter the higher | `LEVEL`, `palette('level')` |
| a clock's tick (sync) | the meter's levels: `--meter-0` (`--clock`, white) the bar's first … `--meter-3` the finest | `palette('sync')`, app.css |
| sound (audio) | its fundamental's hue on its grid, as bright as it is loud | `SOUND`, `palette('audio')` |
| pitch or sound on several grids | neutral | `palette` (no grid) |
| a selector's part k of n (a tap's bulb, a barrel's ring) | `partColour(k, n)`, round the colour wheel; one part alone white | theme.ts |
| a wheel in a section: its ticks, its hand, its name's border | its section's tint (`tapTint`), the border half-strength at rest | `nodeSections` (ui/sections.ts), `--section` (CellNode, CellGlyph) |
| a selector's table of taps on the strip | each value its section's tint | `tapTintRgb`, TowerStrips |
| a selector's strands, its selection's bus | the part's colour through the white clock, `tapTint` | theme.ts |
| a tag's wash | the tint of the section whose tap steps its cells; else a hue of its own | `Graph.svelte` (`tagSections`, ui/sections.ts) |
| an out (the tower layout): its socket's meter, its spire and light, its share of the strip's sum | its source's note now (its base stopped), by octave; drums and noise white | `noteOf`, `outRgb` (ui/heard.ts) |
| the sky and the strip's rainbow | each semitone band its note's colour by octave, muted | `TowerSky.svelte`, `TowerStrips.svelte` |
| the time view's notes and waterfall | **a hue a voice** (golden angle), not its note: not aligned with the graph yet (open, docs/notes/tower-sky.md) | `voiceHues` (layout/timelayers.ts) |
| the time view's scalogram | three signals added: breaks red, entries green, density blue | `TIME` (theme.ts) |
| what you act on | the accent, gold | `--accent` |
| a state (off, unrouted, idle, live) | the same colour, dimmer or brighter, not another | `--edge-*` (app.css), edges.css |
