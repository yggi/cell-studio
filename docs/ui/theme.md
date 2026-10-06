# Theme

Where the colours, sizes and motion come from.

- **One place**: the variables at the top of `src/app.css` (surfaces, ink, accent, status, the note rainbow, radii, spacing, type sizes, shadows); components use those names only.
- Colours computed in code (note fills in SVG) come from `src/ui/theme.ts`, which mirrors the note settings.
- **The palette is the note rainbow** — C red, D yellow, G light blue … — in the notes and spectra, and in the chrome: the title, the active tab, Play's rim while playing.
- The chrome itself is muted and neutral, so what sounds and what you act on shine: nodes at rest are quieter and less coloured, sounding ones full with a soft glow.
- **Motion** is subtle: a melody's wheel eases into a turn, a hub value that changes pops once, the sheet rises in — and none of it with reduced motion.
- **Layout**: on a phone, Graph and Code are full-size views switched by tabs; on a wide screen they sit side by side ([graph.md](graph.md)).
