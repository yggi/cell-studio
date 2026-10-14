# 011 · Plugins: a piece can carry the drawing of a `show=` of its own

**Date:** 2026-10-07 · **Status:** accepted (owner); the first step, embedded plugins, is built

## Decision

The core stays lean; what is not the language's own is a **plugin**: a `show=name` wheel drawn by code. The app ships a **bundle of built-in plugins** (`engine/builtinPlugins.ts` (in `@yggi/cells`); the sun is the first: it moved from `src/ui/SunNode.svelte`), and a piece can also carry one of its own as a block of its text. Further steps, in order: plugins in a file of their own that pieces use, bundles a user chooses, and a sandbox for code that isn't ours.

- **A plugin is a manifest and a drawing.** The manifest is plain data the layout reads (which kinds of cell it fits, its size, whether edges meet a rim on it, a dial, its colours); the drawing is code, run by the UI only. `engine/` and `layout/` never hold a drawing, so they stay pure TS and run in node, in the worker and at build time.
- **In the text.** `=== plugin name ===` … `=== end ===`, a JSON manifest first, then JS defining `draw(view, h, g)` (and `describe(view)` for a dial). The built-in bundle is written in the same syntax, so a bundle in a file of its own will be the same text. The parser blanks a piece's block (line numbers don't move); `show=` reads any word, and compile says when it is none of the shows, the built-in plugins, or a plugin of the piece. A piece can't write a plugin with a built-in's name.
- **A plugin draws; the code is still trusted code.** `draw` gets a frozen copy of what it may know (the cell's params, the piece's time, a day's law as data, the manifest's colours) and returns a tree of SVG elements as data. The host copies it into a bounded tree and draws it from allow-lists of elements, attributes, style properties and functions, which keeps what is *drawn* to shapes and paint, and owns what all wheels share: pointer and keyboard dial, ARIA, handles, the name. That limits the output, not the code: the drawing runs on the main thread with the page's powers, so the filter is a second line behind the trust rule, not a sandbox.
- **Trust.** A piece from someone else must not run code when it opens. A built-in plugin runs without asking (it is part of the app, and its name is taken: a piece's copy of its text is another plugin, refused). A plugin a piece carries runs only if the user chose "Run it" (kept in this browser by its text, so a changed plugin asks again; kept only once it has drawn, so one that hangs is not kept; revocable). What is chosen is the manifest as well as the code (`pluginKey`), and a manifest's tokens must be colours: a drawing builds style text from them. Until then its wheel is a disc that asks, says that running it is full trust (no sandbox yet), and shows the code.
- **Colours.** A plugin's colours are in its manifest, not in `src/app.css` or `theme.ts`: the rule "theme values come from app.css and theme.ts only" holds for the app; a plugin carries its own, so the core has none for it (the sun's `--sky-*` and `--sun*` left `app.css`).
- **The sun stays built in.** It is in tutorial and example pieces (*Clock time*, *5 to 12*) that should not each carry its code; a bundle of the app's own plugins is where such wheels live, and every piece can name them. (An earlier step of this work had the sun inline in the examples; two examples wanted it, so it became the first of the bundle.)

## Why

The sun was hard-wired in eight places (parser enum, layout fits, node type, edge special case, a component, theme tokens, docs), for what is one kind of wheel. Making `show=` extensible with data (manifest) in the core and code outside it removes those, and gives other pieces the same seam. Embedding the code in the `.cells` file keeps the piece one file and the text the single source of truth; the graph's edits rewrite cell lines and never touch the block.

## Rejected

- **A declarative format (SVG template with expressions)**: safe by construction, but the sun's arcs, times and laws need real code; it would grow into a worse JS.
- **Svelte components as plugins**: they need the Svelte compiler at runtime.
- **Running foreign code unasked**: opening a shared file would run its author's code. Trust by text, and later a Worker sandbox, instead.

## Consequences

- No change to saved pieces: `show=sun` works as before. A piece can't write its own plugin named like a built-in (`sun`), and `SHOWS` no longer lists it (the reference lists built-in plugins beside it).
- Not yet: a plugin from a file of its own or a bundle (the next step; saving a piece to a file will embed the plugins it uses); the Worker sandbox and a consent flow for pieces from outside (today: a button on the wheel); plugins in the node editor's `show=` picker; editor highlighting inside a block.
