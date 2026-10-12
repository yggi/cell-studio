// Feasibility probe (not part of the gate): outputs at 12 o'clock. Measures, over every example as the app lays it out,
// which way each drawn wire leaves its source (relative to straight up), where it comes into its reader, how many wires
// share both ends (they'd overlap: the "bus of buses"), and what a stronger pull to the layered rows does to crossings.
// Run: PROBE=1 npx vitest run tools/probe/outputs-top.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
import { ForceLayout } from '../../src/layout/physics';
import { type GraphModel } from '../../src/engine/graph';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '../../src/engine/compile';
import { PRESETS } from '../../src/engine/presets';
import { DEFAULT_LAYOUT, type LayoutOptions } from '../../src/layout/options';

const deg = (r: number) => (r * 180) / Math.PI;
/** The angle between (dx, dy) and straight up, degrees: 0 up, 90 sideways, 180 down. */
const fromUp = (dx: number, dy: number) => deg(Math.acos(-dy / (Math.hypot(dx, dy) || 1)));

interface Row {
  key: string;
  wires: number;
  up: number;
  side: number;
  down: number;
  /** Mean of how far round the rim a wire leaving at 12 must travel before it heads for its reader, × the source's radius. */
  wrap: number;
  /** Arrivals at the reader from below its equator. */
  inBelow: number;
  /** Pairs of drawn wires (meter traces included) with the same two ends. */
  shared: number;
  crossings: number;
  cost: number;
  height: number;
  width: number;
}

function measure(key: string, source: string, opts: Partial<LayoutOptions>): { row: Row; byPort: Map<string, number[]> } {
  const model: GraphModel = buildGraph(compileSource(source));
  const l = new ForceLayout(undefined, { live: false, ...opts });
  l.setGraph(model);
  l.tick(500);
  l.layNet();
  const s = (l as unknown as { s: { byId: Map<string, { radius: number }>; junctions: Map<string, { radius: number; rides?: string }> } }).s;
  const hop = l.taps();
  const radius = (id: string) => s.byId.get(id)?.radius ?? s.junctions.get(id)?.radius ?? 0;
  const owner = (id: string) => s.junctions.get(id)?.rides ?? id;
  const byPort = new Map<string, number[]>();
  const ends: string[] = [];
  let up = 0,
    side = 0,
    down = 0,
    wrap = 0,
    inBelow = 0,
    wires = 0;
  for (const e of model.edges) {
    if (e.port === 'about' || e.port === 'is' || (e.band === 'sync' && !e.belt)) continue; // (not drawn: notes, a junction's voice, ground)
    const h = hop.get(e.id);
    // (along the flow: from what is read to its reader; a hop leaves the reader it came into)
    const a = h ? { x: h.x, y: h.y } : l.position(e.from);
    const b = l.position(e.to);
    if (!a || !b) continue; // (a bulb: drawn in its braid)
    const mid = h ? undefined : l.bend(e.id);
    const c = mid ? { x: 2 * mid.x - (a.x + b.x) / 2, y: 2 * mid.y - (a.y + b.y) / 2 } : b;
    const out = fromUp(c.x - a.x, c.y - a.y);
    wires++;
    if (out < 45) up++;
    else if (out <= 135) side++;
    else down++;
    wrap += (out * Math.PI) / 180;
    const into = fromUp(a.x - b.x, a.y - b.y);
    if (into > 90) inBelow++;
    const p = byPort.get(e.port) ?? [];
    p.push(out);
    byPort.set(e.port, p);
    ends.push([owner(h?.from ?? e.from), owner(e.to)].sort().join('|'));
    void radius;
  }
  for (const t of l.meterNet()) ends.push([t.a, t.b].sort().join('|'));
  const counts = new Map<string, number>();
  for (const k of ends) counts.set(k, (counts.get(k) ?? 0) + 1);
  const shared = [...counts.values()].reduce((n, c) => n + (c * (c - 1)) / 2, 0);
  const q = l.quality();
  l.destroy();
  return {
    row: { key, wires, up, side, down, wrap: wires ? wrap / wires : 0, inBelow, shared, crossings: q.crossings, cost: q.cost, height: q.height, width: q.width },
    byPort,
  };
}

const pct = (n: number, d: number) => `${((100 * n) / (d || 1)).toFixed(0)}%`;

describe.runIf(process.env.PROBE)('outputs at 12 o’clock', () => {
  it('measures the library', () => {
    const variants: [string, Partial<LayoutOptions>][] = [
      ['today', {}],
      ['spread ½', { spread: DEFAULT_LAYOUT.spread / 2 }],
      ['upPull 0.2, spread ½', { upPull: 0.2, spread: DEFAULT_LAYOUT.spread / 2 }],
      ['upPull 0.5, spread ½', { upPull: 0.5, spread: DEFAULT_LAYOUT.spread / 2 }],
      ['upPull 0.2, spread 0', { upPull: 0.2, spread: 0 }],
    ];
    const only = process.env.ONLY;
    const pieces = Object.entries(PRESETS).filter(([k]) => !only || k.toLowerCase().includes(only.toLowerCase()));
    for (const [name, opts] of variants) {
      const rows: Row[] = [];
      const ports = new Map<string, number[]>();
      for (const seed of [0, 1, 2])
        for (const [key, p] of pieces) {
          const { row, byPort } = measure(key, p.source, { ...opts, seed });
          rows.push(row);
          for (const [k, v] of byPort) ports.set(k, [...(ports.get(k) ?? []), ...v]);
        }
      const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + f(r), 0);
      const W = sum((r) => r.wires);
      const n = rows.length / pieces.length;
      log(
        `\n## ${name} (${pieces.length} pieces × ${n} seeds)\n` +
          `wires ${W / n}: leave up ${pct(
            sum((r) => r.up),
            W,
          )}, sideways ${pct(
            sum((r) => r.side),
            W,
          )}, down ${pct(
            sum((r) => r.down),
            W,
          )}; ` +
          `mean wrap ${(sum((r) => r.wrap * r.wires) / W).toFixed(2)} rad; arrive from below ${pct(
            sum((r) => r.inBelow),
            W,
          )}\n` +
          `shared ends (would overlap) ${(sum((r) => r.shared) / n).toFixed(1)}; crossings ${(sum((r) => r.crossings) / n).toFixed(1)}, cost ${(sum((r) => r.cost) / n).toFixed(1)}; ` +
          `area ${(sum((r) => r.width * r.height) / n / 1e6).toFixed(1)} Mpx²`,
      );
      if (name === 'today') {
        log('by port (wires, mean angle from up, % leaving down):');
        for (const [k, v] of [...ports].sort((a, b) => b[1].length - a[1].length))
          log(
            `  ${k.padEnd(8)} ${String(v.length / n).padStart(5)}  ${(v.reduce((x, y) => x + y, 0) / v.length).toFixed(0).padStart(4)}°  ${pct(v.filter((x) => x > 135).length, v.length)}`,
          );
        log('worst pieces (seed 0, % leaving sideways or down):');
        for (const r of rows
          .slice(0, pieces.length)
          .sort((a, b) => (b.side + b.down) / b.wires - (a.side + a.down) / a.wires)
          .slice(0, 8))
          log(`  ${r.key.padEnd(28)} ${r.wires} wires, ${pct(r.side + r.down, r.wires)} not up, ${r.down} down, ${r.shared} shared ends`);
      }
    }
  }, 600_000);
});
