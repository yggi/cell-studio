/**
 * A braid's track (#221): its ring, and a bulb for each cell it splices. The spliced unit bends out of the ring and
 * back, its own steps along it in time; a splice inside it is a bulb on it, so one rule covers any depth. A cell spliced
 * here only is drawn solid (it has no node of its own: engine/graph.ts, `bulbs`); one read elsewhere too, a net-ref, is
 * drawn hollow, its edge coming in to its hub. The ring and its bulbs are one smooth closed curve, time along it.
 * Pure geometry: CellGlyph draws it, the layout leaves it room.
 */
import { codeShifts, type CompileResult, type Shifts } from '../engine/program';
import { shiftedUnits } from '../engine/helix';
import { stepsOf } from '../engine/flatten';
import { wheelGeometry } from './wheel';

/** A splice on a track, in the host's time. */
export interface Bulb {
  /** Its span on the host's loop, in turns. */
  readonly t0: number;
  readonly t1: number;
  /** The cell it splices. */
  readonly name: string;
  /** A net-ref: read elsewhere too, so its own wheel is elsewhere and its edge comes in here. */
  readonly hollow: boolean;
  /** The net-ref it shows (its own name, or the one splice it is made of), whose edge comes in here; null: solid. */
  readonly net: string | null;
  /** How many times round it goes in its span (`&x!2`, `&x*2`). */
  readonly laps: number;
  /** What the ref does to it, as written (`+1`, `^7`, `inverse`), or ''. */
  readonly label: string;
  /** The splices in its first lap. */
  readonly bulbs: readonly Bulb[];
}

const MAX_DEPTH = 6;

/** How a ref changes what it splices, written short: inverse, a degree up or down, a transposition. */
function refLabel(a: { readonly transpose?: number; readonly values?: { readonly mul: number; readonly add: number } }): string {
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  return [a.values && a.values.mul < 0 ? 'inverse' : '', a.values?.add ? sign(a.values.add) : '', a.transpose ? `^${a.transpose}` : ''].filter(Boolean).join(' ');
}

/**
 * The bulbs on a braid's track: each ref without a pick (a pick is a tap, its notes stay on the ring), placed by its
 * steps as `flatten` places them. `hosts`: the cells drawn as bulbs, each to the cell that splices it.
 */
export function bulbsOf(result: CompileResult, name: string, shifts: Shifts, hosts: ReadonlyMap<string, string>): Bulb[] {
  const c = result.cells.get(name);
  return c ? splices(result, name, shifts, hosts, 0, 1, Math.max(1, c.steps), 0, 0) : [];
}

function splices(
  result: CompileResult,
  name: string,
  shifts: Shifts,
  hosts: ReadonlyMap<string, string>,
  from: number,
  to: number,
  total: number,
  extra: number,
  depth: number,
): Bulb[] {
  if (depth > MAX_DEPTH) return [];
  const scale = (to - from) / total;
  const out: Bulb[] = [];
  let at = 0;
  for (const u of shiftedUnits(result, name, shifts(name) + extra)) {
    const a = u.atom;
    const foot = (a.kind === 'ref' ? stepsOf(result, a.name, a.pick) || 1 : 1) * u.elongate;
    const span = foot * u.repeat;
    if (a.kind === 'ref' && !a.pick && result.cells.has(a.name)) {
      const t0 = from + at * scale;
      const t1 = from + (at + span) * scale;
      const laps = u.repeat * u.subdivide;
      const steps = stepsOf(result, a.name, null) || 1;
      const hollow = hosts.get(a.name) !== name;
      const inner = splices(result, a.name, shifts, hosts, t0, t0 + (t1 - t0) / laps, steps, a.shift, depth + 1);
      const only = inner.length === 1 && Math.abs(inner[0].t0 - t0) < 1e-9 && Math.abs(inner[0].t1 - (t0 + (t1 - t0) / laps)) < 1e-9 ? inner[0] : null;
      // (a cell that is one splice and nothing else, `&mid &down`: one bulb, what it splices on it)
      if (only && !hollow)
        out.push({
          t0,
          t1,
          name: a.name,
          hollow: only.hollow,
          net: only.net,
          laps: laps * only.laps,
          label: [refLabel(a), `&${only.name}`, only.label].filter(Boolean).join(' '),
          bulbs: only.bulbs,
        });
      else out.push({ t0, t1, name: a.name, hollow, net: hollow ? a.name : null, laps, label: refLabel(a), bulbs: inner });
    }
    at += span;
  }
  return out;
}

type P = readonly [number, number];
const add = (a: P, b: P, k = 1): P => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const len = (a: P) => Math.hypot(a[0], a[1]);
const unit = (a: P): P => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const TAU = Math.PI * 2;
/** A point on a circle, `a` turns clockwise from 12 o'clock. */
const onCircle = (c: P, r: number, a: number): P => [c[0] + r * Math.sin(a * TAU), c[1] - r * Math.cos(a * TAU)];
/** Where a point is round a centre, in turns clockwise from 12 o'clock. */
const angleOf = (c: P, p: P) => Math.atan2(p[0] - c[0], -(p[1] - c[1])) / TAU;

/**
 * A bulb laid out: its stretch of the track (τ, the track's own time: below), the circle it rounds (its hub C, radius
 * rho), its ribbon's width, where it leaves its parent (the neck), and its own bulbs.
 */
export interface Laid {
  readonly bulb: Bulb;
  readonly T0: number;
  readonly T1: number;
  readonly C: P;
  readonly rho: number;
  readonly w: number;
  readonly neck: P;
  readonly bulbs: readonly Laid[];
}

/**
 * A braid's track: one closed curve, the ring and every bulb on it (cubic Béziers through knots, smooth throughout:
 * no joins). Along it runs τ, the track's time: the host's time on the ring, a bulb's first lap stretched over its
 * span (so its laps share the drawing). Sampled densely; each sample its place, its τ and the ribbon's width there.
 */
export interface Track {
  readonly bulbs: readonly Laid[];
  readonly p: readonly P[];
  readonly tau: readonly number[];
  readonly w: readonly number[];
}

/** Narrower, a level down. */
const NARROW = 0.86;

type Knot = { readonly p: P; readonly tau: number; readonly w: number };

/**
 * The track of a braid whose ring has radius r about (cx, cy), its ribbon w wide. A bulb is as wide across as its chord
 * at most (so neighbours keep apart), its radius at most a share of the ring's (its own bulbs, half that); its ribbon
 * narrower than its parent's, and than its radius allows. A splice too short to bend out (its chord under 1.3 ribbons)
 * stays on its parent, as do its own.
 */
export function layTrack(cx: number, cy: number, r: number, w: number, bulbs: readonly Bulb[]): Track {
  const knots: Knot[] = [];
  // A circle's arc from angle a0 to a1 (turns), its τ from T0 to T1 evenly along it, with bulbs on it (τ spans in it).
  const arc = (c: P, R: number, a0: number, a1: number, T0: number, T1: number, width: number, on: readonly Spanned[], cap: number, closed: boolean): Laid[] => {
    const angle = (tau: number) => a0 + ((tau - T0) / (T1 - T0)) * (a1 - a0);
    const laid: Laid[] = [];
    const every = Math.max(1, Math.ceil(Math.abs(a1 - a0) * 32));
    // the arc's own knots, from τ `from` up to (not at) τ `to`, round from angle `x` to `y`
    // (where a bulb ends, the width it had: the ribbon widens back from there, or on into the next bulb)
    let after = width;
    const plain = (from: number, to: number, x: number, y: number) => {
      if (Math.abs(y - x) < 1e-9) return;
      const n = Math.max(1, Math.round((Math.abs(y - x) / Math.abs(a1 - a0)) * every));
      for (let i = 0; i < n; i++) knots.push({ p: onCircle(c, R, x + ((y - x) * i) / n), tau: from + ((to - from) * i) / n, w: i ? width : after });
    };
    let at = T0;
    let atAngle = a0;
    for (const b of on) {
      // (a bulb takes at most a share of its parent's round, about its middle: one that is all of it still has room)
      let [x, y] = [angle(b.T0), angle(b.T1)];
      const most = Math.min(0.45, Math.abs(a1 - a0) * 0.6);
      if (y - x > most) [x, y] = [(x + y - most) / 2, (x + y + most) / 2];
      const A = onCircle(c, R, x);
      const B = onCircle(c, R, y);
      const chord = len(sub(B, A));
      if (chord < width * 1.3 || b.T0 < at - 1e-9 || x < atAngle - 1e-9) continue;
      plain(at, b.T0, atAngle, x);
      const rho = Math.min(cap, chord * 0.5);
      const wb = Math.min(width * NARROW, rho * 0.6);
      const neck = mid(A, B);
      const C = add(neck, unit(sub(neck, c)), rho * 1.05 + width * 0.6);
      // round C clockwise the long way, from beside A to beside B
      const aE = angleOf(C, A) + 0.06;
      let aF = angleOf(C, B) - 0.06;
      while (aF <= aE) aF += 1;
      // (its necks are its stem: they take no time, its round all of it)
      // (a junction between two bulbs, with no time on the ring: as narrow as they are)
      knots.push({ p: A, tau: b.T0, w: x - atAngle > 1e-9 ? width : Math.min(wb, after) });
      const inner = arc(C, rho, aE, aF, b.T0, b.T1, wb, b.bulbs, cap * 0.5, false);
      laid.push({ bulb: b, T0: b.T0, T1: b.T1, C, rho, w: wb, neck, bulbs: inner });
      at = b.T1;
      atAngle = y;
      after = wb;
    }
    plain(at, T1, atAngle, a1);
    if (!closed) knots.push({ p: onCircle(c, R, a1), tau: T1, w: width });
    return laid;
  };
  const top = arc(
    [cx, cy],
    r,
    0,
    1,
    0,
    1,
    w,
    spans(bulbs, (t) => t),
    r * 0.62,
    true,
  );
  return { bulbs: top, ...sample(knots) };
}

/** Bulbs with their τ spans: as their time on the ring; in a bulb, its first lap stretched over its span. */
type Spanned = Bulb & { readonly T0: number; readonly T1: number; readonly bulbs: readonly Spanned[] };
function spans(bulbs: readonly Bulb[], tau: (t: number) => number): Spanned[] {
  return bulbs.map((b) => {
    const T0 = tau(b.t0);
    const T1 = tau(b.t1);
    const lap = (b.t1 - b.t0) / b.laps;
    return { ...b, T0, T1, bulbs: spans(b.bulbs, (t) => T0 + ((t - b.t0) / lap) * (T1 - T0)) };
  });
}

/**
 * The closed curve through the knots (centripetal Catmull-Rom, as cubic Béziers: smooth, no loops where knots crowd),
 * sampled; τ and the width run along each piece by its length.
 */
function sample(knots: readonly Knot[], per = 10): { p: P[]; tau: number[]; w: number[] } {
  const n = knots.length;
  const p: P[] = [];
  const tau: number[] = [];
  const w: number[] = [];
  const at = (i: number) => knots[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    const [P0, P1, P2, P3] = [at(i - 1).p, at(i).p, at(i + 1).p, at(i + 2).p];
    const d = (a: P, b: P) => Math.max(1e-6, Math.sqrt(len(sub(b, a))));
    const [d1, d2, d3] = [d(P0, P1), d(P1, P2), d(P2, P3)];
    const c1: P = [
      (d1 * d1 * P2[0] - d2 * d2 * P0[0] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * P1[0]) / (3 * d1 * (d1 + d2)),
      (d1 * d1 * P2[1] - d2 * d2 * P0[1] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * P1[1]) / (3 * d1 * (d1 + d2)),
    ];
    const c2: P = [
      (d3 * d3 * P1[0] - d2 * d2 * P3[0] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * P2[0]) / (3 * d3 * (d3 + d2)),
      (d3 * d3 * P1[1] - d2 * d2 * P3[1] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * P2[1]) / (3 * d3 * (d3 + d2)),
    ];
    const bez = (t: number): P => {
      const u = 1 - t;
      const [a, b, c, e] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      return [a * P1[0] + b * c1[0] + c * c2[0] + e * P2[0], a * P1[1] + b * c1[1] + c * c2[1] + e * P2[1]];
    };
    const pts = Array.from({ length: per }, (_, j) => bez(j / per));
    const L = [0];
    for (let j = 1; j <= per; j++) L.push(L[j - 1] + len(sub(j < per ? pts[j] : P2, pts[j - 1])));
    const total = L[per] || 1;
    const t0 = at(i).tau;
    // (the last piece closes the ring: its τ runs on to 1)
    const t1 = i === n - 1 ? 1 : at(i + 1).tau;
    for (let j = 0; j < per; j++) {
      const k = L[j] / total;
      p.push(pts[j]);
      tau.push(t0 + (t1 - t0) * k);
      w.push(at(i).w + (at(i + 1).w - at(i).w) * k);
    }
  }
  p.push(p[0]);
  tau.push(1);
  w.push(w[0]);
  // (τ never runs back: rounding, a neck that takes no time)
  for (let i = 1; i < tau.length; i++) tau[i] = Math.max(tau[i], tau[i - 1]);
  return { p, tau, w };
}

/**
 * The sample at or before τ, and how far on to the next. Where the track takes no time (a stretch at one τ: a join),
 * the last of it, or with `early` the first.
 */
function find(track: Track, tau: number, early = false): { i: number; k: number } {
  const T = track.tau;
  let lo = 0;
  let hi = T.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (early ? T[m] < tau : T[m] <= tau) lo = m;
    else hi = m;
  }
  return { i: lo, k: Math.max(0, Math.min(1, (tau - T[lo]) / Math.max(1e-12, T[hi] - T[lo]))) };
}

/** The track at τ: its point, its direction and the ribbon's width there (`early`: before a join at τ, not after it). */
export function trackAt(track: Track, tau: number, early = false): { p: P; tan: P; w: number } {
  const { i, k } = find(track, Math.max(0, Math.min(1, tau)), early);
  const j = Math.min(track.p.length - 1, i + 1);
  return { p: add(track.p[i], sub(track.p[j], track.p[i]), k), tan: unit(sub(track.p[j], track.p[i])), w: track.w[i] + (track.w[j] - track.w[i]) * k };
}

/**
 * Where a time (turns of the host's loop) is on the track: its τ, the bulbs it is in (outermost first), and which lap
 * of them (the drawing is of the first).
 */
export function tauOf(track: Track, t: number): { readonly tau: number; readonly chain: readonly Laid[]; readonly lap: number } {
  const chain: Laid[] = [];
  let list = track.bulbs;
  let lap = 0;
  let tau = t;
  for (;;) {
    const L = list.find((x) => t >= x.bulb.t0 - 1e-12 && t < x.bulb.t1);
    if (!L) return { tau, chain, lap };
    const b = L.bulb;
    const k = ((t - b.t0) / (b.t1 - b.t0)) * b.laps;
    const n = Math.min(b.laps - 1, Math.floor(k + 1e-9));
    lap = Math.max(lap, n);
    tau = L.T0 + (k - n) * (L.T1 - L.T0);
    // (deeper in: the same moment of its first lap)
    t = b.t0 + ((k - n) * (b.t1 - b.t0)) / b.laps;
    chain.push(L);
    list = L.bulbs;
  }
}

/** A step's stretch of the track, from t0 to t1 (turns), in τ; null when it is in a bulb's later lap (drawn once, on the first). */
export function stepOn(track: Track, t0: number, t1: number): { tau0: number; tau1: number } | null {
  // (just inside it: its ends are its neighbours')
  const e = (t1 - t0) * 1e-6;
  const a = tauOf(track, t0 + e);
  if (a.lap > 0) return null;
  const b = tauOf(track, t1 - e);
  return { tau0: Math.min(a.tau, b.tau), tau1: b.lap > a.lap ? a.tau : Math.max(a.tau, b.tau) };
}

const f = (n: number) => n.toFixed(2);

/**
 * A stretch of ribbon from τ0 to τ1, as an SVG path: band j of n across it (0 innermost: towards the hub, or the
 * bulb's), `pad` px wider each side (an outline round it).
 */
export function ribbon(track: Track, tau0: number, tau1: number, j = 0, n = 1, pad = 0): string {
  const T = track.tau;
  // (from after a join at its start to before one at its end: joins take no time, and are drawn as joins)
  const pts = [trackAt(track, tau0), ...track.p.flatMap((_, i) => (T[i] > tau0 && T[i] < tau1 ? [sampleAt(track, i)] : [])), trackAt(track, tau1, true)];
  return band(pts, j, n, pad);
}

/** A sample of the track, its direction from its neighbours. */
function sampleAt(track: Track, i: number): { p: P; tan: P; w: number } {
  const last = track.p.length - 1;
  return { p: track.p[i], tan: unit(sub(track.p[Math.min(last, i + 1)], track.p[Math.max(0, i - 1)])), w: track.w[i] };
}

/**
 * The joins: where the track takes no time (back to its parent between two bulbs, a bulb's neck when a bulb of its own
 * starts it), as thin ribbons to draw as a thread.
 */
export function joins(track: Track, wide = 3): string[] {
  const T = track.tau;
  const out: string[] = [];
  for (let i = 0; i < T.length - 1;) {
    let j = i;
    while (j + 1 < T.length && T[j + 1] - T[i] < 1e-9) j++;
    if (j > i) {
      const pts = Array.from({ length: j - i + 1 }, (_, k) => ({ ...sampleAt(track, i + k), w: Math.min(wide, track.w[i + k]) }));
      if (len(sub(pts[pts.length - 1].p, pts[0].p)) > 1) out.push(band(pts, 0, 1, 0));
    }
    i = j + 1;
  }
  return out;
}

/** A band across a stretch of points: j of n, `pad` wider each side. */
function band(pts: readonly { p: P; tan: P; w: number }[], j: number, n: number, pad: number): string {
  const outer: P[] = [];
  const inner: P[] = [];
  for (const { p, tan, w } of pts) {
    // (clockwise round the hub: out is to the left of the way it runs)
    const out: P = [tan[1], -tan[0]];
    outer.push(add(p, out, -w / 2 + ((j + 1) * w) / n + pad));
    inner.push(add(p, out, -w / 2 + (j * w) / n - pad));
  }
  return 'M' + [...outer, ...inner.reverse()].map((q) => `${f(q[0])} ${f(q[1])}`).join(' L') + ' Z';
}

/** A smooth line through points (Catmull-Rom, as cubics). */
function smooth(pts: readonly P[]): string {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * The cursor, at a time in a bulb: a line bent from the hub (at rFrom, facing the time) out through each bulb's neck
 * and hub to the step playing now, and that point. Null on the ring itself (the plain hand is drawn there).
 */
export function cursorOf(cx: number, cy: number, rFrom: number, track: Track, t: number): { d: string; head: P } | null {
  const at = tauOf(track, t);
  if (!at.chain.length) return null;
  const head = trackAt(track, at.tau).p;
  const pts: P[] = [onCircle([cx, cy], rFrom, t), ...at.chain.flatMap((L) => [L.neck, L.C]), head];
  return { d: smooth(pts), head };
}

/**
 * Where a net-ref's edge meets a braid's track (a wheel `size` px across): at each bulb it shows, on its outside, along
 * the line from the wheel's centre through the bulb's hub — its turn (0 the top, clockwise) and its distance from the centre.
 */
export function netEnds(track: Track, size: number, net: string): { turn: number; r: number }[] {
  const c: P = [size / 2, size / 2];
  const out: { turn: number; r: number }[] = [];
  const walk = (list: readonly Laid[]) => {
    for (const L of list) {
      if (L.bulb.net === net) out.push({ turn: ((angleOf(c, L.C) % 1) + 1) % 1, r: len(sub(L.C, c)) + L.rho + L.w / 2 + 2 });
      walk(L.bulbs);
    }
  };
  walk(track.bulbs);
  return out.sort((a, b) => a.turn - b.turn);
}

/** How far the track reaches from the wheel's centre (px). */
export function trackReach(cx: number, cy: number, track: Track): number {
  return Math.max(0, ...track.p.map((p, i) => len(sub(p, [cx, cy])) + track.w[i] / 2));
}

/** The ring a wheel `size` px across lays its track on: its radius (the middle of the ring) and its ribbon's width. */
export function ringOf(size: number): { readonly r: number; readonly w: number } {
  const g = wheelGeometry(size);
  return { r: (g.rInner + g.rOuter) / 2, w: g.rOuter - g.rInner };
}

/**
 * How far a braid's bulbs reach past its wheel, `size` px across (px): all round (the room the layout leaves it), and
 * below it (where its name goes); null without any.
 */
export function trackRoom(result: CompileResult, name: string, hosts: ReadonlyMap<string, string>, size: number): { room: number; below: number } | null {
  const bulbs = bulbsOf(result, name, codeShifts(result), hosts);
  if (!bulbs.length) return null;
  const { r, w } = ringOf(size);
  const c = size / 2;
  const track = layTrack(c, c, r, w, bulbs);
  const low = Math.max(...track.p.map((p, i) => p[1] + track.w[i] / 2));
  return { room: Math.max(0, trackReach(c, c, track) - c), below: Math.max(0, low - size) };
}
