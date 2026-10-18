/**
 * What a cell's wheel (ui/CellGlyph.svelte) draws, as numbers and SVG paths: its segments' bands, a braid's bulbs and
 * the names on them, the steps' labels and the sheet's tokens, a selector's barrel, a table's hub, taps, marker and
 * sieve, the ticks, which steps are lit, the playhead, an LFO's cycle. Each is a function of the cell's view
 * (`cellView`), the wheel's geometry (`wheelGeometry`) and, while it plays, a primitive or two of the live state; the
 * colours (and anything else that reads the theme) are the component's. Angles are in turns, 0 = 12 o'clock.
 */
import type { CompileResult, ResolvedCell } from '@yggi/cells/engine/program';
import { mod, modeBrightness } from '@yggi/cells/theory/modes';
import { swungTurn, type CellView, type Fill, type Segment } from './cellview';
import { BORDER, border } from './coarse';
import { fitFont } from './dial';
import { polar, ringSegment } from './geometry';
import { names, noteLabel } from './show';
import { ribbon, stepOn, trackAt, type Laid, type Track } from './track';
import type { WheelGeometry } from './wheel';

const EPS = 1e-9;
/** A point on the wheel. */
interface XY {
  readonly x: number;
  readonly y: number;
}
/** A mark from (x1, y1) to (x2, y2). */
interface Line {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const ringMid = (g: WheelGeometry) => (g.rInner + g.rOuter) / 2;

/** What every name in a table of sections ends in (`&hatsBar`, `&kickBar` …: `Bar`), leaving each at least two letters of its own. */
export function sectionSuffix(refs: readonly string[]): string {
  const first = refs[0];
  if (first === undefined) return '';
  let k = 0;
  while (refs.every((n) => n.length > k + 2 && n[n.length - 1 - k] === first[first.length - 1 - k])) k++;
  return k ? first.slice(-k) : '';
}

/** A section's name on its bulb: less the suffix all of them share. */
const sectionName = (n: string, suffix: string) => (suffix ? n.slice(0, -suffix.length) : n);

interface BulbLabel {
  readonly L: Laid;
  /** A net-ref's dotted outline, round its stretch of the track. */
  readonly outline: string | null;
  readonly text: string;
  /** Its label and laps (×2). */
  readonly sub: string;
  /** The font that fits its hub; null: none does at BULB_MIN, and its name goes round its rim (`rim`). */
  readonly font: number | null;
  /**
   * Its name round the bulb's outer rim (#137, #274: a name that doesn't fit inside), when it doesn't fit: the arc's path,
   * over the top from low left to low right, and the font. Null when it fits inside, or has no name.
   */
  readonly rim: { readonly d: string; readonly font: number } | null;
}

/** The smallest a name is drawn inside its bulb (px); smaller, it goes round the rim. */
const BULB_MIN = 7;

/** The arc a bulb's name runs along, round its outer rim (radius r about c): 240° over the top, read left to right. */
export function rimArc(c: readonly [number, number], r: number): string {
  const at = (deg: number) => [c[0] + r * Math.cos((deg * Math.PI) / 180), c[1] - r * Math.sin((deg * Math.PI) / 180)].map((v) => v.toFixed(1)).join(' ');
  return `M ${at(210)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 1 ${at(-30)}`;
}

/**
 * Each bulb on a braid's track, depth first: its outline when it is a net-ref, its name at its hub (a section's less the
 * suffix all share, `sectionsTable`; an unnamed cell's none), its label and laps under it.
 */
export function bulbLabels(result: CompileResult, track: Track | null, sectionsTable: boolean, suffix: string): BulbLabel[] {
  const out: BulbLabel[] = [];
  const walk = (list: readonly Laid[]) => {
    for (const L of list) {
      const b = L.bulb;
      const lambda = !!result.cells.get(b.name)?.lambda;
      const text = lambda ? '' : sectionsTable ? sectionName(b.name, suffix) : `&${b.name}`;
      const sub = [b.label, b.laps > 1 ? `×${b.laps}` : ''].filter(Boolean).join(' ');
      const room = 2 * Math.max(4, L.rho - L.w / 2) * 0.9;
      const font = fitFont(room, Math.max(2, text.length, sub.length), 13, BULB_MIN);
      // (round the rim, outside: as large as a small inside name, just clear of the ring)
      const rimFont = Math.max(BULB_MIN, Math.min(11, L.rho * 0.55));
      out.push({
        L,
        outline: b.hollow && track ? ribbon(track, L.T0, L.T1, 0, 1, 1.5) : null,
        text,
        sub,
        font,
        rim: font === null && text ? { d: rimArc(L.C, L.rho + L.w / 2 + 2 + rimFont * 0.3), font: rimFont } : null,
      });
      walk(L.bulbs);
    }
  };
  walk(track?.bulbs ?? []);
  return out;
}

/**
 * show=notes, midi, do, degrees: each step named on the ring where it has room (11 px), along the track on one; `wide`
 * its share of the ring. None when the sheet labels the steps with its tokens.
 */
export function stepLabels(
  view: CellView,
  track: Track | null,
  g: WheelGeometry,
  frame: { readonly base: number; readonly tonic: number },
  tokens: readonly string[] | undefined,
): { x: number; y: number; text: string; wide: number }[] {
  const show = view.show;
  if (tokens?.length || !show || !names(show)) return [];
  const r = ringMid(g);
  return view.segments.flatMap((sg) => {
    const n = sg.notes?.[sg.notes.length - 1];
    if (!n) return [];
    // a label where its step has room for it (long braids: the longer steps); on a track, along it
    const on = track ? stepOn(track, sg.t0, sg.t1) : null;
    if (track && !on) return [];
    const ends = track && on ? ([trackAt(track, on.tau0).p, trackAt(track, on.tau1).p] as const) : null;
    const span = ends ? Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]) : (sg.t1 - sg.t0) * 2 * Math.PI * r;
    if (span < 11) return [];
    const text = noteLabel(show, n, frame.base, frame.tonic, view.conv);
    if (!text) return [];
    const [x, y] = track && on ? trackAt(track, (on.tau0 + on.tau1) / 2).p : polar(g.c, g.c, r, (sg.t0 + sg.t1) / 2);
    return [{ x, y, text, wide: span / (2 * Math.PI * r) }];
  });
}

/**
 * The sheet: each written step's span on the ring (its segments, as turned) and its token there — a splice's at its
 * bulb's hub, a step on a track along it. `units`: how many steps the compiled cell has (the text can be a step ahead
 * of it: then none, or two steps would share a token); `shift` the shift as drawn.
 */
export function stepUnits(
  view: CellView,
  tokens: readonly string[] | undefined,
  units: number | undefined,
  shift: number,
  track: Track | null,
  g: WheelGeometry,
): { written: number; x: number; y: number; text: string; font: number; d: string }[] {
  if (!tokens?.length || (view.mode !== 'braid' && view.mode !== 'grid')) return [];
  const n = tokens.length;
  if (n !== units) return [];
  const { c, rInner, rOuter } = g;
  const spans = new Map<number, { t0: number; t1: number }>();
  for (const sg of view.segments) {
    const sp = spans.get(sg.index);
    spans.set(sg.index, sp ? { t0: Math.min(sp.t0, sg.t0), t1: Math.max(sp.t1, sg.t1) } : { t0: sg.t0, t1: sg.t1 });
  }
  const r = ringMid(g);
  return [...spans].map(([index, sp]) => {
    const written = mod(index + shift, n);
    const text = tokens[written] ?? '';
    // (a splice: its token at its bulb's hub)
    const L = track?.bulbs.find((x) => Math.abs(x.bulb.t0 - sp.t0) < 1e-6 && Math.abs(x.bulb.t1 - sp.t1) < 1e-6);
    if (L && track) {
      const font = Math.max(7, fitFont(2 * (L.rho - L.w / 2) * 0.9, Math.max(2, text.length), 15, 0) ?? 7);
      return { written, x: L.C[0], y: L.C[1] + font * 1.2, text, font, d: ribbon(track, L.T0, L.T1) };
    }
    // (a step on a track: its stretch of it)
    const on = track ? stepOn(track, sp.t0, sp.t1) : null;
    if (on && track) {
      const [x, y] = trackAt(track, (on.tau0 + on.tau1) / 2).p;
      const font = Math.max(7, fitFont((rOuter - rInner) * 0.9, Math.max(2, text.length), 15, 0) ?? 7);
      return { written, x, y, text, font, d: ribbon(track, on.tau0, on.tau1) };
    }
    const [x, y] = polar(c, c, r, (sp.t0 + sp.t1) / 2);
    const font = Math.max(7, fitFont(Math.min((sp.t1 - sp.t0) * Math.PI * (rInner + rOuter), rOuter - rInner) * 0.9, Math.max(2, text.length), 15, 0) ?? 7);
    return { written, x, y, text, font, d: ringSegment(c, c, rInner, rOuter, sp.t0, sp.t1) };
  });
}

/** show=matrix: a selector's barrel — a ring per part (`row` of `rows`), a pin where a step picks it (`on`). */
export function barrelPins(view: CellView, g: WheelGeometry): { d: string; on: boolean; step: number; row: number; rows: number }[] {
  if (view.mode !== 'matrix' || !view.matrix) return [];
  const { rows, steps } = view.matrix;
  const { c, rInner, rOuter } = g;
  const band = (rOuter - rInner) / Math.max(1, rows);
  return steps.flatMap((st, step) =>
    Array.from({ length: rows }, (_, k) => ({
      d: ringSegment(c, c, rInner + k * band + 0.8, rInner + (k + 1) * band - 0.8, st.t0 + 0.004, st.t1 - 0.004),
      on: st.rows.has(k),
      step,
      row: k,
      rows,
    })),
  );
}

/** The barrel's section under the playhead (`hand`, turns); -1: none, or not playing. */
export function barrelNow(view: CellView, hand: number | null): number {
  if (view.mode !== 'matrix' || !view.matrix || hand === null) return -1;
  return view.matrix.steps.findIndex((st) => hand >= st.t0 - EPS && hand < st.t1 - EPS);
}

const levelOf = (f: Fill | undefined) => (f?.kind === 'level' ? f.v : -1);

/**
 * Whether two segments are laid out alike: the same times, band counts and levels (which note is where, a turn's
 * change, is the fills', not the layout's).
 */
const sameLayout = (a: Segment, b: Segment) =>
  a.t0 === b.t0 &&
  a.t1 === b.t1 &&
  a.bands.length === b.bands.length &&
  a.bands.every((f, j) => (f.kind === 'level') === (b.bands[j]?.kind === 'level') && levelOf(f) === levelOf(b.bands[j]));

/**
 * A segment's bands as paths: concentric on the ring (a level a bar from the inner ring, as tall as the level); on a
 * track along it, the ring and its bulbs one curve (in a bulb's later lap none: it is drawn once, on its first).
 */
export function segmentPaths(s: Segment, g: WheelGeometry, track: Track | null): string[] {
  if (track) {
    const on = stepOn(track, s.t0, s.t1);
    return on ? s.bands.map((_, j) => ribbon(track, on.tau0, on.tau1, j, s.bands.length)) : [];
  }
  const { c, rInner, rOuter } = g;
  const band = (rOuter - rInner) / s.bands.length;
  return s.bands.map((f, j) =>
    f.kind === 'level'
      ? ringSegment(c, c, rInner, rInner + Math.max(0.04, f.v) * (rOuter - rInner), s.t0, s.t1)
      : ringSegment(c, c, rInner + j * band, rInner + (j + 1) * band, s.t0, s.t1),
  );
}

/**
 * The border between segments (a stroke in the disc's colour): 1.5 px, as ever. On a wheel the cap merged
 * (`merged`) it would eat most of a segment (2.25° is ~3 px at the rim), so there it tapers with the segment's width:
 * none under 2.5°, full from 6° (`border`, long steps keep theirs).
 */
export const borderOf = (s: Segment, merged: boolean) => (merged ? border(s.t1 - s.t0) : BORDER);

/** A segment as drawn: its bands' paths and its border's width. */
interface Slot {
  readonly d: readonly string[];
  readonly w: number;
}

/**
 * The segments' paths, kept from one view to the next while their layout is the same (#41). What a glyph draws is
 * two things that change at different rates: where each band goes (`d`) depends on the segments' times, band counts
 * and levels, not on which note is where (a table turning leaves it as it was); the fills are what a turn changes.
 * So while the layout (`key`, and each segment by `sameLayout`) is the same, `slots` returns the very same array, and
 * nothing downstream even looks at it; a changed segment alone is laid out again.
 */
export class SlotCache {
  private laid: { key: string; segments: readonly Segment[]; slots: readonly Slot[] } | null = null;

  slots(key: string, segments: readonly Segment[], lay: (s: Segment) => Slot): readonly Slot[] {
    const before = this.laid && this.laid.key === key ? this.laid : null;
    let changed = !before || before.segments.length !== segments.length;
    const slots = segments.map((s, i) => {
      const old = before?.segments[i];
      const kept = before?.slots[i];
      if (old && kept && sameLayout(old, s)) return kept;
      changed = true;
      return lay(s);
    });
    if (before && !changed) {
      this.laid = { ...before, segments }; // (the same drawing, for these segments)
      return before.slots;
    }
    this.laid = { key, segments, slots };
    return slots;
  }
}

/**
 * show=brightness: each degree of a table shaded by the mode that starts on it (0 darkest … 1 brightest:
 * `modeBrightness`); null when not shown so.
 */
export function brightnessOf(view: CellView): number[] | null {
  if (view.show !== 'brightness' || view.mode !== 'grid' || view.ticks < 2) return null;
  const lap = view.ticks;
  return modeBrightness(
    view.segments.map((sg) => Math.round((sg.at ?? sg.t0) * lap)),
    lap,
  );
}

/**
 * A table of sections (decision 016): each section a ring round its bulb, in its part's colour on the selector's barrel (`part`
 * of `parts`), `on` while the selector has it on (`lit`, by segment).
 */
export function sectionRings(bulbs: readonly BulbLabel[], view: CellView, parts: number, lit: ReadonlySet<number>): { L: Laid; part: number; parts: number; on: boolean }[] {
  return bulbs.map((b, i) => ({ L: b.L, part: view.segments[i]?.index ?? i, parts, on: lit.has(i) }));
}

/**
 * While it plays, a hand from the hub's edge across each section that is on, over the hub where it overlaps it; it stops
 * at the ring's inside, so that its name stays clear.
 */
export function sectionCursors(rings: readonly { readonly L: Laid; readonly on: boolean }[], g: WheelGeometry): string[] {
  const c = g.c;
  return rings.flatMap((t) => {
    if (!t.on) return [];
    const [dx, dy] = [t.L.C[0] - c, t.L.C[1] - c];
    const l = Math.hypot(dx, dy) || 1;
    const [r0, r1] = [g.rHub, l - t.L.rho + t.L.w / 2];
    return [`M ${c + (dx / l) * r0} ${c + (dy / l) * r0} L ${c + (dx / l) * r1} ${c + (dy / l) * r1}`];
  });
}

/** A table's hub that selects: the ring inside it the slots coming in take. */
export const hubRingOf = (g: WheelGeometry) => ({ r0: g.rHub * 0.58, r1: g.rHub * 0.86 });

/** The hub's slots, on its ring: the ones the table takes `held`. */
export function hubSlots(view: CellView, g: WheelGeometry): { d: string; fill: Fill; held: boolean }[] {
  const ring = hubRingOf(g);
  return view.hub?.slots.map((sl) => ({ d: ringSegment(g.c, g.c, ring.r0, ring.r1, sl.t0 + 0.003, sl.t1 - 0.003), fill: sl.fill, held: sl.held })) ?? [];
}

/** The hub's gear: a wire from each slot taken out to its entry on the ring. */
export function hubGears(view: CellView, g: WheelGeometry): { d: string; fill: Fill }[] {
  const { c, rInner } = g;
  const ring = hubRingOf(g);
  return (
    view.hub?.gears.map((gr) => {
      const [x1, y1] = polar(c, c, ring.r1, gr.from);
      const [qx, qy] = polar(c, c, (ring.r1 + rInner) / 2, (gr.from + gr.to + (Math.abs(gr.to - gr.from) > 0.5 ? 1 : 0)) / 2);
      const [x2, y2] = polar(c, c, rInner, gr.to);
      return { d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`, fill: gr.fill };
    }) ?? []
  );
}

/** The taps: where each entry leaves the wheel, on a ring of their own outside it, in its entry's fill (null: none). */
export function tapDots(view: CellView, g: WheelGeometry): { x: number; y: number; fill: Fill | null }[] {
  return (view.taps ?? []).map((t, i) => {
    const [x, y] = polar(g.c, g.c, g.rTap, t);
    const sg = view.segments.find((s) => s.index === i);
    return { x, y, fill: sg?.bands[0] ?? null };
  });
}

/** The marker: fixed at 12 o'clock, over the first entry (a table's always; a braid's once it is turned, `shift`). */
export function markerOf(view: CellView, shift: number, g: WheelGeometry, size: number): string | null {
  if (!(view.mode === 'grid' && view.taps) && !(view.mode === 'braid' && shift !== 0)) return null;
  const { c, rOuter, margin } = g;
  const w = Math.max(4, size * 0.05);
  const tip = c - rOuter + 1;
  const top = c - rOuter - margin - w * 0.6;
  return `M${c - w * 0.7},${top} L${c + w * 0.7},${top} L${c},${tip} Z`;
}

/** A table's first entry, under the marker: its outline. */
export function firstOf(view: CellView, g: WheelGeometry): string | null {
  if (!view.taps) return null;
  const sg = view.segments.find((s) => s.index === 0);
  return sg ? ringSegment(g.c, g.c, g.rInner, g.rOuter, sg.t0, sg.t1) : null;
}

/**
 * What space the wheel is drawn in: a table, scale, key or grid is laid out by pitch (`pitch`); a braid by time
 * (`time`: its rim a clock, a tick a step). A meter, a curve, an LFO, a barrel, an unpitched cell: their own (null).
 */
export function spaceOf(view: CellView, isMeter: boolean): 'pitch' | 'time' | null {
  if (isMeter || !view.segments.some((sg) => sg.bands[0]?.kind === 'pitch')) return null;
  return view.mode === 'grid' ? 'pitch' : view.mode === 'braid' ? 'time' : null;
}

/**
 * The sieve: a table's wedge is bright for its own step of the grid; the steps it leaves out, to its next entry, dark
 * (show=equal: every entry the same width, nothing to sieve).
 */
export function sieveOf(view: CellView, space: 'pitch' | 'time' | null, g: WheelGeometry): string[] {
  if (space !== 'pitch' || view.ticks < 2 || view.show === 'equal') return [];
  const step = 1 / view.ticks;
  return view.segments.filter((sg) => sg.t1 - sg.t0 > step * 1.01).map((sg) => ringSegment(g.c, g.c, g.rInner, g.rOuter, sg.t0 + step, sg.t1));
}

/** A braid's rim as a clock: a tick a step (up to 64), the first and every fourth long; none on a track. */
export function clockTicks(view: CellView, space: 'pitch' | 'time' | null, track: Track | null, g: WheelGeometry): (Line & { long: boolean })[] {
  if (space !== 'time' || view.ticks > 64 || track) return [];
  return Array.from({ length: view.ticks }, (_, i) => {
    const long = i === 0 || (view.ticks % 4 === 0 && i % 4 === 0);
    const [x1, y1] = polar(g.c, g.c, g.tick.r0, i / view.ticks);
    const [x2, y2] = polar(g.c, g.c, g.tick.r1 + (long ? 2.5 * g.k : 0), i / view.ticks);
    return { x1, y1, x2, y2, long };
  });
}

/** The plain ticks of a wheel drawn in a space of its own (up to 48; a table of sections none). */
export function plainTicks(view: CellView, space: 'pitch' | 'time' | null, sectionsTable: boolean, g: WheelGeometry): Line[] {
  if (space !== null || view.ticks > 48 || sectionsTable) return [];
  return Array.from({ length: view.ticks }, (_, i) => {
    const [x1, y1] = polar(g.c, g.c, g.tick.r0, i / view.ticks);
    const [x2, y2] = polar(g.c, g.c, g.tick.r1, i / view.ticks);
    return { x1, y1, x2, y2 };
  });
}

/**
 * Which segments of a table of sections are lit: the sections its selector has on now (`nodes`: the lit nodes' ids). As a key
 * (`1,3`), so that the set is made again only when it changes, not every tick.
 */
export function litSections(view: CellView, cell: ResolvedCell | undefined, nodes: ReadonlySet<string> | undefined): string {
  const on: number[] = [];
  view.segments.forEach((s, i) => {
    const u = cell?.units[s.index];
    if (u?.atom.kind === 'ref' && nodes?.has(`cell:${u.atom.name}`)) on.push(i);
  });
  return on.join(',');
}

/**
 * Which segments of a braid are lit: the ones under its playhead (`at()`, turns; null: not playing). A key, as
 * `litSections`. (`at` is read only of a braid: a wheel that has no playhead does not depend on it.)
 */
export function litSteps(view: CellView, at: () => number | null): string {
  if (view.mode !== 'braid') return '';
  const t = at();
  if (t === null) return '';
  const on: number[] = [];
  view.segments.forEach((s, i) => {
    if (t >= s.t0 - EPS && t < s.t1 - EPS) on.push(i);
  });
  return on.join(',');
}

/** A key of `litSections` or `litSteps` as a set of segments. */
export const litSet = (key: string): Set<number> => new Set(key ? key.split(',').map(Number) : []);

/** A table's entries being read now (`entries`, a key: `0,4`), as the segments they are (not a braid's: none). */
export function accessedOf(view: CellView, entries: string): Set<number> {
  const set = new Set<number>();
  if (view.mode === 'braid') return set;
  const k = view.detents;
  for (const e of entries ? entries.split(',').map(Number) : [])
    view.segments.forEach((s, i) => {
      if (s.index === mod(e, k)) set.add(i);
    });
  return set;
}

/** Where a table's entry being read is marked: a dot in it, like a read head. */
export function readAt(sg: Segment, g: WheelGeometry): XY {
  const [x, y] = polar(g.c, g.c, g.rInner + (g.rOuter - g.rInner) * 0.22, sg.at ?? (sg.t0 + sg.t1) / 2);
  return { x, y };
}

/**
 * The playhead, in turns: a braid's, a selector's barrel's (`local()` steps into its lap of `lap`); null: none. (Read
 * only of those: a wheel that has no playhead does not depend on where it would be.)
 */
export function handOf(view: CellView, local: () => number | null, lap: number): number | null {
  if (view.mode !== 'braid' && view.mode !== 'matrix') return null;
  const at = local();
  if (at == null) return null;
  // (a swung meter's hand goes through its steps where they are played, as its segments sit)
  return view.swung ? swungTurn(view.swung, at / lap) : at / lap;
}

/** show=lfo's radius for a value (0 … 1) between the ring's edges. */
const lfoRadius = (g: WheelGeometry, v: number) => g.rInner + (g.rOuter - g.rInner) * (0.12 + 0.76 * v);

/** show=lfo: one cycle round the ring, its value the radius. */
export function lfoPathOf(view: CellView, g: WheelGeometry): string | null {
  if (view.mode !== 'lfo' || !view.wave) return null;
  const w = view.wave;
  return (
    w
      .map((v, i) => {
        const [x, y] = polar(g.c, g.c, lfoRadius(g, v), i / w.length);
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + 'Z'
  );
}

/** show=lfo, while it plays: a dot at its phase (`local()` steps into its cycle of `steps`; read only of an LFO). */
export function lfoDotOf(view: CellView, local: () => number | null, steps: number, g: WheelGeometry): XY | null {
  if (view.mode !== 'lfo' || !view.wave) return null;
  const at = local();
  if (at == null) return null;
  const t = at / Math.max(1e-9, steps);
  const w = view.wave;
  const v = w[Math.floor((((t % 1) + 1) % 1) * w.length) % w.length] ?? 0;
  const [x, y] = polar(g.c, g.c, lfoRadius(g, v), t);
  return { x, y };
}

/** A meter's beats, numbered (up to 16, from 64 px). */
export function beatLabels(view: CellView, isMeter: boolean, size: number, g: WheelGeometry): (XY & { text: string })[] {
  if (!isMeter || view.mode !== 'grid' || view.segments.length > 16 || size < 64) return [];
  const r = ringMid(g);
  return view.segments.map((sg, i) => {
    const [x, y] = polar(g.c, g.c, r, (sg.t0 + sg.t1) / 2);
    return { x, y, text: String(i + 1) };
  });
}
