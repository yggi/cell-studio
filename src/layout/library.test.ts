import { describe, expect, it } from 'vitest';
import { GENRES, libraryLayout, libraryLayoutAsync, stageOf } from './library';
import { PRESETS } from '../engine/presets';
import { pieceMeta } from '../engine/parser';
import { canonicalTags } from '../engine/tags';

// the library as the app lists it: every example with its card's tags
const entries = Object.entries(PRESETS).map(([key, p]) => ({ id: `example:${key}`, tags: canonicalTags(pieceMeta(p.source)?.tags ?? []) }));
const t0 = performance.now();
const lib = libraryLayout(entries);
const ms = performance.now() - t0;
const pieces = entries.map((e) => ({ ...e, p: lib.at.get(`p:${e.id}`)! }));

describe('the library laid out', () => {
  it('is grown and at rest, quickly', () => {
    expect(lib.done).toBe(true);
    expect(ms).toBeLessThan(1500);
  });
  it('is the same every time (same input, same layout)', () => {
    const again = libraryLayout(entries);
    for (const [id, p] of lib.at) expect(again.at.get(id), id).toEqual(p);
  });
  it('keeps every piece inside the rim, and no two overlap', () => {
    const inner = lib.ring!.r - 40;
    let worst = 0;
    for (const a of pieces) {
      expect(Math.hypot(a.p.x, a.p.y) + lib.piece, a.id).toBeLessThanOrEqual(inner + 2);
      for (const b of pieces) if (a !== b) worst = Math.max(worst, 2 * lib.piece - Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y));
    }
    expect(worst).toBeLessThan(lib.piece * 0.1); // at most a sliver
  });
  it('keeps groups together: a piece is nearer the tags it carries than the tags it does not, and its nearest neighbour shares one', () => {
    // (inner tags several pieces share: the hubs)
    const hubs = [...lib.count].filter(([t, n]) => n > 1 && !(GENRES as readonly string[]).includes(t)).map(([t]) => t);
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
    // (0.75 and 0.69 when written; the forces before growing, with a long-range charge, gave 0.85 and 0.71 —
    // the genres' lean, below, pulls a little against the tags)
    expect(nearer / all).toBeGreaterThan(0.7);
    expect(shares / all).toBeGreaterThan(0.62);
  });
  it('can be watched as it grows: the stages get larger and end where the layout ends', async () => {
    const sizes: number[] = [];
    const end = await libraryLayoutAsync(entries, (s) => void sizes.push(s.piece));
    expect(sizes.length).toBeGreaterThan(20);
    expect(sizes[0]).toBeLessThan(end.piece * 0.2);
    expect(sizes.every((s, i) => i === 0 || s >= sizes[i - 1])).toBe(true);
    expect(end.at).toEqual(lib.at);
  });
  it('replays its opening from a kept layout: small in the middle, then as grown', () => {
    const first = stageOf(lib, 0);
    expect(first.piece).toBeLessThan(lib.piece * 0.2);
    expect(first.done).toBe(false);
    const p = pieces[0].p;
    expect(Math.hypot(first.at.get(`p:${pieces[0].id}`)!.x, first.at.get(`p:${pieces[0].id}`)!.y)).toBeLessThan(Math.hypot(p.x, p.y) * 0.2 + 1e-9);
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
    expect(cos / n).toBeGreaterThan(0.45); // (0.63 when written; 1 would be every piece straight towards its genres)
  });
});
