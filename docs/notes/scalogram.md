# The rhythm scalogram (a probe)

Date: 2026-10-10 · Status: open (an open-minded probe; nothing in the app) · Issue: [#286](https://github.com/yggi/cell-studio/issues/286) · The idea: [multiscale.md](multiscale.md), leads 7 and 9

The question: a continuous wavelet transform of the piece's **notes** (not its audio) shows the levels you can hear, as a picture over time [Todd 1994; Smith & Honing 2008]. Set against the cells' spans on the tower (`towerSpans`) and the piece's sections (`sections`), does it show the levels the code writes, the ones it doesn't, and the form? And what should an onset be worth? This first pass looks rather than decides.

## Method

- `tools/probe/scalogram.test.ts` (the `probe` skill; skipped in `npm test`):
  - **One length of each piece**, as the transport has it (`mainLength(pieceTime(…))`, `src/engine/duration.ts`): the whole piece if it ends, one cycle if it loops (a longest layer when the cycle passes half an hour), 5 to 12 its day (86 400 s).
  - **Short pieces are left out**: those under 16 s (`SHORTEST=`), where a third of the length is a bar or two. That is 42 of the 75 examples.
  - **The notes** come from `eventsBetween(plan(…))`, in the code's seconds, with the `free()` controls at their written values.
  - **Four signals**, each note put down as a small Gaussian at its exact time (not rounded to a sample: at a long piece's few samples a second, rounding aliases):
    - **impulses**: each note an impulse of its gain.
    - **envelope**: each note held for its length.
    - **voices**: impulses per voice, the powers summed.
    - **change**: an impulse only where a voice moves to a new pitch (weighed by the interval) or enters after a rest.
  - **Sampling**: 50 a second, fewer for a long piece (at most 2¹⁸ samples: a day at 3 a second).
  - **The transform**: a complex Morlet (ω₀ = 6, 12 periods an octave), from 1/16 s (a long piece: 8 samples) to a third of the length, computed with FFTs. That takes about 1 s for a short piece and about 70 s for a day.
  - **Output**: the peaks of each signal's mean over time against the cells' steps and turns, and JSON for the pictures, with the piece's `sections` repeated over a cycle.
  - **Options**: `LENGTH=` and `RATE=` override the length and the sample rate (to compare a long piece's few samples a second with 50).
- `tools/probe/scalogram-sheets.mjs` draws:
  - one sheet per piece, with the four signals, each signal's mean, the cells' spans named, the sections as white lines, and the notes;
  - or the library as a contact sheet, one signal per sheet.

  Fast is at the top, as on the tower. `NORM=row` sets each period against its own mean over time, so a level shows where it is louder than usual. The veil is the window's edges (twice the wavelet's reach).

```
PROBE=out.txt SHEETS=json/ [ONLY=pop,fiveto12] [TAG=arrangement] [COLUMNS=240] npx vitest run tools/probe/scalogram.test.ts
NORM=row node tools/probe/scalogram-sheets.mjs json/ pics/                 # a sheet a piece
NORM=row node tools/probe/scalogram-sheets.mjs json/ pics/ contact change  # the library, one signal
```

(In a cloud session where Playwright's pinned shell isn't installed: `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.)

## Pictures

The 33 pieces of 16 s or more, one length each, the **change** signal. Blue ticks at the left are the cells' steps, grey ticks their turns; white lines are the sections:

![the library, change](scalogram-library-change.jpg)

The arrangements: Hypercell, Cellscape, Korobeiniki, Pop. Then 5 to 12's day, BWV 847 and Phase:

![Hypercell](scalogram-hypercell.jpg)
![Cellscape](scalogram-cellscape.jpg)
![Korobeiniki](scalogram-korobeiniki.jpg)
![Pop](scalogram-pop.jpg)
![5 to 12](scalogram-fiveto12.jpg)
![BWV 847](scalogram-bwv847.jpg)
![Phase](scalogram-phase.jpg)

## What it shows (by eye, then the numbers)

1. **Meter as bands, form as cones.**
   - A steady loop is horizontal bands at its levels, the same all the way across.
   - A change of section is a cone: power at every period converging on the moment it happens, the slower the period the wider the cone. This is the wavelet transform's picture of a singularity (its modulus maxima) [Mallat & Hwang 1992].
   - So the form doesn't need a ridge of its own to be seen; its boundaries are the cones' apexes.
2. **In the arrangements, the cones sit on the sections.**
   - Hypercell's intro, groove, build, drop, break and out are the clearest. Each boundary has a cone, and the size of the cone depends on the kind of boundary and the signal:
     - in **change**, the biggest cones are at the drops after a build;
     - in **envelope**, they are at the breaks, where the notes stop.
   - Cellscape's five rounds of twelve scenes repeat as five arches, the cones inside each round on its scenes.
   - Korobeiniki's B sections are a different texture between 2 and 8 s.
   - Pop's cones are at its sections, where the drums drop out and stop.
   - The arrangements are the richest source: their sections give the cones something to be checked against.
3. **5 to 12, a day.**
   - Its twelve two-hour blocks (a mode each) show as cones and bright patches at periods of about 17 minutes, near the block lines.
   - A dotted band at a few minutes runs through the whole day, most clearly in **change**. That is probably its ten-minute keys, which no cell writes: the law computes them.
   - Below that, its bar and the bell's groupings (0.71 s steps; about 1.7, 3.5 and 7.1 s) are steady.
   - `daytime` looks the same.
4. **What one cycle can't show.** *Phase*'s drift between its two pianos is its whole cycle (100 s): one cycle shows one swell of the 1.3 s level, not a level of its own. Seeing the drift as a level takes several cycles. The loop is the slowest level, and a window of one loop can't hold it.
5. **Each signal sees something different.**
   - **envelope** is blind to legato (a line of held notes is a constant), but makes breaks the loudest thing.
   - **voices** finds levels lost where voices interfere.
   - **change** has the fewest false fast levels and shows melody, keys and phasing; a drone gives nothing.
6. **The numbers.** These are the peaks of each signal's mean over time, over the 33 pieces of 16 s or more. A peak is on a cell within 1/6 octave of its step or turn; a harmonic is a peak at ½ or ⅓ of a peak that is on a cell.

   | signal | peaks | on a cell | a harmonic | at ≥ 4 s |
   | -------- | ----- | --------- | ---------- | -------- |
   | impulses | 133   | 68        | 39         | 10       |
   | envelope | 161   | 43        | 18         | 59       |
   | voices   | 150   | 80        | 38         | 22       |
   | change   | 160   | 79        | 40         | 17       |

   The mean over time is the wrong summary for the form: averaged, a cone is spread thin. The form needs the cones found in time, not peaks in the mean.
7. **An alias that wasn't.** In the day, peaks at 3.5 and 7.5 s first looked like aliasing (3 samples a second against a 0.71 s pulse). The same ten minutes at 50 a second have bumps there too, below the peak threshold, so they are the bell's groupings. The Gaussians stay, because rounding to so few samples would alias.

## What is next (nothing decided)

- **Find the cones**: maxima chained across periods down to their apex, a time and a strength for each. Set them against `sections` in the arrangements and 5 to 12's blocks and keys, as a table: is a cone a written boundary, and is a written boundary a cone? Which signal finds which kind of boundary?
- **Ridges in time**, not peaks in the mean: a level that holds for part of the piece (Pop's drums, BWV 847's prelude against its fugue).
- **Loops longer than one cycle**, where the loop itself is the question (Phase): two or three cycles.
- **What an onset is worth** stays open. The pictures suggest not choosing one: impulses or voices for the meter, change for melody, keys and phasing, the cones of any of them for the form.

## References

Todd, N. P. McA. (1994), *The auditory "primal sketch": a multiscale model of rhythmic grouping*, J. New Music Research 23. Smith, L. M. & Honing, H. (2008), *Time-frequency representation of musical rhythm by continuous wavelets*, J. Mathematics and Music 2(2). Torrence, C. & Compo, G. P. (1998), *A practical guide to wavelet analysis*, BAMS 79 (the Morlet, the cone of influence). Liu, Liang & Weisberg (2007), *Rectification of the bias in the wavelet power spectrum*, J. Atmos. Oceanic Tech. 24. Mallat, S. & Hwang, W. L. (1992), *Singularity detection and processing with wavelets*, IEEE Trans. Inf. Theory 38 (cones of maxima).
