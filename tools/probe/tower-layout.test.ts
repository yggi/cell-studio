// Probe (not part of the gate): the tower layout (src/layout/towerlayout.ts, docs/notes/tower-strip.md) against the
// signal path's, over the library, three seeds. Each example laid out as the app lays it out (500 ticks, layNet):
// today; today without the card's node (the same edges the tower layout draws, so crossings compare like for like);
// the tower layout (heights held, its few forces); the tower layout with today's forces. Measured: crossings and their
// cost between drawn edges, area, overlaps, and the tower's own nets into the strip (one a base frequency): what their
// trunks cross (cells in their way, drawn edges; not each other) and how long they are.
// Run: PROBE=out.txt npx vitest run tools/probe/tower-layout.test.ts   (ONLY=word: the examples with it in their key;
// VARIANTS=0,2: only those rows; SEEDS=0,1,2; TICKS=500; TIMES=1: where the time went; COMPARE=1: crossings by piece,
// the first two variants picked). On every core: node tools/probe/parallel.mjs out.txt (the same variables)
import { describe, it } from 'vitest';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { ForceLayout } from '../../src/layout/physics';
import { type GraphModel } from '../../src/engine/graph';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '../../src/engine/compile';
import { PRESETS } from '../../src/engine/presets';
import { TOWER_LAYOUT, type LayoutOptions } from '../../src/layout/options';
import { netPaths, socketHeights, towerHeights, towerIns, towerLayers, towerNets, towerOuts, withoutCard, withSockets } from '../../src/layout/towerlayout';

// (how long each layout runs: TICKS=160, a miniature's glimpse, is a third faster and ranks the variants alike, but
// squeezes their differences: for a quick look only — docs/notes/tower-strip.md)
const TICKS = Number(process.env.TICKS ?? 500);
const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');

// (hold, with layers: what is held at its height, not drawn there — towerLayers' sockets and kits, the sockets alone, none)
type Variant = {
  name: string;
  tower: boolean;
  card: boolean;
  opts: Partial<LayoutOptions>;
  sockets?: boolean;
  layers?: boolean;
  hold?: 'all' | 'sockets' | 'none';
  strata?: false;
  mixers?: false;
};
// (the few forces first tried)
const FEW: Partial<LayoutOptions> = { rankPull: 0, columnPull: 0, upPull: 0, spread: 0, kindRepel: 0, tagPull: 0, tagRepel: 0, mux: 0, clusters: false, rowOrder: 0, placeLast: 0 };
const VARIANTS: Variant[] = [
  { name: 'today (the signal path)', tower: false, card: true, opts: {} },
  { name: 'today, no card node', tower: false, card: false, opts: {} },
  { name: 'tower, few forces (as first built)', tower: true, card: false, opts: FEW },
  { name: 'tower, TOWER_LAYOUT', tower: true, card: false, opts: TOWER_LAYOUT },
  { name: 'tower, TOWER_LAYOUT, a socket each into the card', tower: true, card: false, opts: TOWER_LAYOUT, sockets: true },
  // the layers (tables, structure, voices, the audible: sockets only), held or drawn by a scale force
  { name: 'layers, held', tower: true, card: false, opts: TOWER_LAYOUT, sockets: true, layers: true },
  { name: 'layers, pull .02', tower: true, card: false, opts: { ...TOWER_LAYOUT, heightPull: 0.02 }, sockets: true, layers: true },
  { name: 'layers, pull .05, taps as traces', tower: true, card: false, opts: { ...TOWER_LAYOUT, heightPull: 0.05, tapLoom: false }, sockets: true, layers: true },
  {
    name: 'layers, pull .05, taps as a loom, sockets above their sources (TOWER_LAYOUT)',
    tower: true,
    card: false,
    opts: { ...TOWER_LAYOUT, heightPull: 0.05 },
    sockets: true,
    layers: true,
  },
  { name: 'sockets where the forces put them (as before)', tower: true, card: false, opts: { ...TOWER_LAYOUT, socketsAbove: false }, sockets: true, layers: true },
  { name: 'sockets held, kits drawn to the voices (as before)', tower: true, card: false, opts: TOWER_LAYOUT, sockets: true, layers: true, hold: 'sockets' },
  { name: 'strata not strict (as before)', tower: true, card: false, opts: TOWER_LAYOUT, sockets: true, layers: true, strata: false },
  {
    name: 'all four off (as before)',
    tower: true,
    card: false,
    opts: { ...TOWER_LAYOUT, contract: 0.75, flatNets: 0, loomClear: false, loomRide: 1 },
    sockets: true,
    layers: true,
    mixers: false,
  },
  { name: 'only the loom ride .2', tower: true, card: false, opts: { ...TOWER_LAYOUT, contract: 0.75, flatNets: 0, loomClear: false }, sockets: true, layers: true, mixers: false },
  { name: 'only the loom kept clear', tower: true, card: false, opts: { ...TOWER_LAYOUT, contract: 0.75, flatNets: 0, loomRide: 1 }, sockets: true, layers: true, mixers: false },
  { name: 'mixes with the voices (no mixer stratum)', tower: true, card: false, opts: TOWER_LAYOUT, sockets: true, layers: true, mixers: false },
  { name: 'contract .75 (as before)', tower: true, card: false, opts: { ...TOWER_LAYOUT, contract: 0.75 }, sockets: true, layers: true },
  { name: 'contract .2', tower: true, card: false, opts: { ...TOWER_LAYOUT, contract: 0.2 }, sockets: true, layers: true },
  { name: 'flat nets off', tower: true, card: false, opts: { ...TOWER_LAYOUT, flatNets: 0 }, sockets: true, layers: true },
  { name: 'flat nets .3', tower: true, card: false, opts: { ...TOWER_LAYOUT, flatNets: 0.3 }, sockets: true, layers: true },
  { name: 'upright .01', tower: true, card: false, opts: { ...TOWER_LAYOUT, upright: 0.01 }, sockets: true, layers: true },
  { name: 'upright .05', tower: true, card: false, opts: { ...TOWER_LAYOUT, upright: 0.05 }, sockets: true, layers: true },
  { name: 'loom not kept clear', tower: true, card: false, opts: { ...TOWER_LAYOUT, loomClear: false }, sockets: true, layers: true },
  { name: 'loom ride as a join (1)', tower: true, card: false, opts: { ...TOWER_LAYOUT, loomRide: 1 }, sockets: true, layers: true },
  { name: 'nothing held, all drawn to their heights', tower: true, card: false, opts: TOWER_LAYOUT, sockets: true, layers: true, hold: 'none' },
  { name: 'loom, in order .02', tower: true, card: false, opts: { ...TOWER_LAYOUT, loomOrder: 0.02 }, sockets: true, layers: true },
  { name: 'loom, in order .05', tower: true, card: false, opts: { ...TOWER_LAYOUT, loomOrder: 0.05 }, sockets: true, layers: true },
  { name: 'loom, in order .1', tower: true, card: false, opts: { ...TOWER_LAYOUT, loomOrder: 0.1 }, sockets: true, layers: true },
  { name: 'loom, in order .2', tower: true, card: false, opts: { ...TOWER_LAYOUT, loomOrder: 0.2 }, sockets: true, layers: true },
  { name: 'layers, pull .1', tower: true, card: false, opts: { ...TOWER_LAYOUT, heightPull: 0.1 }, sockets: true, layers: true },
  { name: 'layers, pull .2', tower: true, card: false, opts: { ...TOWER_LAYOUT, heightPull: 0.2 }, sockets: true, layers: true },
  { name: "layers, pull .05, today's rows too", tower: true, card: false, opts: { heightPull: 0.05, placeLast: 0 }, sockets: true, layers: true },
  { name: "tower, today's forces", tower: true, card: false, opts: {} },
  // a middle set: one of today's forces back at a time, then together (meters last now held to their row)
  { name: '… + spread', tower: true, card: false, opts: { ...FEW, spread: 0.5 } },
  { name: '… + columns', tower: true, card: false, opts: { ...FEW, columnPull: 0.035 } },
  { name: '… + row trials', tower: true, card: false, opts: { ...FEW, rowOrder: 3 } },
  { name: '… + meters last (on their row)', tower: true, card: false, opts: { ...FEW, placeLast: 1 } },
  { name: '… + row trials, spread, columns', tower: true, card: false, opts: { ...FEW, rowOrder: 3, spread: 0.5, columnPull: 0.035 } },
  { name: '… + row trials, spread, columns, meters last', tower: true, card: false, opts: { ...FEW, rowOrder: 3, spread: 0.5, columnPull: 0.035, placeLast: 1 } },
  // today's forces, the meters where the forces leave them
  { name: "tower, today's forces, no meters last", tower: true, card: false, opts: { placeLast: 0 } },
  { name: '… and no kinds apart', tower: true, card: false, opts: { placeLast: 0, kindRepel: 0 } },
  { name: '… and no tags', tower: true, card: false, opts: { placeLast: 0, tagPull: 0, tagRepel: 0, mux: 0, clusters: false } },
];

interface Row {
  crossings: number;
  cost: number;
  area: number;
  overlap: number;
  /** The tower's wires into the strips: how many, the cells they pass over, the drawn edges they cross, their length (px). */
  wires: number;
  overCells: number;
  /** Of those, cells with no height (they can move off a row). */
  overFree: number;
  /** Hops the routed wires make round cells, and how much longer they are for it (px). */
  hops: number;
  overEdges: number;
  length: number;
  /** How far, on average, a node with a height ended from it (decades), and the most. */
  off: number;
  offMax: number;
  /** Nodes outside their stratum (px past its edge), and cells a selector steps that sit under its loom's top lane. */
  strays: number;
  underLoom: number;
  /** Nodes held at a height, and all nodes laid out. */
  held: number;
  nodes: number;
}

type Placed = {
  nodes: { id: string; x: number; y: number; r: number; label?: boolean; of?: string }[];
  edges: { a: string; b: string }[];
};

/** Does the level segment at y from x0 to x1 cross the straight segment p–q? */
function crossesLevel(y: number, x0: number, x1: number, p: { x: number; y: number }, q: { x: number; y: number }): boolean {
  if ((p.y - y) * (q.y - y) >= 0) return false;
  const x = p.x + ((q.x - p.x) * (y - p.y)) / (q.y - p.y);
  return x > Math.min(x0, x1) && x < Math.max(x0, x1);
}

// (each piece compiled once, not for every variant and seed. Its rows' order is still tried for every seed, as the
// app tries it: one order chosen once, as the examples' are for the miniatures, crossed 59.3 against 45.7)
const compiled = new Map<string, { program: ReturnType<typeof compileSource>; whole: GraphModel }>();
const T: Record<string, number> = {};
const lap = (k: string, t0: number) => ((T[k] = (T[k] ?? 0) + performance.now() - t0), performance.now());
function measure(source: string, v: Variant, seed: number): Row {
  let t0 = performance.now();
  if (!compiled.has(source)) {
    const program = compileSource(source);
    compiled.set(source, { program, whole: buildGraph(program) });
  }
  const { program, whole } = compiled.get(source)!;
  t0 = lap('compile', t0);
  const model: GraphModel = v.card ? whole : v.sockets ? withSockets(whole) : withoutCard(whole);
  const layered = v.layers ? towerLayers(program, whole, model, { mixers: v.mixers !== false }) : null;
  const held = layered && v.hold !== 'none' ? new Set([...layered.held].filter((id) => v.hold !== 'sockets' || id.startsWith('socket:'))) : undefined;
  const heights = layered ? layered.targets : v.tower ? new Map([...towerHeights(program, model), ...(v.sockets ? socketHeights(program, whole, model) : [])]) : undefined;
  const outs = towerOuts(program, whole);
  const l = new ForceLayout(undefined, {
    live: false,
    seed,
    ...v.opts,
    ...(heights ? { heights } : {}),
    ...(held ? { held } : {}),
    ...(layered && v.strata !== false ? { strata: layered.strata } : {}),
    ...(layered ? { between: layered.between } : {}),
  });
  l.setGraph({ ...model, nodes: model.nodes.filter((n) => !n.petalOf) });
  t0 = lap('setGraph', t0);
  l.tick(TICKS);
  t0 = lap('ticks', t0);
  l.layNet();
  t0 = lap('layNet', t0);
  const q = l.quality();
  lap('quality', t0);
  const row: Row = {
    crossings: q.crossings,
    cost: q.cost,
    area: (q.width * q.height) / 1e6,
    overlap: q.overlap > 1 ? 1 : 0,
    wires: 0,
    overCells: 0,
    overFree: 0,
    hops: 0,
    overEdges: 0,
    length: 0,
    held: heights?.size ?? 0,
    off: 0,
    offMax: 0,
    strays: 0,
    underLoom: 0,
    nodes: model.nodes.filter((n) => !n.petalOf).length,
  };
  if (heights?.size) {
    const offs = [...heights].flatMap(([id, y]) => {
      const p = l.position(id);
      return p ? [Math.abs(p.y - y) / 360] : [];
    });
    row.off = offs.reduce((a, b) => a + b, 0) / Math.max(1, offs.length);
    row.offMax = Math.max(0, ...offs);
  }
  if (layered) {
    for (const [id, [top, bottom]] of layered.strata) {
      const p = l.position(id);
      if (p && (p.y < top - 1 || p.y > bottom + 1)) row.strays++;
    }
    // (a loom's top lane: its strands' highest; what it steps, its wheel's lower edge over it)
    const radius = new Map((l as unknown as { placed(): Placed }).placed().nodes.map((n) => [n.id, n.r]));
    for (const { strands } of l.tapLooms()) {
      const lane = Math.min(...strands.map((st) => st.pieces[1][1]));
      for (const id of new Set(strands.filter((st) => st.tap >= 0).map((st) => st.to))) {
        const p = l.position(id);
        if (p && p.y + (radius.get(id) ?? 0) * 0.7 > lane + 1) row.underLoom++;
      }
    }
  }
  if (v.tower && !v.sockets) {
    const placed = (l as unknown as { placed(): Placed }).placed();
    const at = new Map(placed.nodes.map((n) => [n.id, n]));
    // (the strip stands just outside the graph's box, at its right)
    const cells = placed.nodes.filter((n) => !n.label);
    const xr = Math.max(...cells.map((n) => n.x + n.r)) + 40;
    // (a voice's room is its wheel and its label: its body, the part a wire visibly crosses, about 0.7 of it)
    const obstacles = placed.nodes
      .filter((n) => !n.label || n.of)
      .map((n) => ({ of: n.of ?? n.id, x0: n.x - n.r * 0.7, x1: n.x + n.r * 0.7, top: n.y - n.r * 0.7, bottom: n.y + n.r * 0.7 }));
    const ins = towerIns(outs, program, (id) => {
      const n = at.get(id);
      return n && { x: n.x, y: n.y, height: n.r * 1.4 };
    });
    // one net a base frequency, its trunk from its first source to the strip at the right (its wires crossing each
    // other don't count: they are one bus into the card)
    for (const net of towerNets(ins)) {
      const own = new Set(net.taps.map((t) => t.from));
      const x0 = net.taps[0].x;
      row.wires++;
      row.length += xr - x0;
      for (const n of placed.nodes) {
        if (own.has(n.id) || own.has(n.of ?? '') || (n.label && !n.of)) continue;
        if (Math.abs(n.y - net.top) < n.r * 0.7 && n.x > x0 && n.x < xr) {
          row.overCells++;
          if (!heights!.has(n.of ?? n.id)) row.overFree++;
        }
      }
      row.hops += netPaths(net, xr, obstacles).hops;
      for (const e of placed.edges) {
        if (own.has(e.a) || own.has(e.b)) continue;
        const p = at.get(e.a);
        const r = at.get(e.b);
        if (p && r && crossesLevel(net.top, x0, xr, p, r)) row.overEdges++;
      }
    }
  }
  l.destroy();
  return row;
}

/** One layout measured: which variant, which piece, which seed. */
type Measured = { variant: string; key: string; seed: number; row: Row };

/** The table and the pieces most hurt, from every layout measured (one run's, or the shards' merged). */
function report(all: readonly Measured[], variants: readonly Variant[], pieces: number, seeds: readonly number[]): void {
  log(`# The tower layout (${pieces} pieces × ${seeds.length} seeds; library sums, mean over seeds)\n`);
  log(
    '| layout | crossings | cost | area Mpx² | pieces with an overlap | nets into the strip | over a cell (of them free) | hops routed | over an edge | wire length kpx | off its height, decades (mean, most) | out of its stratum | under its loom |',
  );
  log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const perPiece = new Map<string, Map<string, Row>>();
  let held = 0;
  let nodes = 0;
  for (const v of variants) {
    const mine = all.filter((m) => m.variant === v.name);
    const rows = mine.map((m) => m.row);
    for (const { key, seed, row: r } of mine) {
      const m = perPiece.get(key) ?? new Map<string, Row>();
      const acc = m.get(v.name);
      m.set(v.name, acc ? { ...acc, crossings: acc.crossings + r.crossings, overCells: acc.overCells + r.overCells, overEdges: acc.overEdges + r.overEdges } : { ...r });
      perPiece.set(key, m);
      if (v.tower && seed === seeds[0] && v === variants.find((x) => x.tower)) {
        held += r.held;
        nodes += r.nodes;
      }
    }
    const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + f(r), 0) / seeds.length;
    const t = v.tower;
    log(
      `| ${v.name} | ${sum((r) => r.crossings).toFixed(1)} | ${sum((r) => r.cost).toFixed(1)} | ${sum((r) => r.area).toFixed(1)} | ${sum((r) => r.overlap).toFixed(1)} | ${t ? sum((r) => r.wires).toFixed(0) : '—'} | ${t ? `${sum((r) => r.overCells).toFixed(1)} (${sum((r) => r.overFree).toFixed(1)})` : '—'} | ${t ? sum((r) => r.hops).toFixed(1) : '—'} | ${t ? sum((r) => r.overEdges).toFixed(1) : '—'} | ${t ? (sum((r) => r.length) / 1000).toFixed(0) : '—'} | ${t ? `${(sum((r) => r.off) / pieces).toFixed(3)}, ${Math.max(...rows.map((r) => r.offMax)).toFixed(2)}` : '—'} | ${t ? sum((r) => r.strays).toFixed(1) : '—'} | ${t ? sum((r) => r.underLoom).toFixed(1) : '—'} |`,
    );
  }
  if (process.env.TIMES)
    log(
      `\ntimes (s): ${Object.entries(T)
        .map(([k, t]) => `${k} ${(t / 1000).toFixed(1)}`)
        .join(', ')}`,
    );
  if (nodes) log(`\nheld at a height: ${held} of ${nodes} nodes (${Math.round((100 * held) / nodes)} %)`);
  // the pieces the tower layout helps or hurts most, crossings against today without the card (mean of the seeds);
  // COMPARE: the first two variants picked
  const [base, tower] = process.env.COMPARE ? variants : [variants.find((v) => !v.tower && !v.card), variants.find((v) => v.opts === TOWER_LAYOUT)];
  if (!base || !tower) return;
  const d = [...perPiece]
    .map(([k, m]) => ({
      k,
      base: (m.get(base.name)?.crossings ?? 0) / seeds.length,
      tower: (m.get(tower.name)?.crossings ?? 0) / seeds.length,
      cells: (m.get(tower.name)?.overCells ?? 0) / seeds.length,
      edges: (m.get(tower.name)?.overEdges ?? 0) / seeds.length,
    }))
    .sort((a, b) => b.tower - b.base - (a.tower - a.base) || a.k.localeCompare(b.k));
  log(`\ncrossings by piece, ${base.name} → ${tower.name} (+ its wires over cells / over edges), the most hurt first:`);
  for (const r of d.slice(0, 10)) log(`  ${r.k.padEnd(28)} ${r.base.toFixed(1)} → ${r.tower.toFixed(1)}  (+${r.cells.toFixed(1)} / +${r.edges.toFixed(1)})`);
  log('  …');
  for (const r of d.slice(-6)) log(`  ${r.k.padEnd(28)} ${r.base.toFixed(1)} → ${r.tower.toFixed(1)}  (+${r.cells.toFixed(1)} / +${r.edges.toFixed(1)})`);
  log(`\nwaltz: ${JSON.stringify(d.find((r) => r.k.includes('waltz')))}`);
}

// (SHARD=k/n: every n-th piece from the k-th, its layouts written raw to PROBE as JSON; MERGE=a.json,b.json,…: the
// shards' layouts read back and reported as one run. tools/probe/parallel.mjs runs the shards side by side, then the
// merge: the same numbers, a core each)
describe.runIf(process.env.PROBE)('the tower layout', () => {
  it('measures the library', () => {
    const only = process.env.ONLY;
    const all = Object.entries(PRESETS).filter(([k]) => !only || k.toLowerCase().includes(only.toLowerCase()));
    const pick = process.env.VARIANTS?.split(',').map(Number);
    const variants = pick ? VARIANTS.filter((_, i) => pick.includes(i)) : VARIANTS;
    const seeds = (process.env.SEEDS ?? '0,1,2').split(',').map(Number);
    if (process.env.MERGE) {
      const measured = process.env.MERGE.split(',').flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as Measured[]);
      report(measured, variants, all.length, seeds);
      return;
    }
    const [k, n] = (process.env.SHARD ?? '0/1').split('/').map(Number);
    const pieces = all.filter((_, i) => i % n === k);
    const measured: Measured[] = [];
    for (const v of variants) for (const seed of seeds) for (const [key, p] of pieces) measured.push({ variant: v.name, key, seed, row: measure(p.source, v, seed) });
    if (process.env.SHARD) writeFileSync(process.env.PROBE!, JSON.stringify(measured));
    else report(measured, variants, all.length, seeds);
  }, 3_600_000);
});
