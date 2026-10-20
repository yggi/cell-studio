import { describe, expect, it } from 'vitest';
import { GENRES, PILL, byTier, foldSides, sideOf, freezeLayout, layoutKey, libraryLayout, libraryLayoutAsync, shortTitle, stageOf, thawLayout } from './library';
import { PRESETS } from '@yggi/cells/engine/presets';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import { canonicalTags, MIDI_FILE, TUTORIAL } from '@yggi/cells/engine/tags';
import { readdirSync, readFileSync } from 'node:fs';

// the library as the app lists it: every example with its card's title, tags and tier, and the MIDI library (as
// ui/entries.ts lists it)
const entries = [
  ...Object.entries(PRESETS).map(([key, p]) => {
    const m = pieceMeta(p.file);
    return { id: `example:${key}`, title: m?.title ?? key, tags: canonicalTags(m?.tags ?? []), tier: m?.tier ?? null };
  }),
  ...readdirSync('node_modules/@yggi/cells/midi').flatMap((set) =>
    (JSON.parse(readFileSync(`node_modules/@yggi/cells/midi/${set}/index.json`, 'utf8')) as { key: string; title: string }[]).map((m) => ({
      id: `midi:${m.key}`,
      title: m.title,
      tags: [set, MIDI_FILE, 'artist:Bach', 'genre:classical'],
      tier: null,
      collection: set,
    })),
  ),
];
const t0 = performance.now();
const lib = libraryLayout(entries);
const ms = performance.now() - t0;
const everyPiece = entries.map((e) => ({ ...e, p: lib.at.get(`p:${e.id}`)! }));
// the wheel's pieces (the tutorial's and the MIDI library's are cells of their own)
const pieces = everyPiece.filter((e) => !sideOf(e));
const files = everyPiece.filter((e) => e.tags.includes(MIDI_FILE));
const side = (tag: string) => lib.sides.find((s) => s.tag === tag)!;
const ladder = everyPiece.filter((e) => e.tags.includes(TUTORIAL)).sort((a, b) => a.tier! - b.tier!);

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
    // (0.87 and 0.75 when written; the forces before growing, with a long-range charge, gave 0.85 and 0.71; the
    // examples' new topics, cells #202, `stereo` on 22 pieces above all, moved the layout: 0.615 of nearest neighbours
    // share a tag at that pin)
    expect(nearer / all).toBeGreaterThan(0.7);
    expect(shares / all).toBeGreaterThan(0.6);
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
    const c = side(TUTORIAL);
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
  it('draws the tutorial as a cell of its own beside the wheel, its tiers in rows from the top, a path', () => {
    const c = side(TUTORIAL);
    expect(c.order).toEqual(ladder.map((e) => `p:${e.id}`));
    expect(ladder.length).toBeGreaterThan(20);
    // (beside the wheel, clear of its rim and the genres' names)
    expect(c.x - c.r).toBeGreaterThan(lib.ring!.r + 64);
    expect(lib.x0 + lib.w).toBeGreaterThanOrEqual(c.x + c.r);
    for (const e of ladder) expect(Math.hypot(e.p.x - c.x, e.p.y - c.y) + lib.wheel.get(`p:${e.id}`)!, e.id).toBeLessThanOrEqual(c.r);
    // each tier beside the one before, in its row, or just below it: a path that never jumps
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
  it('draws each collection of the MIDI library as a cell of its own, stacked on the other side of the wheel', () => {
    const sets = [...new Set(files.map((e) => (e as { collection?: string }).collection!))];
    expect(sets.length).toBeGreaterThan(1);
    const cells = sets.map(side);
    for (const [k, c] of cells.entries()) {
      const mine = files.filter((e) => (e as { collection?: string }).collection === sets[k]);
      expect(c.order, sets[k]).toEqual(mine.map((e) => `p:${e.id}`));
      // (left of the wheel, clear of its rim; inside the frame)
      expect(c.x + c.r, sets[k]).toBeLessThan(-lib.ring!.r - 64);
      expect(lib.x0).toBeLessThanOrEqual(c.x - c.r);
      expect(lib.y0).toBeLessThanOrEqual(c.y - c.r);
      expect(lib.y0 + lib.h).toBeGreaterThanOrEqual(c.y + c.r);
      for (const e of mine) expect(Math.hypot(e.p.x - c.x, e.p.y - c.y) + lib.wheel.get(`p:${e.id}`)!, e.id).toBeLessThanOrEqual(c.r);
      // (its tag on its rim, lit like the genres')
      expect(lib.at.get(`t:${sets[k]}`)).toEqual({ x: c.x, y: c.y - c.r });
    }
    // (stacked in their order, none over another)
    for (let k = 1; k < cells.length; k++) expect(cells[k]!.y - cells[k]!.r).toBeGreaterThan(cells[k - 1]!.y + cells[k - 1]!.r);
    // (their pieces' other tags are the wheel's: Bach, classical)
    expect(lib.edges.filter((e) => e.target === 't:artist:Bach' && e.source.startsWith('p:midi:'))).toHaveLength(files.length);
  });
});

describe('a library of nothing but the tutorial', () => {
  it('still returns, with the tutorial laid out', () => {
    const only = entries.filter((e) => e.tags.includes(TUTORIAL));
    const l = libraryLayout(only);
    expect(l.sides.map((s) => s.tag)).toEqual([TUTORIAL]);
    for (const e of only) expect(l.at.get(`p:${e.id}`), e.id).toBeDefined();
  });
});

describe('the tutorial order', () => {
  it('goes by tier, and a piece without one is at the bottom', () => {
    const pieces = [{ id: 'none' }, { id: 'nine', tier: 9 }, { id: 'null', tier: null }, { id: 'one', tier: 1 }];
    expect(pieces.sort(byTier).map((p) => p.id)).toEqual(['one', 'nine', 'none', 'null']);
  });
});

describe('a layout kept between visits', () => {
  it('reads back what it wrote, through JSON', () => {
    expect(thawLayout(JSON.parse(JSON.stringify(freezeLayout(lib))))).toEqual(lib);
  });
  it('reads nothing that is not one', () => {
    for (const o of [null, 1, 'x', {}, { ...freezeLayout(lib), at: 'x' }, { ...freezeLayout(lib), w: '1' }]) expect(thawLayout(o)).toBeNull();
  });
  it('is keyed by the pieces, their titles, tags and tiers', () => {
    expect(layoutKey(entries)).toBe(layoutKey(entries.map((e) => ({ ...e }))));
    expect(layoutKey(entries)).not.toBe(layoutKey([{ ...entries[0], tags: [] }, ...entries.slice(1)]));
  });
});

describe('the cells beside the wheel, folded', () => {
  const R = lib.ring!.r;
  const discs = (l: typeof lib) => [{ x: 0, y: 0, r: R + 32 }, ...l.sides];
  const apart = (l: typeof lib) => discs(l).every((a, i) => discs(l).every((b, j) => i >= j || Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 1e-6));
  const folded = foldSides(lib, null);
  it('are small discs just outside the rim, none overlapping the wheel or another', () => {
    expect(folded.sides.every((s) => s.folded && s.r <= 0.3 * R)).toBe(true);
    expect(folded.sides.every((s) => Math.hypot(s.x, s.y) - s.r <= R + 61)).toBe(true);
    expect(apart(folded)).toBe(true);
  });
  it('give the wheel the frame: a smaller one than laid out', () => {
    expect(folded.w * folded.h).toBeLessThan(0.6 * lib.w * lib.h);
    for (const s of folded.sides) {
      expect(s.x - s.r).toBeGreaterThanOrEqual(folded.x0);
      expect(s.x + s.r).toBeLessThanOrEqual(folded.x0 + folded.w);
    }
  });
  it('open one whole, its pieces in their places in it, overlapping nothing', () => {
    for (const s of lib.sides) {
      const l = foldSides(lib, s.tag);
      const o = l.sides.find((c) => c.tag === s.tag)!;
      expect(o.folded).toBe(false);
      expect(o.r).toBe(s.r);
      expect(apart(l)).toBe(true);
      for (const id of s.order) {
        const [p, q] = [lib.at.get(id)!, l.at.get(id)!];
        expect(q.x - o.x).toBeCloseTo(p.x - s.x);
        expect(q.y - o.y).toBeCloseTo(p.y - s.y);
      }
    }
  });
  it('keep the order of the sides as laid out', () => {
    expect(folded.sides.map((s) => s.tag)).toEqual(lib.sides.map((s) => s.tag));
  });
});
