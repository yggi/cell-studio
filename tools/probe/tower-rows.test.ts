// Probe (not part of the gate): rows by the frequency tower (src/layout/tower.ts, docs/notes/multiscale.md) against
// today's rows by the signal path. Every example laid out as the app does, three seeds; measured: crossings, cost, area,
// which way wires leave along the flow, how faithfully height follows the tower (Spearman's ρ between −y and the tower,
// over the nodes with a finite height), and where the selectors land.
// Run: PROBE=out.txt npx vitest run tools/probe/tower-rows.test.ts   (ONLY=word: the examples with it in their key; PIECES=a,b: those;
// VARIANTS=0,1: only those rows)
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { ForceLayout } from '../../src/layout/physics';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '@yggi/cells/engine/compile';
import { PRESETS } from '@yggi/cells/engine/presets';
import { towerOf, towerRanks, zoneRanks, type TowerAt } from '../../src/layout/tower';
import { flowRanks } from '../../src/layout/ranks';
import type { LayoutOptions } from '../../src/layout/options';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
/** The wires that run down, by why (summed over every piece and seed of a variant). */
const downBy = new Map<string, number>();
const fromUp = (dx: number, dy: number) => (Math.acos(-dy / (Math.hypot(dx, dy) || 1)) * 180) / Math.PI;

/** Spearman's rank correlation of two equally long lists. */
function spearman(a: readonly number[], b: readonly number[]): number {
  const ranks = (xs: readonly number[]) => {
    const order = xs.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(xs.length);
    for (let i = 0; i < order.length;) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const [ra, rb] = [ranks(a), ranks(b)];
  const n = a.length;
  const m = (n - 1) / 2;
  let num = 0,
    da = 0,
    db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - m) * (rb[i] - m);
    da += (ra[i] - m) ** 2;
    db += (rb[i] - m) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** How faithfully height follows the tower: Spearman's ρ between −y and the tower, over the nodes with a finite height. */
function rhoOf(model: ReturnType<typeof buildGraph>, l: ForceLayout, tower: ReadonlyMap<string, number>): number {
  const finite = model.nodes.flatMap((n) => {
    const p = l.position(n.id);
    const t = tower.get(n.id);
    return p && !n.petalOf && t !== undefined && Number.isFinite(t) ? [{ y: p.y, t }] : [];
  });
  return spearman(
    finite.map((p) => -p.y),
    finite.map((p) => p.t),
  );
}

interface Row {
  /** ρ at the start (the layered drawing), before the physics. */
  rhoStart: number;
  crossings: number;
  cost: number;
  area: number;
  wires: number;
  up: number;
  down: number;
  rho: number;
  /** Each selector's height among the piece's nodes: 0 the lowest, 1 the highest. */
  selectors: number[];
}

function measure(source: string, at: TowerAt | null, perDecade: number, seed: number, more: Partial<LayoutOptions>): Row {
  const program = compileSource(source);
  const model = buildGraph(program);
  const tower = towerOf(program, model, at ?? 'step');
  // (perDecade 0: the tower's zones, ordered within by the signal path)
  const rows = !at ? undefined : perDecade ? towerRanks(tower, perDecade) : zoneRanks(tower, flowRanks(model));
  const opts: Partial<LayoutOptions> = { live: false, seed, ...more, ...(rows ? { ranks: rows } : {}) };
  const l = new ForceLayout(undefined, opts);
  l.setGraph(model);
  const rhoStart = rhoOf(model, l, tower);
  l.tick(500);
  l.layNet();
  const q = l.quality();
  let wires = 0,
    up = 0,
    down = 0;
  for (const e of model.edges) {
    if (e.port === 'about' || e.port === 'is' || (e.band === 'sync' && !e.belt)) continue;
    const a = l.position(e.from);
    const b = l.position(e.to);
    if (!a || !b) continue;
    const angle = fromUp(b.x - a.x, b.y - a.y);
    wires++;
    if (angle < 45) up++;
    if (angle > 135) {
      down++;
      // (why it runs down: its port, and whether it carries sound into a selector's table of parts or the selector)
      const fromCell = model.nodes.find((n) => n.id === e.from)?.cell;
      const toCell = model.nodes.find((n) => n.id === e.to)?.cell;
      const why =
        e.port === 'braid' && fromCell?.mix
          ? "braid (a part's sound into its table of parts)"
          : e.band === 'audio' && toCell?.mix === null
            ? `${e.port} (sound into a cell that isn't a mix: a tape, a resonator, a selector)`
            : `${e.port} (${e.band})`;
      downBy.set(why, (downBy.get(why) ?? 0) + 1);
    }
  }
  const placed = model.nodes.flatMap((n) => {
    const p = l.position(n.id);
    return p && !n.petalOf ? [{ id: n.id, y: p.y }] : [];
  });
  const rho = rhoOf(model, l, tower);
  // (a selector: over= reads a table of taps (decision 016), or, written the old way, a table whose entries are all mixes)
  const mixes = new Set(model.edges.filter((e) => e.port === 'mix').map((e) => e.to));
  const tables = new Set(program.taps?.values() ?? []);
  const parts = new Set(
    model.nodes
      .filter((n) => n.cell && (tables.has(n.cell.name) || (n.cell.units.length && n.cell.units.every((u) => u.atom.kind === 'ref' && mixes.has(`cell:${u.atom.name}`)))))
      .map((n) => n.id),
  );
  const ys = placed.map((p) => -p.y).sort((x, y) => x - y);
  const selectors = model.edges
    .filter((e) => e.port === 'over' && parts.has(e.from))
    .flatMap((e) => {
      const p = l.position(e.to);
      return p ? [ys.filter((y) => y < -p.y).length / Math.max(1, ys.length - 1)] : [];
    });
  l.destroy();
  return { rhoStart, crossings: q.crossings, cost: q.cost, area: (q.width * q.height) / 1e6, wires, up, down, rho, selectors };
}

describe.runIf(process.env.PROBE)('rows by the frequency tower', () => {
  it('measures the library', () => {
    const only = process.env.ONLY;
    // (PIECES=a,b: exactly those examples, by key)
    const named = process.env.PIECES?.split(',');
    const pieces = Object.entries(PRESETS).filter(([k]) => (!only || k.toLowerCase().includes(only.toLowerCase())) && (!named || named.includes(k)));
    const held = { rankPull: 0.3 };
    const variants: [string, TowerAt | null, number, Partial<LayoutOptions>][] = [
      ['today (rows by the signal path)', null, 1, {}],
      ['tower by step, 1 row a decade', 'step', 1, {}],
      ['tower by step, 2 rows a decade', 'step', 2, {}],
      ['tower by turn, 1 row a decade', 'turn', 1, {}],
      ['tower by mid, 2 rows a decade', 'mid', 2, {}],
      ['today, rows held (rankPull 0.3)', null, 1, held],
      ['tower by step, rows held (rankPull 0.3)', 'step', 1, held],
      ['tower, each node where its output lives (emit)', 'emit', 1, {}],
      ['zones by the tower (emit), the signal path within', 'emit', 0, {}],
      ['zones by the tower (step), the signal path within', 'step', 0, {}],
    ];
    // (VARIANTS=0,1: only those rows of the table)
    const pick = process.env.VARIANTS?.split(',').map(Number);
    if (pick) variants.splice(0, variants.length, ...variants.filter((_, i) => pick.includes(i)));
    const seeds = [0, 1, 2];
    log(`# Rows by the tower (${pieces.length} pieces × ${seeds.length} seeds)\n`);
    log("| rows | crossings | cost | area Mpx² | wires up / down | ρ start → settled | selectors' height |");
    log('|---|---|---|---|---|---|---|');
    const perPiece = new Map<string, Map<string, number>>();
    for (const [name, at, perDecade, more] of variants) {
      const rows: Row[] = [];
      for (const seed of seeds)
        for (const [key, p] of pieces) {
          const r = measure(p.source, at, perDecade, seed, more);
          rows.push(r);
          const m = perPiece.get(key) ?? new Map<string, number>();
          m.set(name, (m.get(name) ?? 0) + r.crossings / seeds.length);
          perPiece.set(key, m);
        }
      const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + f(r), 0);
      const W = sum((r) => r.wires);
      const sel = rows.flatMap((r) => r.selectors);
      const pct = (x: number) => `${Math.round((100 * x) / (W || 1))} %`;
      log(
        `| ${name} | ${(sum((r) => r.crossings) / seeds.length).toFixed(1)} | ${(sum((r) => r.cost) / seeds.length).toFixed(1)} | ${(sum((r) => r.area) / seeds.length).toFixed(1)} | ${pct(sum((r) => r.up))} / ${pct(sum((r) => r.down))} | ${(sum((r) => r.rhoStart) / rows.length).toFixed(2)} → ${(sum((r) => r.rho) / rows.length).toFixed(2)} | ${sel.length ? (sel.reduce((a, b) => a + b, 0) / sel.length).toFixed(2) : '—'} |`,
      );
      if (at && at !== 'mid' && perDecade === 1 && !Object.keys(more).length) {
        log(`\n  wires running down with ${name}, by port (per seed):`);
        for (const [k, n] of [...downBy].sort((a, b) => b[1] - a[1]).slice(0, 10)) log(`    ${k.padEnd(48)} ${(n / seeds.length).toFixed(1)}`);
        log('');
      }
      downBy.clear();
    }
    // (with today's row and the tower's, by step, both measured)
    if (variants.length < 2 || variants[0][1] !== null || variants[1][1] !== 'step') return;
    // the pieces the tower helps or hurts most (crossings, mean of the seeds): by step, 1 row a decade, against today
    const [today, tower] = [variants[0][0], variants[1][0]];
    const deltas = [...perPiece].map(([k, m]) => [k, (m.get(tower) ?? 0) - (m.get(today) ?? 0), m.get(today) ?? 0] as const).sort((a, b) => a[1] - b[1]);
    // (split: the pieces arranged by a selector against the rest)
    const withSelector = new Set(pieces.filter(([, p]) => measure(p.source, null, 1, 0, {}).selectors.length).map(([k]) => k));
    for (const name of [today, tower]) {
      const total = (keep: (k: string) => boolean) => [...perPiece].filter(([k]) => keep(k)).reduce((n, [, m]) => n + (m.get(name) ?? 0), 0);
      log(
        `\n${name}: crossings in the ${withSelector.size} pieces with a selector ${total((k) => withSelector.has(k)).toFixed(1)}, in the other ${pieces.length - withSelector.size} ${total((k) => !withSelector.has(k)).toFixed(1)}`,
      );
    }
    log(`\nPer piece, crossings today → tower by step (the five best and worst):`);
    for (const [k, d, t] of deltas.length > 10 ? [...deltas.slice(0, 5), ...deltas.slice(-5)] : deltas) log(`  ${k.padEnd(14)} ${t.toFixed(1)} → ${(t + d).toFixed(1)}`);
  }, 1_800_000);
});
