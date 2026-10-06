/**
 * The library, laid out one level up: pieces and their tags as a graph inside one large wheel, the
 * five main genres its rim. Grown, not placed: every node starts tiny and the tag edges pull each
 * piece to its tags, so the groups gather while there's room to move; then the nodes grow until the
 * wheel is filled enough, each pushing only its neighbours (an exclusion zone and a near field, no
 * long-range charge), so the groups keep together as they swell. Each stage can be drawn as it
 * happens: the library's opening animation. A tag's colour is its angle round the centre: the wheel
 * is a colour wheel by construction.
 */
import { forceLink, forceSimulation, type SimulationNodeDatum } from 'd3-force';
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
  /** Each piece's wheel, its radius now (layout units): the room free around it — wheels never overlap. */
  readonly wheel: ReadonlyMap<string, number>;
  /** A piece's wheel, typically (the middle of them). */
  readonly piece: number;
  /** How large the tags' words are now (× `tagFont`). */
  readonly tagScale: number;
  /** … and once grown (known from the start: a view can be framed for the end of the opening). */
  readonly fullScale: number;
  /** Grown and come to rest (else a stage on the way). */
  readonly done: boolean;
}

/** The five main genres (of `genre:` tags): pinned at even angles round the border, so every colour (an angle) stays where it is. */
export const GENRES = ['genre:classical', 'genre:jazz', 'genre:electronic', 'genre:experimental', 'genre:world'] as const;

/** A tag's word at scale 1, in layout units: larger the more pieces carry it. */
export const tagFont = (n: number) => 13 + 2.5 * Math.sqrt(n);
/** A piece's title as the library shows it: short (before its colon). */
export const shortTitle = (t: string) => t.split(':')[0];
/** A piece's title pill, its words at scale 1 (layout units): at the full view a piece is its title. */
export const PILL = 17;
/** A pill's half-width at scale 1: its words (0.58 em a letter) and its padding, at its font. */
const pillHalf = (words: string, font: number) => ((0.58 * words.length + 1.5) * font) / 2;
/** What the layout needs of a piece: its tags, and its title (for its pill's room). */
export interface LibraryEntry {
  readonly id: string;
  readonly tags: readonly string[];
  readonly title?: string;
}

/** How much of the wheel's disc the nodes' rooms fill when grown. */
const FILL = 0.45;
/** The stages, in ticks: gather (tiny nodes, the tag edges contract), grow (to FILL), rest. */
const GATHER = 220;
const GROW = 320;
const REST = 160;
const START = 0.12; // (the nodes' size while they gather, of their full size)

export function libraryLayout(entries: readonly LibraryEntry[]): LibraryLayout {
  const run = start(entries);
  run.tick(run.total);
  return run.snapshot();
}

/**
 * The same, a batch of steps at a time — the page stays free to paint. With `onFrame`, each stage on
 * the way is handed over to be drawn (and awaited: the caller paces it, a frame at a time).
 */
export async function libraryLayoutAsync(
  entries: readonly LibraryEntry[],
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
  const wheel = new Map([...l.wheel].map(([id, r]) => [id, r * f]));
  return { ...l, at, wheel, piece: l.piece * f, tagScale: l.tagScale * f, done: t >= 1 };
}

/** A node: its room, a box (half its width and height) — at scale 1, and now. */
type Node = SimulationNodeDatum & { id: string; bw: number; bh: number; w: number; h: number; genre: boolean };
type Link = { source: string | Node; target: string | Node; id: string };

/** Same input, same layout: a node's first place comes from its name. */
function hash(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 0xffffffff;
}

function start(entries: readonly LibraryEntry[]) {
  const count = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) count.set(t, (count.get(t) ?? 0) + 1);
  const isGenre = (t: string) => (GENRES as readonly string[]).includes(t);
  const genres = GENRES.filter((g) => count.has(g));
  // a hub: a tag inside the wheel that several pieces carry (one piece's own tag only shows close up)
  const hub = (t: string) => !isGenre(t) && (count.get(t) ?? 0) > 1;
  const R = 85 * Math.sqrt(entries.length + count.size);
  const inner = R - 40; // (the rim's inner edge)

  // every node's room at scale 1, a box: a piece its title pill with a little room round it (above and
  // below: for its wheel, zoomed in); a hub its word as drawn; any other tag a little (it shows only close up)
  const nodes: Node[] = [
    ...entries.map((e) => ({ id: `p:${e.id}`, bw: pillHalf(shortTitle(e.title ?? e.id), PILL) * 1.15, bh: PILL * 1.6, genre: false })),
    ...[...count].map(([t, n]) => {
      const f = tagFont(n);
      return { id: `t:${t}`, bw: hub(t) ? pillHalf(tagName(t), f) : f * 0.6, bh: hub(t) ? f * 0.8 : f * 0.6, genre: !!genres.length && isGenre(t) };
    }),
  ].map((n) => {
    // (somewhere inside, by its name; the genres on the rim, pinned at even angles, classical at the top)
    const g = genres.indexOf(n.id.slice(2) as (typeof GENRES)[number]);
    if (n.genre) {
      const a = (g / genres.length) * 2 * Math.PI - Math.PI / 2;
      return { ...n, w: 0, h: 0, x: R * Math.cos(a), y: R * Math.sin(a), fx: R * Math.cos(a), fy: R * Math.sin(a) };
    }
    const a = hash(n.id, 1) * 2 * Math.PI;
    const d = Math.sqrt(hash(n.id, 2)) * inner * 0.7;
    return { ...n, w: 0, h: 0, x: d * Math.cos(a), y: d * Math.sin(a) };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = entries.flatMap((e) => e.tags.map((t) => ({ id: `p:${e.id}->t:${t}`, source: `p:${e.id}`, target: `t:${t}` })));
  const tagOf = (l: Link) => (typeof l.target === 'string' ? l.target : l.target.id).slice(2);
  const end = (x: string | Node) => (typeof x === 'string' ? byId.get(x)! : x);

  // full size: the scale at which the nodes' rooms fill FILL of the disc (the genres are the rim, not in it)
  const area = nodes.filter((n) => !n.genre).reduce((a, n) => a + 4 * n.bw * n.bh, 0);
  const full = inner * Math.sqrt((FILL * Math.PI) / area);

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
  const sim = forceSimulation<Node>(nodes)
    .stop()
    .alphaDecay(0)
    .velocityDecay(0.4)
    .force('link', link)
    // every node keeps its neighbours off: a near field around its box …
    .force('near', nearField(nodes, 0.6, 0.2))
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
      // (and round, as its wheel is: as wide as it's tall — the whole cloud stretched a little, groups and all)
      const k = 0.2;
      const sx = Math.sqrt(inside.reduce((a, n) => a + n.x! * n.x!, 0) / inside.length) || 1;
      const sy = Math.sqrt(inside.reduce((a, n) => a + n.y! * n.y!, 0) / inside.length) || 1;
      const r = Math.sqrt(sy / sx);
      for (const n of inside) {
        n.x! *= 1 + k * (r - 1);
        n.y! *= 1 + k * (1 / r - 1);
      }
    })
  // and nothing past the rim's inner edge, by each one's own size (after every step: a hard edge)
  const disc = () => {
    for (const n of nodes) {
      if (n.genre) continue;
      const d = Math.hypot(n.x!, n.y!);
      const max = Math.max(0, inner - Math.hypot(n.w, n.h));
      if (d <= max) continue;
      n.x! *= max / d;
      n.y! *= max / d;
      n.vx! *= 0.5;
      n.vy! *= 0.5;
    }
  };
  let scale = 0;
  const grow = (s: number) => {
    scale = s;
    for (const n of nodes) {
      n.w = n.genre ? 0 : n.bw * s;
      n.h = n.genre ? 0 : n.bh * s;
    }
    // (to touching: side by side or one above the other, somewhere between)
    link.distance((l) => {
      const [a, b] = [end(l.source), end(l.target)];
      return (a.h + b.h) * 1.1 + (a.w + b.w) * 0.3;
    });
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
      // … and an exclusion zone: no two boxes overlap (the rim's edge and the zone, taken in turns till both hold)
      for (let k = 0; k < 3; k++) {
        exclude(nodes);
        disc();
      }
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
    // each piece's wheel: the room free around it, half the way to the next piece (zoomed in, it grows behind
    // its title, the tags' words over it: wheels never overlap) — and no larger than a few titles high
    const pieces = nodes.filter((n) => n.id.startsWith('p:'));
    const wheel = new Map(
      pieces.map((a) => {
        let r = a.h * 2.2;
        for (const b of pieces) if (b !== a) r = Math.min(r, Math.hypot(b.x! - a.x!, b.y! - a.y!) / 2);
        return [a.id, r];
      }),
    );
    const sizes = [...wheel.values()].sort((a, b) => a - b);
    return { at, x0: -m, y0: -m, w: 2 * m, h: 2 * m, edges, hue, count, sat, ring, wheel, piece: sizes[sizes.length >> 1] ?? 0, tagScale: scale, fullScale: full, done: i >= total };
  };
  return { total, tick, snapshot };
}

/**
 * Near-field repulsion between boxes: each pair nearer than `reach` × their summed half-sizes (both ways)
 * pushes apart, harder the deeper in, along the way out that's shortest; beyond that, nothing (no
 * long-range charge: neighbours, not the whole wheel).
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
        const ox = (a.w + b.w) * (1 + reach) - Math.abs(dx);
        const oy = (a.h + b.h) * (1 + reach) - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        // (straight apart, by how deep in — so the cloud spreads every way, not into columns; each gives
        // way by the other's share: the smaller moves more)
        const wa = (b.w * b.h + 1) / (a.w * a.h + b.w * b.h + 2);
        const deep = Math.min(ox / ((a.w + b.w) * (1 + reach)), oy / ((a.h + b.h) * (1 + reach)));
        const d = Math.hypot(dx, dy) || 1e-3;
        const k = (strength * alpha * deep * (a.w + b.w + a.h + b.h)) / d;
        a.vx! -= dx * k * wa;
        a.vy! -= dy * k * wa;
        b.vx! += dx * k * (1 - wa);
        b.vy! += dy * k * (1 - wa);
      }
  };
}

/** The exclusion zone: no two boxes overlap — any that do are set apart, just far enough. */
function exclude(nodes: readonly Node[]) {
  for (let pass = 0; pass < 3; pass++)
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.genre || b.genre) continue;
        const dx = b.x! - a.x! || 1e-6 * (j - i);
        const dy = b.y! - a.y!;
        const ox = a.w + b.w - Math.abs(dx);
        const oy = a.h + b.h - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        const wa = (b.w * b.h + 1) / (a.w * a.h + b.w * b.h + 2);
        // (out along dx, dy: the part t of the way that clears one axis — the nearer to clear)
        // (the shorter way out — sideways unless up or down is less than half as far: pills are wide,
        // and set apart only the shortest way they'd stack into a column)
        if (ox < oy * 2) {
          const s = ox * (dx < 0 ? -1 : 1);
          a.x! -= s * wa;
          b.x! += s * (1 - wa);
        } else {
          const s = oy * (dy < 0 ? -1 : 1);
          a.y! -= s * wa;
          b.y! += s * (1 - wa);
        }
      }
}
