# The folder: notes into cells by scale-invariant tools (#307, step 4)

Date: 2026-10-12 · Status: open (a first set of tools; the ratchet's numbers say what's next) · Issues: #307, #234

The owner's direction: don't grow Shorten into a monolith; split it into an architecture, running recursively,
mirroring #234's reading of a piece as a MERA (disentanglers and isometries), a collection of scale-invariant tools.
Shorten stays what it is (a linter over the text, its suggestions in the panel). The **folder** is `src/engine/fold/`,
a pipeline from notes to cells: a reader, a set of tools, a printer, a judge.

## The architecture

- **The reader** (`engine/midiimport.ts`): a MIDI file's notes on the coarsest grid, as lines of chords (`ir.ts`: `Line`).
- **The disentangler** (`transpose.ts`): each chord written against its own lowest pitch, a shape and a base: a
  shift with carry, so a figure and the same a fifth up are one key at two bases, and neighbours across a block's edge
  compare as shapes.
- **The isometries**, each one move that is the same at every scale:
  - `dilate.ts`: a line whose lengths all share a factor goes on a clock that much slower (`step=&tempo*2`); a
    symbol two lines share then plays at each one's clock: a phrase at two speeds is one cell.
  - `figure.ts`: a look-up. A run of blocks alike in rhythm and in each note's place in its own chord (the chord in
    the order the figure first plays it) is one figure read over a table of chords, stepped a block at a time. Only
    where the harmony moves (a chord that stays is a repeat), and only where it pays.
  - `pairs.ts`: Re-Pair [Larsson & Moffat 2000]: the commonest pair of neighbours (as shapes, the second's base against
    the first's) becomes a symbol, again and again: motifs, phrases, sections, the form, each level built by the
    same move from the one below. This is the recursion.
- **β** (`beta.ts`, #234's α and β): a symbol that costs more written once and named at each use than written out
  goes back in place, each place weighed by how often in a row it is played there. The description length judges.
- **The printer** (`print.ts`): symbols as cells (`&m3^$5`), runs as `x!n`, figures as `&figure1` over `&chords1` (every
  chord written out: a table counts entries, and `x!n` or `x@n` in one is one entry), each line on its clock.
- **The driver** (`index.ts`): the tools in order (dilate, figure, pairs, β), round after round while the printed piece
  gets shorter. **The judge** (`midiimport.ts`): a fold is taken only if it plays the same notes as the flat piece and
  is shorter.

A tool is a function `Folded → Folded | null` (`ir.ts`: `Tool`); a new one is a file and a place in the list.

## What it does (the ratchet, `tools/probe/ratchet.test.ts`; [ratchet.md](ratchet.md) has the baseline)

**73 pieces through MIDI: the scores 26,931 characters written, 198,100 flat; `shortenAll` 60,810 (226 % of
written, 30 s); the folder 55,645 (207 %, 2.8 s). Phrases back 52 of 185 either way. Notes kept by 63 either way (the
10 others lose them in the MIDI path, before folding).**

- **BWV 847**: the prelude comes back as the hand example writes it, both hands one figure over their chord tables:
  `&figure1 0 1 2 1 3 1 2 1`, `&chords1 step=&tempo*16 [12,3,2,0] [8,5,4,0] …` (its `&rhShapes`), `&run1 over=&chords1
  &figure1!48` (its `&rhFigure`), the same for the left hand. Its score 3,746 (`shortenAll` 4,240), phrases back 5 of 39
  (1), in 0.25 s (6.2 s).
- **Far better** than `shortenAll` where pieces repeat across lines: Brothers 914 (4,811), Royal 11,764 (13,527), IDM
  1,229 (2,736; one of the pieces whose notes the MIDI path already changed), Sailor 426 (1,105). Close on Pachelbel 928
  (836).
- **Still behind** on Cellscape 3,053 (1,676), Korobeiniki 1,885 (909), Zell 1,310 (705), Hypercell 1,817 (1,360):
  arrangements whose parts come back transposed and at other places, where `shortenAll`'s phrases of 4 to 16 tokens
  with `^$k` win over Re-Pair's binary symbols.

## What was tried and left out (measured on seven pieces)

- **Repeats as a tool of their own** (a block k times in a row, `&r!k`), before pairs: Pachelbel 3,309 → 7,951,
  Cellscape 8,012 → 10,381: a long repeat found first in one line hides the same phrase from the other lines. After
  pairs it found nothing; short blocks only (≤ 16 tokens, 3 times or more) helped Pop a little and Cellscape not.
  Pairs finds the runs once figures leave them alone.
- **No pair of a token with itself** (runs left to the printer): Cellscape 4,047 → 5,005, the seven pieces 30,150 →
  30,932 (whole files, characters): left out.
- **A figure wherever blocks are alike**: Cellscape's arpeggio over one chord eight times became tables padded with
  hundreds of `0`s; the rule that the harmony must move took Pachelbel 3,245 → 1,485 and Cellscape 8,956 → 5,005 (whole files).

## Next (step 5 and after)

- **The subject**: the fugue's entries are phrases of 20 notes, some bent (a tonal answer, one note changed). An
  approximate match (a phrase and a few notes that differ, written as the phrase and a patch) is a disentangler that
  isn't there yet.
- **Phrases with `^$k` at their right length**: Re-Pair's symbols are binary; a phrase of five is three symbols. A
  tool that, after pairs, flattens a chain of symbols used only together into one cell (β inside out) would give the
  phrase its own cell, as `shortenAll` does.
- **Dilation inside a line** (a phrase at half speed among others) needs a way to splice a cell at another rate.
- **Sections** (cutting a line where the time engine hears boundaries) for reading, not for size.
- The folder in a worker: 2.8 s for the library, 1 s for Cellscape on the main thread when converting.
