/**
 * The library, laid out one level up: pieces and their tags as a graph inside one large wheel, the
 * five main genres its rim. Grown, not placed: every node starts tiny and the tag edges pull each
 * piece to its tags, so the groups gather while there's room to move; then the nodes grow until the
 * wheel is filled enough, each pushing only its neighbours (an exclusion zone and a near field, no
 * long-range charge), so the groups keep together as they swell. Each stage can be drawn as it
 * happens: the library's opening animation. A tag's colour is its angle round the centre: the wheel
 * is a colour wheel by construction.
 */
import { forceCollide, forceLink, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { tagName } from '../engine/tags';

export interface LibraryLayout {
  readonly at: ReadonlyMap<string, { x: number; y: number }>;
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
  readonly edges: readonly { id: string; source: string; target: string }[];
  /** Each tag's hue: its angle round the wheel's centre, in degrees. */
  readonly hue: ReadonlyMap<string, number>;
  /** How many pieces carry each tag. */
  readonly count: ReadonlyMap<string, number>;
  /** Each tag's saturation, 0…1: grey at the centre, full at the border (where the genres are). */
  readonly sat: ReadonlyMap<string, number>;
  /** The genres as the wheel's rim: its radius (layout units, centred on 0) and each genre's angle. */
  readonly ring: { readonly r: number; readonly genres: readonly { readonly tag: string; readonly angle: number }[] } | null;
  /** A piece's wheel, its radius now (layout units). */
  readonly piece: number;
  /** How large the tags' words are now (× `tagFont`). */
  readonly tagScale: number;
  /** Grown and come to rest (else a stage on the way). */
  readonly done: boolean;
}

/** The five main genres (of `genre:` tags): pinned at even angles round the border, so every colour (an angle) stays where it is. */
export const GENRES = ['genre:classical', 'genre:jazz', 'genre:electronic', 'genre:experimental', 'genre:world'] as const;

/** A piece's wheel at scale 1, in layout units (its radius). */
export const PIECE = 46;
/** A tag's word at scale 1, in layout units: larger the more pieces carry it. */
export const tagFont = (n: number) => 15 + 4 * Math.sqrt(n);
/** A tag's room as its pill is drawn (half its width), at scale 1. */
const tagRoom = (tag: string, n: number) => ((0.58 * tagName(tag).length + 1.5) * tagFont(n)) / 2;

/** How much of the wheel's disc the nodes fill when grown. */

const FILL = 0.5;
/** The stages, in ticks: gather (tiny nodes, the tag edges contract), grow (to FILL), rest. */
const GATHER = 220;
const GROW = 320;
const REST = 160;
const START = 0.12; // (the nodes' size while they gather, of their full size)

export function libraryLayout(entries: readonly { id: string; tags: readonly string[] }[]): LibraryLayout {
  const run = start(entries);
  run.tick(run.total);
  return run.snapshot();
}

/**
 * The same, a batch of steps at a time — the page stays free to paint. With `onFrame`, each stage on
 * the way is handed over to be drawn (and awaited: the caller paces it, a frame at a time).
 */
export async function libraryLayoutAsync(
  entries: readonly { id: string; tags: readonly string[] }[],
  onFrame?: (stage: LibraryLayout) => void | Promise<void>,
): Promise<LibraryLayout> {
  const run = start(entries);
  // (drawn while it gathers and grows; the rest, where little moves, in one go — and where a stage is
  // slow to draw, fewer stages: a slow device sees it grow in larger steps, not for longer)
  const drawn = onFrame ? run.total - REST : 0;
  let batch = 16;
  for (let done = 0; done < run.total; ) {
    const n = Math.min(done < drawn ? batch : 40, run.total - done);
    run.tick(n);
    done += n;
    if (onFrame && done <= drawn) {
      const t = performance.now();
      await onFrame(run.snapshot());
      if (performance.now() - t > 50) batch = 48;
    } else await new Promise((r) => setTimeout(r, 0));
  }
  return run.snapshot();
}

/**
 * A grown layout as it looked on the way, roughly (`t` from 0, tiny in the middle, to 1, grown): all
 * of it nearer the centre and smaller. The opening again, without the physics — for a layout kept
 * from before.
 */
export function stageOf(l: LibraryLayout, t: number): LibraryLayout {
  const e = t * t * (3 - 2 * t);
  const f = START + (1 - START) * e;
  const rim = (id: string) => !!l.ring && (GENRES as readonly string[]).includes(id.slice(2));
  const at = new Map([...l.at].map(([id, p]) => [id, rim(id) ? p : { x: p.x * f, y: p.y * f }]));
  return { ...l, at, piece: l.piece * f, tagScale: l.tagScale * f, done: t >= 1 };
}

type Node = SimulationNodeDatum & { id: string; base: number; r: number; genre: boolean };
type Link = { source: string | Node; target: string | Node; id: string };

/** Same input, same layout: a node's first place comes from its name. */
function hash(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 0xffffffff;
}

function start(entries: readonly { id: string; tags: readonly string[] }[]) {
  const count = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) count.set(t, (count.get(t) ?? 0) + 1);
  const isGenre = (t: string) => (GENRES as readonly string[]).includes(t);
  const genres = GENRES.filter((g) => count.has(g));
  // a hub: a tag inside the wheel that several pieces carry (one piece's own tag only shows close up)
  const hub = (t: string) => !isGenre(t) && (count.get(t) ?? 0) > 1;
  const R = 85 * Math.sqrt(entries.length + count.size);
  const inner = R - 40; // (the rim's inner edge)

  // every node at scale 1: a piece its wheel; a hub its word as drawn; any other tag a little
  const nodes: Node[] = [
    ...entries.map((e) => ({ id: `p:${e.id}`, base: PIECE + 6, genre: false })),
    ...[...count].map(([t, n]) => ({ id: `t:${t}`, base: hub(t) ? Math.max(tagFont(n), tagRoom(t, n)) : tagFont(n) * 0.6, genre: !!genres.length && isGenre(t) })),
  ].map((n) => {
    // (somewhere inside, by its name; the genres on the rim, pinned at even angles, classical at the top)
    const g = genres.indexOf(n.id.slice(2) as (typeof GENRES)[number]);
    if (n.genre) {
      const a = (g / genres.length) * 2 * Math.PI - Math.PI / 2;
      return { ...n, r: 0, x: R * Math.cos(a), y: R * Math.sin(a), fx: R * Math.cos(a), fy: R * Math.sin(a) };
    }
    const a = hash(n.id, 1) * 2 * Math.PI;
    const d = Math.sqrt(hash(n.id, 2)) * inner * 0.7;
    return { ...n, r: 0, x: d * Math.cos(a), y: d * Math.sin(a) };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = entries.flatMap((e) => e.tags.map((t) => ({ id: `p:${e.id}->t:${t}`, source: `p:${e.id}`, target: `t:${t}` })));
  const tagOf = (l: Link) => (typeof l.target === 'string' ? l.target : l.target.id).slice(2);
  const end = (x: string | Node) => (typeof x === 'string' ? byId.get(x)! : x);

  // full size: the scale at which the nodes fill FILL of the disc (the genres are the rim, not in it) —
  // a piece by its wheel, a tag by its pill as drawn (as wide as its room, a word high: not a disc)
  const area = nodes
    .filter((n) => !n.genre)
    .reduce((a, n) => a + (n.id.startsWith('p:') ? n.base * n.base : (2 * n.base * 1.5 * tagFont(count.get(n.id.slice(2)) ?? 1)) / Math.PI), 0);
  const full = inner * Math.sqrt(FILL / area);

  // the tag edges pull: a piece to each of its tags, to touching (the rim's genres lean, below)
  const onRim = (t: string) => isGenre(t) && genres.length > 0;
  const link = forceLink<Node, Link>(edges.filter((e) => !onRim(e.target.slice(2))).map((e) => ({ ...e })))
    .id((d) => d.id)
    .strength((l) => (hub(tagOf(l)) ? 0.9 : 0.8));
  // a piece leans towards its genres on the rim (one way: towards, never pushed off): where it sits round the wheel
  const lean = entries.flatMap((e) => {
    const gs = e.tags.filter(onRim).map((t) => byId.get(`t:${t}`)!);
    if (!gs.length) return [];
    const x = gs.reduce((a, g) => a + g.fx! / R, 0) / gs.length;
    const y = gs.reduce((a, g) => a + g.fy! / R, 0) / gs.length;
    return [{ n: byId.get(`p:${e.id}`)!, x, y }];
  });
  const collide = forceCollide<Node>().strength(1).iterations(3);
  const sim = forceSimulation<Node>(nodes)
    .stop()
    .alphaDecay(0)
    .velocityDecay(0.4)
    .force('link', link)
    // every node keeps its neighbours off: an exclusion zone (no overlaps) and a near field around it
    .force('near', nearField(nodes, 0.6, 0.2))
    .force('collide', collide)
    // (towards its genres' side of the cloud as it is now: the tiny knot is turned to its rim before it grows)
    .force('lean', (alpha: number) => {
      const reach = inner * 0.8 * (scale / full);
      for (const { n, x, y } of lean) {
        n.vx! += (x * reach - n.x!) * 0.12 * alpha;
        n.vy! += (y * reach - n.y!) * 0.12 * alpha;
      }
    })
    // (the cloud stays centred in its wheel, however its genres lean)
    .force('centre', () => {
      const inside = nodes.filter((n) => !n.genre);
      const cx = inside.reduce((a, n) => a + n.x!, 0) / inside.length;
      const cy = inside.reduce((a, n) => a + n.y!, 0) / inside.length;
      for (const n of inside) {
        n.x! -= cx * 0.2;
        n.y! -= cy * 0.2;
      }
    })
    // and nothing past the rim's inner edge, by each one's own size
    .force('disc', () => {
      for (const n of nodes) {
        if (n.genre) continue;
        const d = Math.hypot(n.x!, n.y!);
        const max = Math.max(0, inner - n.r);
        if (d <= max) continue;
        n.x! *= max / d;
        n.y! *= max / d;
        n.vx! *= 0.5;
        n.vy! *= 0.5;
      }
    });
  let scale = 0;
  const grow = (s: number) => {
    scale = s;
    for (const n of nodes) n.r = n.genre ? 0 : n.base * s;
    collide.radius((d) => d.r);
    link.distance((l) => (end(l.source).r + end(l.target).r) * 1.05);
  };
  grow(full * START);

  let i = 0;
  const total = GATHER + GROW + REST;
  const tick = (n: number) => {
    for (const stop = Math.min(total, i + n); i < stop; i++) {
      if (i < GATHER) sim.alpha(0.5);
      else if (i < GATHER + GROW) {
        const t = (i - GATHER + 1) / GROW;
        grow(full * (START + (1 - START) * t * t * (3 - 2 * t)));
        sim.alpha(0.4);
      } else sim.alpha(0.02 + 0.38 * (1 - (i - GATHER - GROW) / REST));
      sim.tick();
    }
  };

  const snapshot = (): LibraryLayout => {
    const at = new Map(nodes.map((n) => [n.id, { x: n.x!, y: n.y! }]));
    const hue = new Map<string, number>();
    const sat = new Map<string, number>();
    for (const t of count.keys()) {
      const p = at.get(`t:${t}`)!;
      hue.set(t, ((Math.atan2(p.y, p.x) * 180) / Math.PI + 450) % 360);
      sat.set(t, Math.max(0.2, Math.min(1, Math.hypot(p.x, p.y) / R)));
    }
    const ring = genres.length ? { r: R, genres: genres.map((g, k) => ({ tag: g, angle: (k / genres.length) * 2 * Math.PI - Math.PI / 2 })) } : null;
    // (the frame: the wheel, the genres' names included — the same at every stage)
    const m = R + 140;
    return { at, x0: -m, y0: -m, w: 2 * m, h: 2 * m, edges, hue, count, sat, ring, piece: PIECE * scale, tagScale: scale, done: i >= total };
  };
  return { total, tick, snapshot };
}

/**
 * Near-field repulsion: each pair closer than `reach` × their summed radii pushes apart, harder the
 * deeper in; beyond that, nothing (no long-range charge: neighbours, not the whole wheel).
 */
function nearField(nodes: readonly Node[], reach: number, strength: number) {
  return (alpha: number) => {
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.genre || b.genre) continue;
        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const d = Math.hypot(dx, dy) || 1e-3;
        const zone = (a.r + b.r) * (1 + reach);
        if (d >= zone) continue;
        // (each gives way by the other's share: the smaller moves more)
        const k = (strength * alpha * (zone - d)) / d;
        const wa = (b.r + 1) / (a.r + b.r + 2);
        a.vx! -= dx * k * wa;
        a.vy! -= dy * k * wa;
        b.vx! += dx * k * (1 - wa);
        b.vy! += dy * k * (1 - wa);
      }
  };
}
