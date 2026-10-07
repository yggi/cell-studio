/**
 * One palette (docs/notes/nets.md, #34): a value and the band it travels in make a colour, and nothing else does —
 * kinds of edge have no colour of their own. The band sets the stroke (dotted, solid, rippling: edges.css), the width
 * the strands, the value the colour:
 *  - pitch (CV): the pitch-class rainbow on its grid (noteColour), muted by octave;
 *  - level (CV: an envelope, a gain, lpf=): lightness on one neutral hue (theme.ts LEVEL);
 *  - sync: the meter's levels (app.css --meter-0 the bar … --meter-3 the finest), the tick's;
 *  - audio: the hue of its fundamental on its grid, as bright as it is loud (theme.ts SOUND).
 * The grid is what the colours follow: a voice's, or a mix's by the owner's rule (layout/show.ts heardGrid); null when
 * it hears several (no one rule): then pitch and sound are neutral. Pure; the numbers are theme.ts's.
 */
import { LEVEL, noteHsl, octaveMute, SOUND } from './theme';

export type Band = 'pitch' | 'level' | 'sync' | 'audio';

/** A grid, as the palette reads it: steps to its period (12 on the usual grid). */
export interface PaletteGrid {
  readonly cycle: number;
}

/** Sound: its fundamental as a position on the grid (null: none, or several), and how loud, 0 … 1. */
interface Sound {
  readonly position: number | null;
  readonly loud: number;
}

/** What each band's value is: a position on the grid (pitch), 0 … 1 (level), the tick's level 0 … 3 (sync), a sound. */
interface Values {
  pitch: number;
  level: number;
  sync: number;
  audio: Sound;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** A position on a grid: its hue (a rainbow per period) and its octave (0 … cycle inclusive the natural range; ±3 at most). */
function place(position: number, grid: PaletteGrid): { hue: number; octave: number } {
  const p = Math.round(position);
  const n = Math.max(1, grid.cycle);
  return { hue: (mod(p, n) / n) * 360, octave: clamp(p === n ? 0 : Math.floor(p / n), -3, 3) };
}

const neutral = (level: number): [number, number, number] => [LEVEL.hue, LEVEL.s, LEVEL.l0 + (LEVEL.l1 - LEVEL.l0) * clamp(level, 0, 1)];

/** The palette's colour as hue (degrees), saturation and lightness (%) — every band but sync, which is a theme token. */
export function paletteHsl<B extends Exclude<Band, 'sync'>>(band: B, value: Values[B], grid: PaletteGrid | null = null): [number, number, number] {
  if (band === 'level') return neutral(value as number);
  if (band === 'pitch') {
    if (!grid) return neutral(0.5);
    const { hue, octave } = place(value as number, grid);
    return noteHsl(hue, false, octave);
  }
  const { position, loud } = value as Sound;
  const t = clamp(loud, 0, 1);
  const at = position !== null && grid ? place(position, grid) : null;
  const o = at?.octave ?? 0;
  const l = clamp(SOUND.l0 + (SOUND.l1 - SOUND.l0) * t + o * SOUND.octave * t, SOUND.lo, SOUND.hi);
  return at ? [at.hue, SOUND.s * octaveMute(o), l] : [LEVEL.hue, LEVEL.s, l];
}

/** The colour of a value in its band, on its grid (pitch and audio; null: several grids, neutral). */
export function palette<B extends Band>(band: B, value: Values[B], grid: PaletteGrid | null = null): string {
  if (band === 'sync') return `var(--meter-${clamp(Math.round(value as number), 0, 3)})`;
  const [h, s, l] = paletteHsl(band as Exclude<Band, 'sync'>, value as Values[Exclude<Band, 'sync'>], grid);
  return `hsl(${+h.toFixed(2)} ${Math.round(s)}% ${Math.round(l)}%)`;
}
