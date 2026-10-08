import { describe, expect, it } from 'vitest';
import { GENRES, PILL, libraryLayout, libraryLayoutAsync, shortTitle, stageOf } from './library';
import { PRESETS } from '../engine/presets';
import { pieceMeta } from '../engine/parser';
import { canonicalTags, TUTORIAL } from '../engine/tags';

// the library as the app lists it: every example with its card's title, tags and rung
const entries = Object.entries(PRESETS).map(([key, p]) => {
  const m = pieceMeta(p.source);
  return { id: `example:${key}`, title: m?.title ?? key, tags: canonicalTags(m?.tags ?? []), rung: m?.rung ?? null };
});
const t0 = performance.now();
const lib = libraryLayout(entries);
const ms = performance.now() - t0;
const everyPiece = entries.map((e) => ({ ...e, p: lib.at.get(`p:${e.id}`)! }));
// the wheel's pieces (the tutorial's are a cell of their own)
const pieces = everyPiece.filter((e) => !e.tags.includes(TUTORIAL));
const ladder = everyPiece.filter((e) => e.tags.includes(TUTORIAL)).sort((a, b) => a.rung! - b.rung!);

describe('the library laid out', () => {
  it('is grown and at rest, quickly', () => {
    expect(lib.done).toBe(true);
    expect(ms).toBeLessThan(1500);
  });
  it('is the same every time (same input, same layout)', () => {
    const again = libraryLayout(entries);
    for (const [id, p] of lib.at) expect(again.at.get(id), id).toEqual(p);
  });
  it('keeps every piece inside the rim, and no two wheels overlap (each takes the room free around it)', () => {
    const inner = lib.ring!.r - 40;
    const r = (id: string) => lib.wheel.get(`p:${id}`)!;
    let worst = 0;
    for (const a of pieces) expect(Math.hypot(a.p.x, a.p.y) + r(a.id), a.id).toBeLessThanOrEqual(inner + 2);
    for (const a of everyPiece) for (const b of everyPiece) if (a !== b) worst = Math.max(worst, r(a.id) + r(b.id) - Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y));
    expect(worst).toBeLessThan(1e-6);
    // (and a wheel is worth growing: most are at least one and a half times its title's height across)
    const big = pieces.filter((e) => r(e.id) >= 1.2 * PILL * lib.tagScale).length;
    expect(big / pieces.length).toBeGreaterThan(0.75);
  });
  it('at the full view a piece is its title: no two title pills overlap', () => {
    // (a pill as drawn: its words at PILL × the layout's scale, 0.58 em a letter, 0.65 em padding each side, 1.6 em high)
    const f = PILL * lib.tagScale;
    const box = (e: (typeof pieces)[number]) => ({ w: (0.58 * shortTitle(e.title).length + 1.3) * f, h: 1.6 * f, ...e.p });
    let worst = 0;
    for (const a of everyPiece)
      for (const b of everyPiece) {
        if (a === b) continue;
        const A = box(a);
        const B = box(b);
        const ox = (A.w + B.w) / 2 - Math.abs(A.x - B.x);
        const oy = (A.h + B.h) / 2 - Math.abs(A.y - B.y);
        if (ox > 0 && oy > 0) worst = Math.max(worst, Math.min(ox, oy));
      }
    expect(worst).toBeLessThan(f * 0.2); // at most a sliver
  });
  it('is round, as its wheel is: about as wide as it is tall', () => {
    const sd = (k: 'x' | 'y') => Math.sqrt(pieces.reduce((a, e) => a + e.p[k] ** 2, 0) / pieces.length);
    expect(sd('x') / sd('y')).toBeGreaterThan(0.7); // (0.83 when written; pills set apart the shortest way stack into a column, 0.5)
    expect(sd('x') / sd('y')).toBeLessThan(1.4);
  });
  it('keeps groups together: a piece is nearer the tags it carries than the tags it does not, and its nearest neighbour shares one', () => {
    // (inner tags several pieces share: the hubs)
    const hubs = [...lib.count].filter(([t, n]) => n > 1 && lib.at.has(`t:${t}`) && !(GENRES as readonly string[]).includes(t)).map(([t]) => t);
    let nearer = 0;
    let shares = 0;
    let all = 0;
    for (const e of pieces) {
      const d = (t: string) => Math.hypot(lib.at.get(`t:${t}`)!.x - e.p.x, lib.at.get(`t:${t}`)!.y - e.p.y);
      const own = hubs.filter((t) => e.tags.includes(t));
      const other = hubs.filter((t) => !e.tags.includes(t));
      if (!own.length) continue;
      const mine = own.reduce((a, t) => a + d(t), 0) / own.length;
      const theirs = other.reduce((a, t) => a + d(t), 0) / other.length;
      all++;
      if (mine < theirs * 0.6) nearer++;
      const next = pieces.filter((o) => o !== e).sort((a, b) => Math.hypot(a.p.x - e.p.x, a.p.y - e.p.y) - Math.hypot(b.p.x - e.p.x, b.p.y - e.p.y))[0];
      if (own.some((t) => next.tags.includes(t))) shares++;
    }
    // (0.87 and 0.75 when written; the forces before growing, with a long-range charge, gave 0.85 and 0.71)
    expect(nearer / all).toBeGreaterThan(0.7);
    expect(shares / all).toBeGreaterThan(0.62);
  });
  it('can be watched as it grows: the stages get larger and end where the layout ends', async () => {
    const sizes: number[] = [];
    const end = await libraryLayoutAsync(entries, (s) => void sizes.push(s.tagScale));
    expect(sizes.length).toBeGreaterThan(20);
    expect(sizes[0]).toBeLessThan(end.tagScale * 0.2);
    expect(sizes.every((s, i) => i === 0 || s >= sizes[i - 1])).toBe(true);
    expect(end.at).toEqual(lib.at);
  });
  it('replays its opening from a kept layout: small in the middle, then as grown', () => {
    const first = stageOf(lib, 0);
    expect(first.piece).toBeLessThan(lib.piece * 0.2);
    expect(first.done).toBe(false);
    const p = pieces[0].p;
    expect(Math.hypot(first.at.get(`p:${pieces[0].id}`)!.x, first.at.get(`p:${pieces[0].id}`)!.y)).toBeLessThan(Math.hypot(p.x, p.y) * 0.2 + 1e-9);
    // (the tutorial's pieces from the middle of their own cell)
    const c = lib.tutorial!;
    const q = ladder[ladder.length - 1];
    const at = first.at.get(`p:${q.id}`)!;
    expect(Math.hypot(at.x - c.x, at.y - c.y)).toBeLessThan(Math.hypot(q.p.x - c.x, q.p.y - c.y) * 0.2 + 1e-9);
    const last = stageOf(lib, 1);
    expect(last.at).toEqual(lib.at);
    expect(last.piece).toBeCloseTo(lib.piece);
    expect(last.done).toBe(true);
  });
  it('turns each group to its genres on the rim: a piece sits on the side of the wheel where its genres are', () => {
    let cos = 0;
    let n = 0;
    for (const e of pieces) {
      const gs = e.tags.filter((t) => (GENRES as readonly string[]).includes(t)).map((t) => lib.at.get(`t:${t}`)!);
      if (!gs.length) continue;
      const gx = gs.reduce((a, g) => a + g.x, 0);
      const gy = gs.reduce((a, g) => a + g.y, 0);
      const l = Math.hypot(gx, gy) * Math.hypot(e.p.x, e.p.y);
      if (l === 0) continue;
      cos += (gx * e.p.x + gy * e.p.y) / l;
      n++;
    }
    expect(cos / n).toBeGreaterThan(0.5); // (0.72 when written; 1 would be every piece straight towards its genres)
  });
  it('draws the tutorial as a cell of its own beside the wheel, its rungs in rows from the top, a path', () => {
    const c = lib.tutorial!;
    expect(c.order).toEqual(ladder.map((e) => `p:${e.id}`));
    expect(ladder.length).toBeGreaterThan(20);
    // (beside the wheel, clear of its rim and the genres' names)
    expect(c.x - c.r).toBeGreaterThan(lib.ring!.r + 64);
    expect(lib.x0 + lib.w).toBeGreaterThanOrEqual(c.x + c.r);
    for (const e of ladder) expect(Math.hypot(e.p.x - c.x, e.p.y - c.y) + lib.wheel.get(`p:${e.id}`)!, e.id).toBeLessThanOrEqual(c.r);
    // each rung beside the one before, in its row, or just below it: a path that never jumps
    const f = PILL * lib.tagScale;
    for (let i = 1; i < ladder.length; i++) {
      const [a, b] = [ladder[i - 1].p, ladder[i].p];
      expect(b.y, ladder[i].id).toBeGreaterThanOrEqual(a.y - 1e-6);
      if (b.y > a.y + 1e-6) expect(b.y - a.y, ladder[i].id).toBeLessThan(f * 4);
    }
    // its tag is on its rim, lit like the genres'
    expect(lib.at.get(`t:${TUTORIAL}`)).toEqual({ x: c.x, y: c.y - c.r });
    expect(lib.edges.filter((e) => e.target === `t:${TUTORIAL}`)).toHaveLength(ladder.length);
  });
});

describe('a library of nothing but the tutorial', () => {
  it('still returns, with the tutorial laid out', () => {
    const only = entries.filter((e) => e.tags.includes(TUTORIAL));
    const l = libraryLayout(only);
    expect(l.tutorial).toBeTruthy();
    for (const e of only) expect(l.at.get(`p:${e.id}`), e.id).toBeDefined();
  });
});
