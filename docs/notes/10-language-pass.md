# The language pass: more with less, on top of Strudel

Date: 2026-10-12 · Status: open (proposals; nothing in the language changed) · Issue: [#10](https://github.com/yggi/cell-studio/issues/10); the pass's threads are [#337](https://github.com/yggi/cell-studio/issues/337) (Strudel), [#179](https://github.com/yggi/cell-studio/issues/179) (operators), [#151](https://github.com/yggi/cell-studio/issues/151) (canonical forms)

The owner's brief: another pass over the language itself (#10, #179, #250, the scalogram work). Aim for a language that can say more with fewer forms. Consolidate the issues. Don't force decisions: follow the invariants first. Align with Strudel and dough where possible, because cells sits on top of them as TypeScript sits on JavaScript.

Read from `main` at 7d4b4b6. Three reads went into it:
- every open language issue and its comments, with its claims re-run on `main`;
- Strudel's and dough's source (the mini-notation grammar `krill.pegjs`, `controls.mjs`, `dough.h`);
- the scalogram and multiscale notes.

## 1. The invariants, already decided

These answer most of what is open, so they come first. Every row below says which one it follows from.

| | invariant | where it is decided |
|---|---|---|
| I1 | The text is the one source of truth; a graph edit rewrites a line. | [architecture.md](../architecture.md), AGENTS.md |
| I2 | One meaning per spelling. Several spellings may mean the same thing, but one of them is canonical and the tools write it (Shorten while writing, Normalise over a corpus). | roadmap target 3, [decision 017](../decisions/017-shorten-and-normalise.md) |
| I3 | Nothing fails silently. | roadmap target 4 |
| I4 | A cell's sort comes from its own line, never from where it is written; `+` and `*` commute. | [decision 006](../decisions/006-mix-algebra.md) |
| I5 | `$` is the absolute frame; unmarked is relative. | decisions [012](../decisions/012-picks-are-taps.md), [015](../decisions/015-caret-is-degrees.md) |
| I6 | A named form defines the meaning; an operator is its shorthand. | [#179](https://github.com/yggi/cell-studio/issues/179) |
| I7 | Every port has a band (sync, CV, audio); its units, and whether it can move, follow from the band. | [notes/nets.md](nets.md) (the model); [#150](https://github.com/yggi/cell-studio/issues/150) (building it) |
| I8 | The examples sound the same; anything that could change a saved piece is the owner's call. | AGENTS.md, roadmap target 5 |

**Proposed I9 (the owner's to accept): cells is a superset of Strudel's mini-notation.** Where a step form is spelled as in Strudel, it means what it means in Strudel. Cells adds to that (cells, tables, the helix, sorts, nets): the "types" on top. It never gives a Strudel spelling another meaning. This is the TypeScript rule: valid JavaScript is valid TypeScript with the same meaning. I9 says nothing about Strudel's method chains or its global `cps`, which are another model, not a spelling. Sound parameter names extend I9 to dough and Strudel: a name they share with cells means the same, and their aliases may be read, with Normalise writing one spelling (I2).

## 2. Where cells stands against Strudel and dough

Details and sources: [#337](https://github.com/yggi/cell-studio/issues/337). Checked in source: Strudel `main` 2026-10-12, dough f926606. What dough is today: Felix Roos' C/WASM synth (`dough-synth`), an optional output of Strudel (`.dough()`). Strudel's default engine is still superdough. Parameter names are Strudel's `controls.mjs`; dough reads most of them.

**Same spelling, same meaning (keep):**
- step modifiers: `~`, `x!n`, `x@n`, `x*n` (a ratchet is Strudel's fast step)
- `[a, b]` chords, `[a|b|c]` choice
- `euclid` patterns (identical for every k < n ≤ 16)
- seeded chance
- `s=`, `lpf` `lpq` `hpf` `hpq` `room` `delay` `delaytime` `delayfeedback` `pan` `crush`
- `free()` ≈ `slider()`, written back into the code

**Conflicts with I9.** These are spelled as in Strudel but mean something else. Each count is over the 76 examples.

| form | cells | Strudel | examples relying on cells' meaning | cost of aligning |
|---|---|---|---|---|
| `[a b]` | a chord (the comma optional) | a subsequence: the steps squeezed into one | **0** (3 tests) | low, and it **adds** subdivision, which cells lacks |
| `euclid(k,n,r)` rotation | turns left (as Tidal) | `x(k,n,r)` turns right | **0** use the third argument | low |
| `x?p` | sounds with probability p | dropped with probability p (`degradeBy`) | 3 pieces, 9 steps with a number | a silent change for saved pieces; ⚖ owner |
| `_` | in `base=`: keep the base's step (decision 026, 1 piece) | elongate the step before it (`a _ _` = `a@3`) | 1 | cheap now, costly later; ⚖ owner |
| `x%n` (#306, a draft) | a step's own level | `{…}%n`: steps per cycle in a polymeter | 0 on `main` | **free until #306 merges**; ⚖ owner |
| `legato` (#306, a draft) | a flag: tied notes play as one, bent | a number: a note's length against its step | 0 on `main` | **free until #306 merges**; ⚖ owner |
| `step=&x*n` | **slower**: once per n | `*n` faster, `/n` slower (`fast` / `slow`) | 44 pieces | high: old and new both parse, so a saved piece can't be migrated by machine; ⚖ owner |

The last row is also a conflict inside cells: on a step `x*n` is faster (a ratchet), but on a clock `&x*n` is slower. That's one sign with two directions in the space of time, against I2. Keeping it, and documenting it next to Strudel's, is a sound choice. The cost is what the owner weighs.

**Missing, and additive under I9** (no saved piece changes; each extends the step grammar):
- `<a b c>`: one per lap, an alternation
- `x/n`: a step slowed over n laps
- `x(k,n,r)`: an inline euclid
- `scale("D:minor")`, and tonal's scale names (`minor:pentatonic`, `harmonic:minor`), beside `scale(minor, D)`
- `saw(n)` `tri(n)` `square(n)` beside `sin(n)`
- Strudel's and dough's parameter aliases (`sound` `cutoff` `resonance` `verb` `delayt` `delayfb` …) read as synonyms, with Normalise writing ours. Today they are errors (#143). Under I2 they can be read, because I2 forbids two *meanings*, not two spellings.

**Different models (keep, and say so).** These differ in model, not in spelling, so I9 doesn't touch them:
- per-cell clocks against a global `cps` (`loop=` on a meter is Strudel's cps)
- `[<<n]` climbs a lap where `early` doesn't (the slice form `&x[-1:] &x[:-1]` is `early`)
- `fm=` names a cell; `index`/`ratio` are Strudel's `fmi`/`fmh`
- loudness as products and `level=`, against `gain`/`velocity`/`postgain`
- `lpq` in Strudel's units (Q), not dough's 0–1; `distort` on another scale than dough's
- no samples

These belong in a "for Strudel users" section of [overview.md](../language/overview.md).

## 3. Less complexity: four primitives as the lens

[multiscale.md](multiscale.md#disentanglers-towards-a-minimal-grammar-10-179) proposes four primitives that may generate the language: **look up**, **dilate**, **shift with carry**, **combine** (with soft time a possible fifth). Read the open questions that way, and most of them are one family each with too many spellings, or one missing entry in a grid:

| primitive | cells today | redundancy or gap | follows from |
|---|---|---|---|
| **look up** | `over=`, a kit read by number, a gate's `play=` on a kit, a selector `over=&parts`, `map=&table`, picks `&x[i]` | the gate's `play=` and `over=` are one lookup with two spellings ([gate-example.md](gate-example.md)); one drum hit has three spellings (#10's examples pass) | I2 → #151 |
| **dilate** | `step=`, `loop=` (three meanings), `cycle(&x)`, `&x*n` `/n`, `@n`, `x*n`, `laps=` | `*` points two ways (above); no slowed step (`x/n`, Strudel's) | I2, I9 → #337, #151 |
| **shift with carry** | `shift=`, `stride=`, `[<<n]` `[>>n]`, `^n`, `^$n`, accidentals on a number | a grid of {relative, `$` absolute} × {time, degree, grid}. The missing cells: `$` on a rotation, an accidental on a reference (`&x[0]#`), a moving amount (`degree(&triad, &prog)`) | I5, I6 → #179 |
| **combine** | chords, `+` `*` in a mix, splices, `base=` overlays, groove chords | `level=` has three meanings (dB on the card, linear on a gate and on a voice in #306); section mixes are gone but nothing stops them | I2, I7 → #150 |
| *soft time* | `swing=`, `wow=`, `varispeed=`, a tape's `at=` | `swing=` does nothing on a `scan` (a warning now); the examples use a swing clock | I2 → #151 (F5) |

**The test.** Express every row of [reference.md](../language/reference.md) in the four primitives, and list what doesn't fit. The rows that fit twice are #151's families. Their canonical forms are the list Normalise writes (#244, decision 017). That gives #151 a method in place of a list of opinions.

**More power, from the same four:** subdivision `[a b]`, alternation `<a b>`, a slowed step `x/n` (dilate); the moving amount and `$` everywhere (shift with carry). Each is a gap in a grid the language already has, not a new idea.

## 4. What the scalogram says to the language

From [scalogram.md](scalogram.md) and #286. The language changes nothing by it; these are evidence and suggestions for the tools.

- **The code's levels are heard.** 73 of 75 pieces have a ridge on a cell's step or turn, and 132 of 256 ridges match a cell. Most of the rest sit at a half or a third of one (harmonics).
- **Boundaries are heard at splices.** Of the boundaries heard but not written as sections, 15 land on a braid splice, against 8.4 by chance. The splice tree is the piece's account of its phrases, so the folder (`engine/fold`) and Normalise should keep splices where they are heard.
- **Repeats are written but not heard.** No finder hears verse → verse in Pop or Hypercell: the arrangement does nothing there. That is a cue for the editor, not a language form.
- **Folds the tools could suggest** (I2, for #244; not yet checked note for note):
  - a motif at two scales is one cell at two rates (Korobeiniki, BWV 847);
  - a necklace shared by rhythm and pitch is one table, read as a clock and as a scale (5 to 12).
- **Already decided by it:** the form sends time up ([decision 016](../decisions/016-arranging-at-the-input.md)), and the gate's one `level=` ([decision 023](../decisions/023-gate-spelling.md)). The implicit `&out` was deferred by the owner ("`&out` stays").

## 5. The issues after this pass

| issue | was | now |
|---|---|---|
| #10 | the shakedown, seven questions | the language's map: the invariants, this note, the threads below |
| #337 (new) | — | Strudel and dough: the alignment table, I9, the conflicts and the additions |
| #179 | the operator pass, 5 questions | Q1–Q3 and Q5 answered by decisions 010, 012, 015; left: the shift-with-carry grid (`$` on rotation, accidentals on a reference, a moving amount), the step grammar from #337 |
| #151 | canonical forms, "written by Shorten" | the decision table, its method the four primitives; settled rows dropped; the examples pass's rows added; Normalise (#244) writes it |
| #150 | bands | unchanged; plus where loudness lives (`level=` three ways), dough's units (`lpq`, `distort`) |
| #195 | diagnostics sweep | the remaining silent cases, collected from #250 and #256 (I3, no decision needed) |
| #250 | nits and review leftovers | the language nits only; the UI, MIDI and tools leftovers in its comments moved to #338 |
| #256 → #261 | two issues on arranging | one (#261) |
| #163, #173 | diagnostics leftovers | closed: every item done, moved or accepted |
| #29 | selectors | re-scoped to what decision 016 left: `restart=` as resume, `{lap}`, a restarted part's playhead, kits that pass pitch |

## 6. Decisions for the owner, cheapest first

1. **I9**, the superset rule. Accept it, and everything additive in §2 follows with no further decision.
2. **#306's `x%n` and `legato`**: choose them against Strudel before #306 merges. After that, saved pieces carry them.
3. **`_` in `base=`**, against Strudel's elongation: one piece today.
4. **`[a b]` as a subsequence** (chords keep the comma) and **euclid's rotation**: no example relies on either, so it is the cheapest alignment that also adds power.
5. **`x?p`**: the probability of sounding or of dropping (3 pieces; a saved piece would change silently).
6. **`step=&x*n`**: keep "slower" and document it, or move to Strudel's direction with a migration (44 pieces, and saved pieces can't be told apart).
7. The rest are open as before, each on its issue:
   - where loudness lives (#150)
   - what a respelling may change: chance keyed on the voice, a kit drum and varispeed (#151)
   - whether `&>` sends are still wanted (#149)
   - FM feedback (#28)
