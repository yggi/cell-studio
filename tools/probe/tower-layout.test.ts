// Probe (not part of the gate): the tower layout (src/layout/towerlayout.ts, docs/notes/tower-strip.md) against the
// signal path's, over the library, three seeds. Each example laid out as the app lays it out (500 ticks, layNet):
// today; today without the card's node (the same edges the tower layout draws, so crossings compare like for like);
// the tower layout (TOWER_LAYOUT), and it with one of its parts off at a time. Measured: crossings and their cost
// between drawn edges, area, overlaps, how far a node ends from its height, nodes out of their stratum, and cells a
// selector steps that sit under its loom.
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
import { towerLayers, withSockets } from '../../src/layout/towerlayout';

// (how long each layout runs: TICKS=160, a miniature's glimpse, is a third faster and ranks the variants alike, but
// squeezes their differences: for a quick look only — docs/notes/tower-strip.md)
const TICKS = Number(process.env.TICKS ?? 500);
const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');

// (hold: what is held at its height, not drawn there — towerLayers' held, or none)
type Variant = {
  name: string;
  tower: boolean;
  card: boolean;
  opts: Partial<LayoutOptions>;
  hold?: 'none';
  strata?: false;
  mixers?: false;
  lift?: false;
  columns?: false;
};
const VARIANTS: Variant[] = [
  { name: 'today (the signal path)', tower: false, card: true, opts: {} },
  { name: 'today, no card node', tower: false, card: false, opts: {} },
  { name: 'tower (TOWER_LAYOUT)', tower: true, card: false, opts: TOWER_LAYOUT },
  // one part off at a time
  { name: 'taps as traces, no loom', tower: true, card: false, opts: { ...TOWER_LAYOUT, tapLoom: false } },
  { name: 'the loom not kept clear', tower: true, card: false, opts: { ...TOWER_LAYOUT, loomClear: false } },
  { name: 'no mixer stratum', tower: true, card: false, opts: TOWER_LAYOUT, mixers: false },
  { name: 'strata not strict', tower: true, card: false, opts: TOWER_LAYOUT, strata: false },
  { name: 'nothing held, all drawn to their heights', tower: true, card: false, opts: TOWER_LAYOUT, hold: 'none' },
  { name: 'sockets where the forces put them', tower: true, card: false, opts: { ...TOWER_LAYOUT, socketsAbove: false } },
  { name: 'no flat nets', tower: true, card: false, opts: { ...TOWER_LAYOUT, flatNets: 0 } },
  { name: 'nothing fed under', tower: true, card: false, opts: { ...TOWER_LAYOUT, feedUnder: 0, upright: 0 } },
  { name: 'contraction .75', tower: true, card: false, opts: { ...TOWER_LAYOUT, contract: 0.75 } },
  { name: 'no net lead', tower: true, card: false, opts: { ...TOWER_LAYOUT, netLead: 0 } },
  { name: 'net lead .1', tower: true, card: false, opts: { ...TOWER_LAYOUT, netLead: 0.1 } },
  { name: 'no min rise', tower: true, card: false, opts: { ...TOWER_LAYOUT, minRise: 0 } },
  { name: 'min rise 60', tower: true, card: false, opts: { ...TOWER_LAYOUT, minRise: 60 } },
  { name: 'min rise 90', tower: true, card: false, opts: { ...TOWER_LAYOUT, minRise: 90 } },
  { name: 'tables at the bottom, not lifted to their readers', tower: true, card: false, opts: TOWER_LAYOUT, lift: false },
  { name: 'no columns (a voice over its one player)', tower: true, card: false, opts: TOWER_LAYOUT, columns: false },
  { name: "tower, today's forces", tower: true, card: false, opts: { heightPull: 0.05, placeLast: 0 } },
];

interface Row {
  crossings: number;
  cost: number;
  area: number;
  overlap: number;
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
  const model: GraphModel = v.card ? whole : withSockets(whole);
  const layered = v.tower ? towerLayers(program, whole, model, { mixers: v.mixers !== false, lift: v.lift !== false }) : null;
  const held = layered && v.hold !== 'none' ? layered.held : undefined;
  const heights = layered?.targets;
  const l = new ForceLayout(undefined, {
    live: false,
    seed,
    ...v.opts,
    ...(heights ? { heights } : {}),
    ...(held ? { held } : {}),
    ...(layered && v.strata !== false ? { strata: layered.strata } : {}),
    ...(layered ? { between: layered.between, lineUp: layered.lineUp, aside: layered.aside, columns: v.columns === false ? undefined : layered.columns } : {}),
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
      const lane = Math.min(...strands.filter((st) => !st.join).map((st) => st.pieces[1][1]));
      for (const id of new Set(strands.filter((st) => st.tap >= 0).map((st) => st.to))) {
        const p = l.position(id);
        if (p && p.y + (radius.get(id) ?? 0) * 0.7 > lane + 1) row.underLoom++;
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
  log('| layout | crossings | cost | area Mpx² | pieces with an overlap | off its height, decades (mean, most) | out of its stratum | under its loom |');
  log('|---|---|---|---|---|---|---|---|');
  const perPiece = new Map<string, Map<string, Row>>();
  let held = 0;
  let nodes = 0;
  for (const v of variants) {
    const mine = all.filter((m) => m.variant === v.name);
    const rows = mine.map((m) => m.row);
    for (const { key, seed, row: r } of mine) {
      const m = perPiece.get(key) ?? new Map<string, Row>();
      const acc = m.get(v.name);
      m.set(v.name, acc ? { ...acc, crossings: acc.crossings + r.crossings } : { ...r });
      perPiece.set(key, m);
      if (v.tower && seed === seeds[0] && v === variants.find((x) => x.tower)) {
        held += r.held;
        nodes += r.nodes;
      }
    }
    const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + f(r), 0) / seeds.length;
    const t = v.tower;
    log(
      `| ${v.name} | ${sum((r) => r.crossings).toFixed(1)} | ${sum((r) => r.cost).toFixed(1)} | ${sum((r) => r.area).toFixed(1)} | ${sum((r) => r.overlap).toFixed(1)} | ${t ? `${(sum((r) => r.off) / pieces).toFixed(3)}, ${Math.max(...rows.map((r) => r.offMax)).toFixed(2)}` : '—'} | ${t ? sum((r) => r.strays).toFixed(1) : '—'} | ${t ? sum((r) => r.underLoom).toFixed(1) : '—'} |`,
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
    }))
    .sort((a, b) => b.tower - b.base - (a.tower - a.base) || a.k.localeCompare(b.k));
  log(`\ncrossings by piece, ${base.name} → ${tower.name} the most hurt first:`);
  for (const r of d.slice(0, 10)) log(`  ${r.k.padEnd(28)} ${r.base.toFixed(1)} → ${r.tower.toFixed(1)}`);
  log('  …');
  for (const r of d.slice(-6)) log(`  ${r.k.padEnd(28)} ${r.base.toFixed(1)} → ${r.tower.toFixed(1)}`);
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
