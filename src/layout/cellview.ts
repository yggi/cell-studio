/**
 * What a cell looks like, independent of SVG: either a *grid* (the entries of
 * a table placed on one lap of the grid below — scales, keys, meters) or a
 * *braid* (slots in time — melodies). Angles are in turns, 0 = 12 o'clock.
 */
import { adsrOf, entries, period, positionHue,
  positionOctave, resolvePitch, semitones, shiftedUnits, type CompileResult, type Shifts } from '../engine/compile';
import { effectiveShow, type Named, type Show } from './show';
import { NOTE_NAMES, mod, modeName, pitchHue } from '../theory/modes';
import { playedCells } from '../engine/clocking';
import { flatten } from '../engine/flatten';
import { resolveIn } from '../engine/compile';

/**
 * Drawn as a grid (entries placed on the grid below) only when it's looked
 * through — a table, key, scale or meter. Anything played (an out() term or
 * spliced into one) or voiced is drawn as a braid: its steps in time, with
 * a hand while it plays — whatever its shape, even a single `0`.
 */
function drawnAsGrid(result: CompileResult, name: string): boolean {
  const c = result.cells.get(name)!;
  if (c.voice) return false;
  if (c.root || c.scan) return true;
  return isGrid(result, name) && !playedCells(result).has(name);
}

export type Fill =
  | { kind: 'pitch'; hue: number; octave?: number; alter?: number }
  | { kind: 'rest' }
  | { kind: 'ref' }
  | { kind: 'beat'; down: boolean }
  /** show=levels: a volume's level, 0 … 1 — drawn as a bar of that height. */
  | { kind: 'level'; v: number };

export interface Segment {
  readonly t0: number;
  readonly t1: number;
  /** Table entry (grid) or unit (braid) this segment shows. */
  readonly index: number;
  /** Concentric bands, innermost first (chords have several). */
  readonly bands: readonly Fill[];
  /** The notes the bands sound, for naming them (show=notes, do …). */
  readonly notes?: readonly Named[];
}

export interface CellView {
  /** curve: an envelope (show=adsr) — drawn as its shape, not as steps; matrix: a selector's barrel. */
  readonly mode: 'grid' | 'braid' | 'curve' | 'matrix' | 'lfo';
  /** An oscillation (show=lfo): its values over one cycle, 0 … 1 from its lowest to its highest. */
  readonly wave?: readonly number[];
  /** A selector's barrel (show=matrix): how many parts (rings), and which each step picks. */
  readonly matrix?: { readonly rows: number; readonly steps: readonly { readonly t0: number; readonly t1: number; readonly index: number; readonly rows: ReadonlySet<number> }[] };
  /** The envelope, for mode curve: attack decay sustain release. */
  readonly curve?: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number };
  /** How it's shown (show=, inherited or inferred). */
  readonly show?: Show;
  /** A naming convention for it (notes:flats, do:fixed). */
  readonly conv?: string;
  readonly segments: readonly Segment[];
  /** Grid lap (slots per turn) for drawing ticks; braid: steps. */
  readonly ticks: number;
  /** How many detents one full turn of the rim has. */
  readonly detents: number;
}

const pitchFill = (result: CompileResult, cell: string, value: number, alter: number, shifts: Shifts): Fill => {
  const r = resolvePitch(result, cell, value, alter, shifts);
  return { kind: 'pitch', hue: positionHue(result, r.root, r.position), octave: positionOctave(result, r.root, r.position), alter };
};

/** A plain ascending list of numbers within one lap reads as a set on a grid. */
export function isGrid(result: CompileResult, name: string): boolean {
  const c = result.cells.get(name)!;
  if (c.root || c.scan) return true;
  const vals: number[] = [];
  for (const u of c.units) {
    if (u.atom.kind !== 'note' || u.repeat !== 1 || u.subdivide !== 1 || u.elongate !== 1) return false;
    vals.push(u.atom.value + u.atom.alter);
  }
  return vals.every((v, i) => i === 0 || v > vals[i - 1]) && vals[vals.length - 1] - vals[0] < period(result, name);
}

export function cellView(result: CompileResult, name: string, shifts: Shifts, isMeter: boolean): CellView {
  const c = result.cells.get(name)!;
  const shift = shifts(name);
  const eff = effectiveShow(result, name);
  const show = eff.show;
  const conv = eff.conv;
  // an envelope, shown as one: its curve
  if (show === 'adsr') {
    const env = adsrOf(c);
    if (env) return { mode: 'curve', segments: [], ticks: 0, detents: 1, curve: env, show, conv };
  }
  // an oscillation, shown as one: its value round the ring (a glide slopes, a held step stays level)
  if (show === 'lfo') {
    const values = lfoValues(result, name, shifts);
    if (values) return { mode: 'lfo', segments: [], ticks: 0, detents: 1, show, conv, wave: values.wave };
  }
  // a selector, shown as a barrel: a ring per part, a pin where a step picks it
  if (show === 'matrix') {
    const rows = result.cells.get(c.over!)?.units.length ?? 1;
    const events = flatten(result, name, shifts, null, undefined, 0, c.context);
    const total = Math.max(1, ...events.map((e) => e.step + e.duration));
    const byStep = new Map<number, { t0: number; t1: number; rows: Set<number> }>();
    for (const e of events) {
      const k = e.step.toFixed(6);
      let g = byStep.get(+k);
      if (!g) byStep.set(+k, (g = { t0: e.step / total, t1: (e.step + e.duration) / total, rows: new Set() }));
      g.rows.add(((Math.round(e.value + e.alter) % rows) + rows) % rows);
    }
    const steps = [...byStep.values()].sort((a, b) => a.t0 - b.t0).map((g, index) => ({ ...g, index }));
    return { mode: 'matrix', segments: [], ticks: Math.round(total), detents: Math.max(1, c.units.length), show, conv, matrix: { rows, steps } };
  }
  const pattern = show === 'pattern';
  // show=levels: each step a bar, its height the level (decibels converted)
  const levels = show === 'levels';
  const levelOf = (v: number) => (c.map?.kind === 'db' ? Math.pow(10, v / 20) : Math.max(0, Math.min(1, v)));
  const named = (table: string | null, tableShift: number, value: number, alter: number): Named => {
    try {
      const r = table === null ? resolvePitch(result, name, value, alter, shifts) : resolveIn(result, table, tableShift, value, alter, shifts);
      return { semis: semitones(result, r.root, r.position), value, alter, lap: table ? period(result, table) : period(result, name) };
    } catch {
      return { semis: 0, value, alter, lap: 12 };
    }
  };

  if (c.mix || c.sink) {
    // a mix: one slice per voice; the sound card: one per channel
    const k = c.mix ? c.mix.length : c.units.length;
    const segments = Array.from({ length: k }, (_, index) => ({ t0: index / k, t1: (index + 1) / k, index, bands: [{ kind: 'ref' } as Fill] }));
    return { mode: 'grid', segments, ticks: k, detents: 1 };
  }

  if (c.kit) {
    const k = c.units.length;
    const segments = c.units.map((_, index) => ({ t0: index / k, t1: (index + 1) / k, index, bands: [{ kind: 'ref' } as Fill] }));
    return { mode: 'grid', segments, ticks: k, detents: k };
  }

  if (drawnAsGrid(result, name)) {
    const lap = period(result, name);
    const es = c.root ? Array.from({ length: c.cycle }, (_, i) => ({ value: i + shift, alter: 0 })) : entries(result, name, shift);
    const placed = es
      .map((e, index) => ({ index, t: mod(e.value + e.alter, lap) / lap, e }))
      .sort((a, b) => a.t - b.t || a.index - b.index);
    const segments = placed.map((p, i) => {
      const next = placed[(i + 1) % placed.length];
      const t1 = i + 1 < placed.length ? next.t : next.t + 1;
      const fill: Fill = isMeter || pattern
        ? { kind: 'beat', down: p.index === 0 }
        : c.root
          ? { kind: 'pitch', hue: positionHue(result, name, p.e.value), octave: positionOctave(result, name, p.e.value) }
          : pitchFill(result, name, p.e.value, p.e.alter, shifts);
      const notes = c.root ? [{ semis: semitones(result, name, p.e.value), value: p.e.value, alter: 0, lap }] : [named(null, 0, p.e.value, p.e.alter)];
      return { t0: p.t, t1: placed.length === 1 ? p.t + 1 : t1, index: p.index, bands: [fill], notes };
    });
    return { mode: 'grid', segments, ticks: lap, detents: Math.max(1, es.length), show, conv };
  }

  // braid: what it plays in time. &refs are expanded all the way down, so a
  // cell made of motifs carries the motifs' colours (read through its own table).
  const units = shiftedUnits(result, name, shift);
  const total = Math.max(1, c.steps);
  // unit boundaries, to tell which written step a segment belongs to
  const bounds: number[] = [];
  {
    let at = 0;
    for (const u of units) {
      bounds.push(at);
      const unit = u.atom.kind === 'ref' ? (result.cells.get(u.atom.name)?.steps ?? 1) : 1;
      at += unit * u.elongate * u.repeat;
    }
  }
  const unitAt = (step: number) => {
    let i = 0;
    while (i + 1 < bounds.length && bounds[i + 1] <= step + 1e-9) i++;
    return i;
  };
  let events: ReturnType<typeof flatten> = [];
  try {
    events = flatten(result, name, shifts, null, undefined, 0, c.context);
  } catch {
    events = [];
  }
  const groups = new Map<string, { step: number; duration: number; fills: { v: number; f: Fill; n: Named }[] }>();
  // (a long braid says the same few notes over and over: each is resolved once, for these shifts)
  const seen = new Map<string, { f: Fill; n: Named }>();
  for (const e of events) {
    const key = `${e.step.toFixed(6)}|${e.duration.toFixed(6)}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { step: e.step, duration: e.duration, fills: [] }));
    const known = `${e.table}|${e.tableShift}|${e.value}|${e.alter}|${e.transpose ?? 0}`;
    let hit = seen.get(known);
    if (!hit) {
      const found = resolveIn(result, e.table, e.tableShift, e.value, e.alter, shifts);
      const r = e.transpose ? { ...found, position: found.position + e.transpose } : found; // ^n
      const f: Fill = levels
        ? { kind: 'level', v: levelOf(e.value + e.alter) }
        : pattern
          ? { kind: 'beat', down: false }
          : { kind: 'pitch', hue: positionHue(result, r.root, r.position), octave: positionOctave(result, r.root, r.position), alter: e.alter };
      seen.set(known, (hit = { f, n: { semis: semitones(result, r.root, r.position), value: e.value, alter: e.alter, lap: period(result, e.table) } }));
    }
    g.fills.push({ v: e.value + e.alter, f: hit.f, n: hit.n });
  }
  const segments: Segment[] = [];
  let cursor = 0;
  const rest = (from: number, to: number) => {
    if (to - from > 1e-9) segments.push({ t0: from / total, t1: to / total, index: unitAt(from), bands: [{ kind: 'rest' }] });
  };
  for (const g of [...groups.values()].sort((a, b) => a.step - b.step)) {
    rest(cursor, g.step);
    const sorted = g.fills.sort((a, b) => a.v - b.v);
    segments.push({ t0: g.step / total, t1: (g.step + g.duration) / total, index: unitAt(g.step), bands: sorted.map((x) => x.f), notes: sorted.map((x) => x.n) });
    cursor = Math.max(cursor, g.step + g.duration);
  }
  rest(cursor, total);
  return { mode: 'braid', segments, ticks: total, detents: Math.max(1, units.length), show, conv };
}

/** Text for the hub. */
export function hubLabel(
  result: CompileResult,
  name: string,
  shifts: Shifts,
  isMeter: boolean,
  bar: number | null,
): { big: string; small: string } {
  const c = result.cells.get(name)!;
  if (c.root) {
    // a grid: its steps, and its period when it isn't the octave (to 5:1, to 3:2)
    const period = c.map?.kind === 'edo' ? c.map.period : 2;
    if (period === 2) return { big: String(c.cycle), small: 'grid' };
    let ratio = String(+period.toFixed(3));
    for (let d = 1; d <= 12; d++)
      if (Math.abs(period * d - Math.round(period * d)) < 1e-9) {
        ratio = `${Math.round(period * d)}:${d}`;
        break;
      }
    return { big: String(c.cycle), small: `to ${ratio}` };
  }
  if (c.kit) return { big: String(c.units.length), small: 'voices' };
  if (c.mix && c.sink) {
    const clock = result.clocks.get(name);
    const rate = clock ? clock.perSecond / Math.max(1, c.steps) : 0;
    return { big: c.units.length === 2 ? 'L R' : String(c.mix.length), small: rate ? `${+(rate / 1000).toFixed(1)}k` : 'out' };
  }
  if (c.mix) return { big: String(c.mix.length), small: c.mix.length === 1 ? 'voice' : 'voices' };
  if (c.sink) {
    const clock = result.clocks.get(name);
    const rate = clock ? clock.perSecond / Math.max(1, c.steps) : 0;
    return { big: c.units.length === 2 ? 'L R' : 'mono', small: rate ? `${+(rate / 1000).toFixed(1)}k` : 'out' };
  }
  if (isMeter) {
    // (a meter of levels counts its beats — * and + — not its steps)
    const beats = c.leveled ? c.units.filter((u) => u.atom.kind === 'note' && u.atom.value <= 1).length : (c.scan?.steps.length ?? c.units.length);
    const sig = `${beats}/bar`;
    // at rest: its tempo (beats a minute); playing: the bar it's in
    const bpm = Math.round(((result.clocks.get(name)?.perSecond ?? 0) * 60) / c.beat);
    return bar === null ? (bpm ? { big: String(bpm), small: `bpm, ${sig}` } : { big: sig, small: 'meter' }) : { big: String(bar + 1), small: sig };
  }
  const show = effectiveShow(result, name).show;
  if (show === 'lfo') {
    const v = lfoValues(result, name, shifts);
    if (v) return { big: v.rate, small: v.swing };
  }
  if (show === 'matrix') return { big: String(c.steps), small: c.steps === 1 ? 'section' : 'sections' }; // (as played: [..]!2 is two)
  if (show === 'adsr') {
    const env = adsrOf(c);
    if (env) return { big: 'env', small: `${env.attack} ${env.decay} ${env.sustain} ${env.release}` };
  }
  const es = entries(result, name, shifts(name));
  if (drawnAsGrid(result, name) && es.length > 0 && (show === 'scale' || show === 'mode' || show === 'key')) {
    const pitches = es.map((e) => {
      const r = resolvePitch(result, name, e.value, e.alter, shifts);
      return semitones(result, r.root, r.position);
    });
    const tonic = NOTE_NAMES[mod(Math.round(pitches[0]), 12)];
    const mode = modeName(pitches);
    if (show === 'key' || !mode) return { big: tonic, small: '' };
    // show=mode: the mode alone, major and minor by their short names
    if (show === 'mode') return { big: mode === 'Ionian' ? 'major' : mode === 'Aeolian' ? 'minor' : mode, small: `on ${tonic}` };
    return { big: mode, small: `on ${tonic}` };
  }
  if ((show === 'notes' || show === 'midi' || show === 'do' || show === 'degrees' || show === 'pattern') && !c.root)
    return { big: String(drawnAsGrid(result, name) ? es.length : c.steps), small: show }; // notes · midi · do · degrees · pattern
  if (drawnAsGrid(result, name) && es.length > 0) {
    const pitches = es.map((e) => {
      const r = resolvePitch(result, name, e.value, e.alter, shifts);
      return semitones(result, r.root, r.position);
    });
    const tonic = NOTE_NAMES[mod(Math.round(pitches[0]), 12)];
    if (es.length === 12) return { big: tonic, small: '' };
    const mode = modeName(pitches);
    if (mode) return { big: mode, small: `on ${tonic}` };
    return { big: String(es.length), small: `of ${period(result, name)}` };
  }
  return { big: String(c.steps), small: c.steps === 1 ? 'step' : 'steps' };
}


/**
 * An oscillation over one cycle: 96 samples from its lowest (0) to its highest (1);
 * its rate (Hz on a clock of its own, or how many beats of the clock it follows);
 * and its swing (±x around 0, or low–high).
 */
export function lfoValues(result: CompileResult, name: string, shifts: Shifts): { wave: number[]; rate: string; swing: string } | null {
  const c = result.cells.get(name);
  if (!c) return null;
  const events = flatten(result, name, shifts, null, undefined, 0, c.context);
  if (events.length === 0) return null;
  const total = Math.max(1e-9, ...events.map((e) => e.step + e.duration));
  const ramp = c.map?.kind === 'lin';
  const val = (e: (typeof events)[number]) => (c.map?.kind === 'db' ? Math.pow(10, (e.value + e.alter) / 20) : e.value + e.alter);
  const N = 96;
  const raw = Array.from({ length: N }, (_, i) => {
    const t = (i / N) * total;
    const k = events.findIndex((e) => t >= e.step - 1e-9 && t < e.step + e.duration - 1e-9);
    const e = events[Math.max(0, k)];
    if (!ramp) return val(e);
    const next = events[(Math.max(0, k) + 1) % events.length];
    const f = (t - e.step) / Math.max(1e-9, e.duration);
    return val(e) + (val(next) - val(e)) * f;
  });
  // (the range from its values, exactly: a peak can fall between two samples)
  const lo = Math.min(...events.map(val));
  const hi = Math.max(...events.map(val));
  const span = hi - lo || 1;
  const fmt = (x: number) => String(+x.toFixed(Math.abs(x) >= 10 ? 0 : 2));
  // its rate: a cycle per second on a clock of its own; else in beats of the clock it follows
  const clock = c.clock ? result.clocks.get(c.clock) : null;
  const perLap = c.rate > 0 ? total / c.rate : 0; // clock steps a cycle
  const rate = !clock || !perLap ? '' : c.clock === name || !clock.positional ? `${fmt(clock.perSecond / perLap)} Hz` : `${fmt(perLap)} beats`;
  const swing = Math.abs(lo + hi) < 1e-9 ? `±${fmt(hi)}` : `${fmt(lo)}–${fmt(hi)}`;
  return { wave: raw.map((x) => (x - lo) / span), rate, swing };
}
