# Theme

Where the colours, sizes and motion come from.

- **One place**: the variables at the top of `src/app.css` (surfaces, ink, accent, status, the note rainbow, radii, spacing, type sizes, shadows); components use those names only.
- Colours computed in code (note fills in SVG) come from `src/ui/theme.ts`, which mirrors the note settings.
- **The palette is the note rainbow** — C red, D yellow, G light blue … — in the notes and spectra, and in the chrome: the title, the active tab, Play's rim while playing.
- **One palette for what flows** (`src/ui/palette.ts`, `palette(band, value, grid)`): a value and its band make the colour, never a kind of edge. Pitch: the rainbow on its grid, muted by octave (`noteColour`). Level (an envelope, a gain, `lpf=`): lightness on one neutral hue, the edge's own (`LEVEL` in `theme.ts`: 46 % at 0, 3:1 against `--bg`, to 86 % at 1). Sync: the meter's level tokens, `--meter-0` the bar's first … `--meter-3` the finest. Audio: the hue of its fundamental, as bright as it is loud (`SOUND`; the spectrum wheels' bands). No grid (a mix of voices on several grids): pitch and sound are neutral. Which grid: [graph.md](graph.md).
- **What travels along an edge** (`PAYLOAD` in `theme.ts`): the one speed (px a second), how often it is redrawn, a wave's height and length, a run's width, a level's ribbon, a bead's and a tick's size ([graph.md](graph.md)).
- There is one theme, dark (`color-scheme: dark`); colours are checked against its surfaces.
- The chrome itself is muted and neutral, so what sounds and what you act on shine: nodes at rest are quieter and less coloured, sounding ones full with a soft glow.
- **Motion** is subtle: a melody's wheel eases into a turn, a hub value that changes pops once, the sheet rises in — and none of it with reduced motion.
- **Layout**: on a phone, Graph and Code are full-size views switched by tabs; on a wide screen they sit side by side ([graph.md](graph.md)).
