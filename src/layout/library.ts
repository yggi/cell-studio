/**
 * The library, laid out one level up: pieces and their tags as a graph, by the
 * same physics as a piece's graph — without its ranks, held together both ways,
 * the edges pulling hard (they're the whole structure). A tag's colour is its
 * angle round the cloud's centre: the cloud is a colour wheel by construction.
 */
import { forceX, forceY } from 'd3-force';
import type { GraphModel } from '../engine/graph';
import { DEFAULT_LAYOUT, ForceLayout } from './physics';

export interface LibraryLayout {
  readonly at: ReadonlyMap<string, { x: number; y: number }>;
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
  readonly edges: readonly { id: string; source: string; target: string }[];
  /** Each tag's hue: its angle round the cloud's centre, in degrees. */
  readonly hue: ReadonlyMap<string, number>;
  /** How many pieces carry each tag. */
  readonly count: ReadonlyMap<string, number>;
  /** Each tag's saturation, 0…1: grey at the centre, full at the border (where the genres are). */
  readonly sat: ReadonlyMap<string, number>;
  /** The genres as the library wheel's rim: its radius (layout units, centred on 0) and each genre's angle. */
  readonly ring: { readonly r: number; readonly piece: number; readonly genres: readonly { readonly tag: string; readonly angle: number }[] } | null;
}

/** The genres: pinned at even angles round the border, so every colour (an angle) stays where it is. */
export const GENRES = ['classical', 'jazz', 'electronic', 'experimental', 'world'] as const;

/** A piece's wheel, in layout units. */
export const PIECE = 46;
export const tagRadius = (n: number) => 16 + 4 * Math.sqrt(n);

export function libraryLayout(entries: readonly { id: string; tags: readonly string[] }[]): LibraryLayout {
  const run = start(entries);
  run.tick(700);
  return run.finish();
}

/** The same, a batch of steps at a time — the page stays free to paint (the waiting wheel turns). */
export async function libraryLayoutAsync(entries: readonly { id: string; tags: readonly string[] }[]): Promise<LibraryLayout> {
  const run = start(entries);
  for (let done = 0; done < 700; done += 40) {
    run.tick(40);
    await new Promise((r) => setTimeout(r, 0));
  }
  return run.finish();
}

function start(entries: readonly { id: string; tags: readonly string[] }[]): { tick: (n: number) => void; finish: () => LibraryLayout } {
  const count = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) count.set(t, (count.get(t) ?? 0) + 1);
  const model = {
    nodes: [
      ...entries.map((e) => ({ id: `p:${e.id}`, depth: 1, kind: 'cell', isMeter: false, cell: { name: e.id } })),
      ...[...count.keys()].map((t) => ({ id: `t:${t}`, depth: 0, kind: 'cell', isMeter: false, cell: { name: t } })),
    ],
    edges: entries.flatMap((e) => e.tags.map((t) => ({ id: `p:${e.id}->t:${t}`, source: `p:${e.id}`, target: `t:${t}`, kind: 'ref', count: 1, pick: '' }))),
  } as unknown as GraphModel;
  // the wheel: its radius by how much it holds; the pieces sized to fill about half its disc
  const nodesN = entries.length + count.size;
  const R = 85 * Math.sqrt(nodesN);
  const pieceR = Math.max(PIECE, Math.min(110, R * Math.sqrt(0.5 / Math.max(1, entries.length)) * 0.82));
  const l = new ForceLayout(undefined, {
    ...DEFAULT_LAYOUT,
    live: false,
    layered: false, // a cloud, not a flow: the forces alone
    // (and none of a piece's own: straight lines, no bends, no spread, no kinds, no tag clusters)
    avoid: 0,
    straighten: 0,
    spread: 0,
    kindRepel: 0,
    tagPull: 0,
    tagRepel: 0,
    columnPull: 0,
    rankPull: 0, // a cloud: no layers …
    endPull: 0, // … no top and bottom
    centre: 0.04,
    linkDistance: 70,
    charge: -130, // pieces pack close …
    collidePad: 10,
    degreeRepel: 0, // (a busy tag is the cloud's hub: it shouldn't push the rest away)
    uncross: 0, // (and in a cloud, a hub's edges must cross: untangling would throw it out)
    // a tag is as wide as its word; a piece, its wheel and title
    radius: (n) => (n.id.startsWith('p:') ? pieceR + 6 : Math.max(tagRadius(count.get(n.id.slice(2)) ?? 1), 4.6 * n.id.length)),
  });
  l.setGraph(model);
  // a cloud holds together both ways (the engine's own pull to the centre is sideways only — in a
  // piece, height belongs to the ranks); and its edges are the whole structure: they pull hard
  type Force = { strength: (s: number) => Force; distance: (d: number) => Force };
  const sim = (l as unknown as { sim: { force: (name: string, f?: unknown) => Force } }).sim;
  // (with the genres pinned round the border, the pull to the centre is slight: they hold it together)
  const pinned = GENRES.some((g) => count.has(g));
  sim.force('cloud-x', forceX(0).strength(pinned ? 0.008 : 0.04));
  sim.force('cloud-y', forceY(0).strength(pinned ? 0.008 : 0.05));
  if (pinned) (sim.force('charge') as unknown as { strength: (s: number) => unknown }).strength(-260);
  // a link to a genre (on the rim) pulls hard and far: pieces go out towards their genres;
  // a link to an inner tag is short: the tag the core of its pieces' cluster
  const isGenreId = (id: string) => (GENRES as readonly string[]).includes(id.slice(2));
  type L = { target: { id: string } | string };
  const tid = (l: L) => (typeof l.target === 'string' ? l.target : l.target.id);
  (sim.force('link') as unknown as { strength: (f: (l: L) => number) => { distance: (f: (l: L) => number) => unknown } })
    .strength((l) => (isGenreId(tid(l)) ? 0.35 : 0.9))
    .distance((l) => (isGenreId(tid(l)) ? R * 0.45 : pieceR + 40));
  // … and tags push each other apart (only each other): each the heart of its own cluster
  sim.force('tags-apart', tagsApart(model.nodes.filter((n) => n.id.startsWith('t:')).map((n) => n.id), 26000));
  // the genres, pinned round the border at even angles (classical at the top, then clockwise)
  const genres = GENRES.filter((g) => count.has(g));
  genres.forEach((g, i) => {
    const a = (i / genres.length) * 2 * Math.PI - Math.PI / 2;
    l.dragStart(`t:${g}`, R * Math.cos(a), R * Math.sin(a));
    l.dragEnd(`t:${g}`, true);
  });
  // (and inside the wheel: nothing past the inner edge of the rim — a hard edge, by each one's own size)
  if (genres.length) {
    const edge = R - 40;
    const sizeOf = (id: string) => (id.startsWith('p:') ? pieceR + 8 : Math.max(tagRadius(count.get(id.slice(2)) ?? 1), 4.6 * id.length) * 0.6);
    sim.force('disc', (() => {
      for (const n of (sim as unknown as { nodes: () => { id: string; x: number; y: number; vx: number; vy: number }[] }).nodes()) {
        if (isGenreId(n.id)) continue;
        const r = Math.hypot(n.x, n.y);
        const max = edge - sizeOf(n.id);
        if (r <= max) continue;
        n.x *= max / r;
        n.y *= max / r;
        n.vx *= 0.5;
        n.vy *= 0.5;
      }
    }) as unknown as never);
  }
  return { tick: (n: number) => l.tick(n), finish: () => finish() };
  function finish(): LibraryLayout {
  const at = new Map<string, { x: number; y: number }>();
  for (const n of model.nodes) {
    const p = l.position(n.id);
    if (p) at.set(n.id, { x: p.x, y: p.y });
  }
  l.destroy();
  const xs = [...at.values()].map((p) => p.x);
  const ys = [...at.values()].map((p) => p.y);
  const pad = PIECE + 170; // (room for the genres' names at the border)
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  // the centre: the middle of the pieces; a tag's hue, its angle from there
  const pieces = [...at].filter(([id]) => id.startsWith('p:')).map(([, p]) => p);
  const cx = pieces.reduce((a, p) => a + p.x, 0) / Math.max(1, pieces.length);
  const cy = pieces.reduce((a, p) => a + p.y, 0) / Math.max(1, pieces.length);
  // the centre: the genres' (pinned, so it doesn't drift), else the pieces'
  const ox = genres.length ? 0 : cx;
  const oy = genres.length ? 0 : cy;
  const hue = new Map<string, number>();
  const sat = new Map<string, number>();
  for (const t of count.keys()) {
    const p = at.get(`t:${t}`);
    if (!p) continue;
    hue.set(t, ((Math.atan2(p.y - oy, p.x - ox) * 180) / Math.PI + 450) % 360);
    sat.set(t, Math.max(0.2, Math.min(1, Math.hypot(p.x - ox, p.y - oy) / (genres.length ? R : 400))));
  }
  const ring = genres.length ? { r: R, piece: pieceR, genres: genres.map((g, i) => ({ tag: g, angle: (i / genres.length) * 2 * Math.PI - Math.PI / 2 })) } : null;
  // (the wheel's rim, its names included, inside the frame)
  const rx0 = ring ? Math.min(x0, -R - 140) : x0;
  const ry0 = ring ? Math.min(y0, -R - 140) : y0;
  const rx1 = ring ? Math.max(Math.max(...xs) + pad, R + 140) : Math.max(...xs) + pad;
  const ry1 = ring ? Math.max(Math.max(...ys) + pad, R + 140) : Math.max(...ys) + pad;
  return { at, x0: rx0, y0: ry0, w: rx1 - rx0, h: ry1 - ry0, edges: model.edges, hue, count, sat, ring };
  }
}


/**
 * A push between tags only: each tag repels the others (strength / distance), so
 * the pieces they share stay between them while the tags spread to the edges of
 * their own clusters. (A d3 force: it nudges the velocities of the tag nodes.)
 */
function tagsApart(ids: readonly string[], strength: number) {
  let tags: { x: number; y: number; vx: number; vy: number }[] = [];
  const force = (alpha: number) => {
    for (let i = 0; i < tags.length; i++)
      for (let j = i + 1; j < tags.length; j++) {
        const a = tags[i];
        const b = tags[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d2 = Math.max(400, dx * dx + dy * dy);
        const k = (strength * alpha) / d2;
        dx *= k / Math.sqrt(d2);
        dy *= k / Math.sqrt(d2);
        a.vx -= dx;
        a.vy -= dy;
        b.vx += dx;
        b.vy += dy;
      }
  };
  force.initialize = (nodes: { id: string; x: number; y: number; vx: number; vy: number }[]) => {
    const wanted = new Set(ids);
    tags = nodes.filter((n) => wanted.has(n.id));
  };
  return force;
}
