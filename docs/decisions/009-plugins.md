# 009 · Plugins: a piece can carry the drawing of a `show=` of its own

**Date:** 2026-10-07 · **Status:** accepted (owner); the first step, embedded plugins, is built

## Decision

The core stays lean; what only one piece needs is a **plugin**: a block of the piece's own text that adds a `show=name`, a wheel drawn by code the piece carries. The first plugin is the sun, which moved from `src/ui/SunNode.svelte` into `examples/fiveto12.cells` (the only piece that uses it). Further steps, in order: plugins in a file of their own that pieces use, bundles of them, and a sandbox for code that isn't ours.

- **A plugin is a manifest and a drawing.** The manifest is plain data the layout reads (which kinds of cell it fits, its size, whether edges meet a rim on it, a dial, its colours); the drawing is code, run by the UI only. `engine/` and `layout/` never hold a drawing, so they stay pure TS and run in node, in the worker and at build time.
- **In the text.** `=== plugin name ===` … `=== end ===`, a JSON manifest first, then JS defining `draw(view, h, g)` (and `describe(view)` for a dial). The parser blanks the block (line numbers don't move); `show=` reads any word, and compile says when it is neither a show nor a plugin of the piece.
- **Visual only, a view of data.** `draw` gets one plain frozen `view` (a copy) (the cell's params, the piece's time, a day's law as data, the manifest's colours) and returns a tree of SVG elements as data. The host copies it into a bounded tree and draws it from allow-lists of elements, attributes, style properties and functions and owns what all wheels share: pointer and keyboard dial, ARIA, handles, the name.
- **Trust.** A piece from someone else must not run code when it opens. A plugin runs if it is the same text as one in an example that ships with the app, or if the user chose "Run it" (kept in this browser by its text, so a changed plugin asks again; kept only once it has drawn, so one that hangs is not kept; revocable). "Trusted" covers the manifest as well as the code (`pluginKey`), and a manifest's tokens must be colours: the shipped sun builds style text from them. Until then its wheel is a disc that asks, says that running it is full trust (no sandbox yet), and shows the code.
- **Colours.** A plugin's colours are in its manifest, not in `src/app.css` or `theme.ts`: the rule "theme values come from app.css and theme.ts only" holds for the app; a plugin carries its own, so the core has none for it (the sun's `--sky-*` and `--sun*` left `app.css`).
- **No built-in sun.** `show=sun` is gone from the language (it is now an error: the piece must carry the plugin). A saved copy of *5 to 12* from before has no plugin and needs the block (open the new example, or paste the block from it).

## Why

The sun was hard-wired in eight places (parser enum, layout fits, node type, edge special case, a component, theme tokens, docs), for one example. Making `show=` extensible with data (manifest) in the core and code outside it removes those, and gives other pieces the same seam. Embedding the code in the `.cells` file keeps the piece one file and the text the single source of truth; the graph's edits rewrite cell lines and never touch the block.

## Rejected

- **A declarative format (SVG template with expressions)**: safe by construction, but the sun's arcs, times and laws need real code; it would grow into a worse JS.
- **Svelte components as plugins**: they need the Svelte compiler at runtime.
- **Running foreign code unasked**: opening a shared file would run its author's code. Trust by text, and later a Worker sandbox, instead.

## Consequences

- A user-visible change: `show=sun` needs the plugin. **Saved pieces:** a `.cells` file that says `show=sun` without the block now has a compile error; the fix is the block from *5 to 12* (`examples/fiveto12.cells`).
- Not yet: a plugin from a file of its own or a bundle (the next step; saving a piece to a file will embed the plugins it uses); the Worker sandbox and a consent flow for pieces from outside (today: a button on the wheel); plugins in the node editor's `show=` picker; editor highlighting inside a block.
