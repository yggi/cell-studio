# Cell studio

A minimal language for music where everything is a **cell**: a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid. Write it as text or edit it as a graph: both are the same code.

Live: <https://yggi.github.io/cell-studio/>

```
&bar scan(27 23 26 24) step=84bpm
&theme over=scale(0, 2) step=&bar 0@2 2@2 4@2 5@2 ~ 7 5 4@2
&lead s=saw loop=C4 lpf=2200 decay=.3
&out loop=SAMPLE_RATE map=sample [&theme * &lead] [&theme * &lead]
```

    npm install
    npm run dev       # vite
    npm test          # vitest (pure TS: theory, parser, compiler, realize, layout, docs)
    npm run check     # svelte-check
    npm run lint      # ESLint; npm run format fixes the style (Prettier)
    npm run build     # dist/: the app as a PWA (installable, works offline after the first visit)

## Documentation

Start with [docs/MEMORY.md](docs/MEMORY.md); [docs/INDEX.md](docs/INDEX.md) is the full list.

- [The language](docs/language/overview.md) — cells, braids, time, tuning, mixes, sound
- [Examples](docs/examples.md) — the pieces that ship with the app
- [The interface](docs/ui/graph.md) — graph, editor, library
- [Architecture](docs/architecture.md), [testing](docs/testing.md), [known limits](docs/limits.md), [roadmap](docs/roadmap.md)

Open work is tracked in the [issues](https://github.com/yggi/cell-studio/issues).

## Changes

Changes are listed in [CHANGELOG.md](CHANGELOG.md): add a line under *Unreleased* in the PR that makes them. To release, bump `version` in `package.json`, move the entries under a new heading, and tag `vX.Y.Z`.
