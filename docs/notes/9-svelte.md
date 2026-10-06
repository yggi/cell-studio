# #9, the Svelte side: a plan

2026-10-06 · open · [#9](https://github.com/yggi/cell-studio/issues/9)

What's left of #9 under `src/ui/` and `src/App.svelte`, what I found reading it, and how I'd split the work into PRs. Nothing here changes behaviour. The engine, layout and audio parts of #9 are done or tracked elsewhere (see the issue).

## Where it stands

- **The code is already Svelte 5.** Runes everywhere, no `export let`, no `$:`, no `on:` directives, no `svelte/store`, `createContext` for the graph. So this isn't a migration. The job is structure: where state lives, what components share, and how runes are used.
- **The "large components" are mostly CSS.** Lines per file:

  | file | total | script | markup | style |
  |---|---|---|---|---|
  | `Picker.svelte` | 877 | 189 | 152 | **499** |
  | `CellSheet.svelte` | 862 | 236 | 213 | **412** |
  | `App.svelte` | 718 | **362** | 92 | 263 |
  | `CellGlyph.svelte` | 637 | **392** | 95 | 144 |
  | `Graph.svelte` | 628 | **414** | 73 | 140 |
  | `MaterialNode.svelte` | 592 | **358** | 120 | 108 |
  | `Transport.svelte` | 420 | 74 | 78 | **267** |

  `Picker`, `CellSheet` and `Transport` get smaller mainly through shared styles and shared primitives. `App`, `Graph`, `CellGlyph` and `MaterialNode` need their logic moved out.

## What I found

**State: App owns everything and passes it down as props**
- `App.svelte` mixes five concerns in one script, sharing 19 `$state`s:
  - the piece: `code`, `held`, `result`, `playedResult`, `lastGood`, `program`, `shifts`, `muted`, `routed`
  - playback: `player`, `cursor`, `starting`, `played`, `touched`, `epoch`, `seek`, `toggle`, `reset`, `nudge`, `fresh`
  - the library: `saved`, `open`, `opened`, the `choice` token, `pick`, `openFile`, `saveHere`
  - the view: `tab`, `narrow`, `panelOpen`, `perf`, `message`, `focus`
  - rendering: `renderWav`
- `Graph` takes 20 props and turns them into a `GraphContext`, one getter or forwarding arrow at a time (`Graph.svelte` L100–160). Twelve of those arrows just pass `sound.*` through.
- `const sound: LiveSource` in App (L187) also re-wraps every `Player` method, only to set `touched` on three of them.
- `ctx.program` is read directly in 11 components (73 places, 24 of them in `CellSheet`). That's the coupling #85 described. #85 is closed, but this still makes every view depend on the compiler's types.

**Duplicated logic and missing shared components**
- **Labelling a `free()` value is written four times, and the copies have drifted.** It's in `CellSheet` (`freeLabel`/`freeStep`/`freeShow`), `FreePills` (`key`/`value`), `FreePanel` (`key`/`step`/`show`) and `FreeSliders` (`label`/`step`/`show`). `FreeSliders` names `gain` "gain" where the others say "level". `FreeSliders` isn't used anywhere: it's dead.
- **Dialogs:** six components declare `role="dialog"`, and each brings its own backdrop, header, close button and Escape key.
  - Only `HubEditor` uses the focus trap (`use:trap`).
  - `Picker` has its own copy of it (`holdFocus`, an attachment).
  - `CellSheet` and `EditPop` say `aria-modal="true"` but don't hold the focus.
  - The App's controls drawer is one more of the same.
- **Visibility:** the "only work while on screen" `IntersectionObserver` is written separately in `ScopeView` and `SpectrumWheel`.
- **Media queries:** `matchMedia` is read by hand in four places: `narrow` in App (with its own listener effect), reduced motion in `Picker` and `MaterialNode`, `pointer: coarse` in `Editor`. Svelte has `MediaQuery` (`svelte/reactivity`) and `prefersReducedMotion` (`svelte/motion`) for this.
- **CSS:** 32 `all: unset` button resets, four `.x`/`.close` buttons and several pills, each styled locally. `app.css` has almost no shared classes.

**Rune hygiene**
- **Effects that copy a prop into state** (`draft = name` in `CellSheet`, `text = initial` in `EditPop` and `HubEditor`): a writable `$derived` does this directly (Svelte ≥ 5.25; we're on 5.57).
- **A side effect inside a `$derived`:** `good` in App assigns `lastGood`. It works, but a derived should only compute. A `$state` written from the one place that knows the code compiled is clearer.
- **Effects that write state when something else changes:**
  - App resets `held` when the number of `free()`s changes.
  - Graph sets `selected` from `focus`.
  - Graph's layout effect (L333–398) writes `nodes`, `pinned`, `fitToken` and `selected` inside `untrack`.

  They work, but the order they run in is implicit. The layout one wants to be a class with an explicit `sync()`.
- **Dependencies listed by hand:** `void routedDrawn; void muted; …` (Graph L320), `void ctx.program` (SpectrumWheel), `void lines` (Editor).
- **Two ways to attach behaviour:** actions (`use:trap`, `use:longpress`) and attachments (`{@attach holdFocus}`) are both in use. Attachments are the Svelte 5 way: they react to their arguments and can be passed through props.
- **Dead code:** Graph's `fixed` prop (App never passes it, so `lastFixed`/`newExample` only ever runs once), and `FreeSliders.svelte`.

**Logic in components that could be pure and tested**
- `CellSheet`'s wheel model (`hueOf`, `nameOf`, `listed`, `wheelTokens`, `rotation`) works out what the wheel shows from the program. It belongs in `layout/`, beside `cellview.ts`, with tests.
- Graph's `pulseData`/`toFlowEdge` turn a `GraphEdge` into a Svelte Flow edge. That's pure, apart from reading node sizes, which can be passed in.

## Target shape

The code text stays the single source of truth. Every edit still goes through `engine/edit.ts`; the change is that one class owns `code` and is the only thing that writes it. The layering doesn't change: the new state lives in `src/ui/state/`, and `engine/`/`layout/` stay pure.

```
src/ui/state/            (.svelte.ts: classes with $state/$derived fields)
  piece.svelte.ts        Piece: code, held, result, played, program (last good), shifts, muted, routed, graph
                         edits: turn, toggle, add, rename, setFree/hold, keep, revert, edit(source)
  playback.svelte.ts     Playback: wraps Player; cursor, starting, played, touched, epoch, now, span, dirty
                         toggle, seek, reset, nudge, fresh; `sound`: the LiveSource that marks touched
  library.svelte.ts      Library: saved, open, opened, entries, currentId; pick, openFile, saveHere, remove
                         (and the library layout cache, out of Picker's module script)
  view.svelte.ts         View: tab, narrow (MediaQuery), panelOpen, perf, message, focus
  studio.ts              createContext<Studio>() — { piece, playback, library, view }
src/ui/kit/              shared components and attachments
  Dialog.svelte          backdrop, header/title snippet, close, Escape, focus trap (one a11y story)
  FreeControl.svelte     a free() as a slider / keypad / text field (sheet and drawer)
  attach.ts              trap, longpress, visible (IntersectionObserver), as attachments
src/ui/free.ts           a free() value's name, step, text (pure, tested); used by pills, panel, sheet
```

- **App.svelte** creates the four objects, provides them through `createContext`, wires the `Player` and does the layout. That's about 120 lines of script and its CSS.
- **Transport, Picker, FreePanel and Editor** read what they need from the context, not from 15–20 props each. Callbacks stay props where a component really is reusable: `Keypad`, `TokenWheel`, `EditPop`.
- **GraphContext** keeps its shape, which is a good one. Its parts:
  - `program`/`shifts`/`muted`/`routed`/`live` come from `Piece` and the live view.
  - `sound` is passed as the `LiveSource` object itself, not as twelve forwarding arrows. `GraphContext` would *have* a `sound` rather than *be* one. That's a mechanical rename at the call sites (`ctx.tapePos` → `ctx.sound.tapePos`).
  - The layout parts (`bends`, `move`) come from a `GraphLayout` class.
- **Graph.svelte** keeps the Svelte Flow markup. Its logic moves out:
  - `GraphLayout` (`ui/state/graphLayout.svelte.ts`): the `ForceLayout`, pins, petal slots, `nodes`, `bends`, `fitToken` and one `sync(model, opened)`.
  - `ui/flowedges.ts`: edges from the model, pure and tested.
  - `clusters` stays a `$derived`.
- **CellSheet** becomes a `Dialog` holding sections:
  - `SheetName` (renaming, with a writable `$derived` draft)
  - `CellPicture` (spectrum, wave, glyph, scope)
  - `BraidWheel` (wheel, step editor, hub editor; its model in `layout/`)
  - `FreeControl`s
  - `CellFacts`/connections

  The CSS goes with each part.
- **Picker** splits into `TagFilters`, `CardGrid`, `PieceDetail` (a `Dialog`) and `LibraryGraph`, which is already its own file. The layout cache moves to `Library`.

**Why classes in `.svelte.ts` and not stores:** stores (`svelte/store`) are the Svelte 4 tool. Classes with rune fields give fine-grained reactivity, plain methods and types without `$store` syntax, and they can be tested with vitest under `.svelte.ts`. **Why context and not module singletons:** the perf overlay's test opens pieces and puts the app back afterwards, and tests can mount a component with a fake `Studio`. A module singleton would make both harder. `transportClock` stays a module singleton: there is only one, and the ticker writes it.

**Performance caveat:** the per-frame cost is Svelte walking about 50 nodes' deriveds (#73, #79). Moving state into classes doesn't change how many deriveds there are, but per-node view-model objects could add some. Anything that touches the node components (`CellNode`, `CellGlyph`, `MaterialNode`, `PulseEdge`) gets a before/after with the `profile` skill.

## PRs, in order

Each PR is behaviour-preserving and can be reviewed alone. The early ones are small and unblock the rest.

1. **Shared primitives.**
   - `ui/free.ts` with tests, and `FreeControl`. Pills, panel and sheet use them; `FreeSliders` is deleted.
   - `kit/attach.ts`: `trap`, `longpress` and `visible` as attachments, replacing `use:` and `holdFocus`.
   - `Dialog`, used first by `HubEditor`, `EditPop` and the Picker's detail.
   - Use `MediaQuery`/`prefersReducedMotion` instead of reading `matchMedia` by hand.
   - User-visible effect: the dialogs that say they're modal now hold the focus, which is a small accessibility fix (CHANGELOG line). `free()` labels become the same everywhere: a `gain` reads "level". That second change only matters if `FreeSliders` comes back, since it's unused today.
2. **App state.** `Piece`, `Playback`, `Library`, `View` and the `Studio` context. App.svelte becomes composition. Transport, Picker and FreePanel read the context.
3. **Graph.**
   - `GraphLayout` class and `flowedges.ts` with tests.
   - `sound` passed as one object.
   - Drop the `fixed` prop.
   - Profile skill before and after.
4. **CellSheet.** `Dialog` with its sections; the wheel model moved to `layout/` with tests.
5. **Picker.** Its sections; the layout cache moved to `Library`.
6. **CSS.** Shared button, pill, close and sheet classes in `app.css`, with values from `app.css`/`theme.ts` only. Then the large style blocks shrink. Do it last, so it doesn't conflict with 4 and 5. Pair it with #9's ESLint/Prettier item if that format-only commit happens around the same time. `eslint-plugin-svelte` has rules for most of the rune hygiene above (`prefer-writable-derived`, `no-unused-props`, …).

Hygiene fixes (writable `$derived`, no writes in `$derived`, explicit dependencies) go into whichever PR touches the file, not a sweep of their own.

**How to verify each PR:** `npm test && npm run check`. The `wheels` contact sheet and screenshots, before and after, for 3–6. The `profile` skill for 3. The PR labelled `candidate` runs the smoke test.

## Open questions for the owner

- Context or props for Transport/Picker? Context is less wiring. Props keep them usable without the app. I'd use context, since neither is reused outside the app.
- `GraphContext` having a `sound` rather than *being* one touches every node component, but mechanically. Fine in PR 3?
- The CSS pass (6) touches most components' styles. Like the Prettier commit, it's best done with no other UI PR open.
