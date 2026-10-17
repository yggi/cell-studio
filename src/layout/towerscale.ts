/**
 * The tower's scale (#440): one vertical axis for every view that draws the tower — the graph's tower layout and its
 * strip, the time view — so the same structure stands at the same height in each, decoded from two sides (the graph
 * across its topology, the time view across time). From the bottom its strata: the constant (a band of its own, off
 * the scale: tables nothing steps), the slow, the pulse, the neutral zone (off the scale too: the rows of the gates,
 * the voices and the mixers, inserted at 20 Hz), the audible, the card. Each part of the scale is even, a decade
 * `perDecade` px; a view gives its own: the graph's `TOWER_PX` times its zoom, the time view's fitted to its height.
 * Pure: numbers in, numbers out.
 */
import { TOWER_ZONES } from './tower';
import { C0 } from './spectrum';

/** Pixels to a decade on the tower in the graph (zoom 1), the same on its strip: even, so the rainbow keeps its width. */
export const TOWER_PX = 360;
/** Where the audible begins (decades: 20 Hz), and the card (20 kHz). */
export const HEARING = Math.log10(20);
const CARD_AT = Math.log10(20000);

export type StratumName = 'constant' | 'slow' | 'pulse' | 'voices' | 'audible' | 'card';

/** A stratum: its decades (`lo` … `hi`; the neutral zone and the constant have none of their own) and where it is
 * drawn (`top` over `bottom`, y down). */
interface Stratum {
  readonly name: StratumName;
  readonly lo: number;
  readonly hi: number;
  readonly top: number;
  readonly bottom: number;
}

export interface TowerScale {
  /** Pixels to a decade. */
  readonly perDecade: number;
  /** The neutral zone's height (decades): the audible is lifted by it. */
  readonly zone: number;
  /** The strata, from the bottom. */
  readonly strata: readonly Stratum[];
  /** The y of a height on the tower (decades). */
  y(decades: number): number;
  /** The height on the tower (decades) at y; in the neutral zone, 20 Hz. */
  at(y: number): number;
}

/**
 * A scale: `perDecade` px a decade, the y of 0 decades (1 Hz) at `offset`, the neutral zone `zone` decades high; the
 * slow drawn from `from` (decades) up, the card up to `to`.
 */
export function towerScale({
  perDecade,
  offset,
  zone = 0,
  from = -8,
  to = CARD_AT,
}: {
  readonly perDecade: number;
  readonly offset: number;
  readonly zone?: number;
  readonly from?: number;
  readonly to?: number;
}): TowerScale {
  const y = (d: number) => offset - (d >= HEARING ? d + zone : d) * perDecade;
  const at = (yy: number) => {
    const v = (offset - yy) / perDecade;
    return v >= HEARING + zone ? v - zone : v >= HEARING ? HEARING : v;
  };
  const bands: Stratum[] = TOWER_ZONES.map((z, i) => {
    const lo = Math.max(from, z.from);
    const hi = Math.min(TOWER_ZONES[i + 1]?.from ?? CARD_AT, CARD_AT);
    return { name: z.name, lo, hi, top: y(hi - 1e-9), bottom: y(lo) };
  });
  if (zone > 0) bands.splice(2, 0, { name: 'voices', lo: HEARING, hi: HEARING, top: y(HEARING), bottom: y(HEARING - 1e-9) });
  if (to > CARD_AT) bands.push({ name: 'card', lo: CARD_AT, hi: to, top: y(to), bottom: y(CARD_AT) });
  return { perDecade, zone, strata: bands, y, at };
}

/** The scale with the constant's band (y) at its foot, clipping the strata it covers: where a view shows its tables. */
export function withConstant(s: TowerScale, band: { readonly top: number; readonly bottom: number }): TowerScale {
  const over = s.strata.map((x) => ({ ...x, bottom: Math.min(x.bottom, band.top) })).filter((x) => x.bottom > x.top);
  return { ...s, strata: [{ name: 'constant', lo: -Infinity, hi: -Infinity, ...band }, ...over] };
}

/** A decade as the tower names it: a period below 1 Hz (10 s, 1.7 min, 2.8 h, 1.2 d), a frequency from it. */
export function decadeLabel(d: number): string {
  const hz = 10 ** d;
  if (hz >= 1000) return `${hz / 1000} kHz`;
  if (hz >= 1) return `${hz} Hz`;
  const s = 1 / hz;
  return s >= 86400 ? `${+(s / 86400).toPrecision(2)} d` : s >= 3600 ? `${+(s / 3600).toPrecision(2)} h` : s >= 60 ? `${+(s / 60).toPrecision(2)} min` : `${s} s`;
}

/**
 * The scale's marks between `y0` and `y1` (y): in the audible, a tick a step of each decade in Hz (named at 1, 2, 5:
 * 20 Hz, 50 Hz, 1 kHz) and each C (C1 … C10); under it, each decade (named as `decadeLabel` says).
 */
export function towerTicks(s: TowerScale, y0: number, y1: number) {
  const inView = (y: number) => y >= y0 && y <= y1;
  const hz: { y: number; hz: number; named: boolean; label: string }[] = [];
  for (let d = 1; d <= 4; d++)
    for (let m = 1; m <= 9; m++) {
      const f = m * 10 ** d;
      const y = s.y(Math.log10(f));
      if (f < 20 || f > 20000 || !inView(y)) continue;
      hz.push({ y, hz: f, named: m === 1 || m === 2 || m === 5, label: f >= 1000 ? `${f / 1000} kHz` : `${f} Hz` });
    }
  const octaves: { y: number; label: string }[] = [];
  for (let n = 0; n <= 10; n++) {
    const f = C0 * 2 ** n;
    const y = s.y(Math.log10(f));
    if (f >= 20 && f <= 20000 && inView(y)) octaves.push({ y, label: `C${n}` });
  }
  const decades: { y: number; d: number; label: string }[] = [];
  for (let d = -6; d <= 1; d++) {
    const y = s.y(d);
    if (inView(y)) decades.push({ y, d, label: decadeLabel(d) });
  }
  return { hz, octaves, decades };
}
