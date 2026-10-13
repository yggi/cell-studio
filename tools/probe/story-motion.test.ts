// Probe (not part of the gate, #390): how calmly the graph follows a conversion's story (engine/fold/story.ts). Each
// MIDI file's story replayed through the layout as the app replays it: the first frame laid out (500 ticks), then each
// next frame set (setGraph, as an edit) and run for a frame's time at speed 1 (TICKS a frame: 54, 60 fps × 0.9 s).
// Measured, per frame: how far the nodes that stay move (the most and the mean, px), the largest step any one makes in
// a single tick (a jerk), whether the frame laid the graph out afresh, and the crossings at its end. The signal path's
// layout and the tower's (TOWER_LAYOUT), the layout's options as given (VARIANTS), three seeds.
// Run: PROBE=out.txt npx vitest run tools/probe/story-motion.test.ts   (ONLY=word: the files with it in their key;
// FILES=n: the first n of each collection, default 2; SEEDS=0,1,2)
import { describe, it } from 'vitest';
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { ForceLayout } from '../../src/layout/physics';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '../../src/engine/compile';
import { readMidi } from '../../src/engine/midifile';
import { cellsFromMidi } from '../../src/engine/midiimport';
import { TOWER_LAYOUT, type LayoutOptions } from '../../src/layout/options';
import { towerLayers, withSockets } from '../../src/layout/towerlayout';
import type { GraphModel } from '../../src/engine/graph';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
const TICKS = Number(process.env.TICKS ?? 54);
const SEEDS = (process.env.SEEDS ?? '0,1,2').split(',').map(Number);
const FILES = Number(process.env.FILES ?? 2);

type Variant = { name: string; tower: boolean; opts: Partial<LayoutOptions>; gentle?: boolean; hold?: 'none' };
const VARIANTS: Variant[] = [
  { name: 'flow, today', tower: false, opts: {} },
  { name: 'tower, today', tower: true, opts: TOWER_LAYOUT },
  { name: 'flow, gentle', tower: false, opts: {}, gentle: true },
  { name: 'tower, gentle', tower: true, opts: TOWER_LAYOUT, gentle: true },
  { name: 'tower, gentle, nothing held (heights drawn to)', tower: true, opts: TOWER_LAYOUT, gentle: true, hold: 'none' },
].filter((_, i) => !process.env.VARIANTS || process.env.VARIANTS.split(',').map(Number).includes(i));

interface Row {
  frames: number;
  fresh: number;
  /** Per frame, the most any staying node moved and the mean of that (px); the largest single tick's step. */
  most: number;
  mean: number;
  jerk: number;
  crossings: number;
}

function replay(story: readonly string[], v: Variant, seed: number): Row {
  const l = new ForceLayout(undefined, { live: false, seed, ...v.opts });
  const pos = (ids: Iterable<string>) => new Map([...ids].flatMap((id) => (l.position(id) ? [[id, { ...l.position(id)! }] as const] : [])));
  const set = (source: string) => {
    const program = compileSource(source);
    const whole = buildGraph(program);
    const model: GraphModel = v.tower ? withSockets(whole) : whole;
    if (v.tower) {
      const t = towerLayers(program, whole, model);
      l.setOptions({ heights: t.targets, held: v.hold === 'none' ? undefined : t.held, strata: t.strata, between: t.between, lineUp: t.lineUp, aside: t.aside });
    }
    const m = { ...model, nodes: model.nodes.filter((n) => !n.petalOf) };
    (l.setGraph as (m: GraphModel, s?: boolean, o?: { gentle?: boolean }) => void)(m, true, v.gentle ? { gentle: true } : undefined);
    return m.nodes.map((n) => n.id);
  };
  set(story[0]!);
  l.tick(500);
  const row: Row = { frames: story.length - 1, fresh: 0, most: 0, mean: 0, jerk: 0, crossings: 0 };
  let moved = 0;
  for (const source of story.slice(1)) {
    const before = pos((l as unknown as { s: { byId: Map<string, unknown> } }).s.byId.keys());
    const ids = set(source);
    if (!(l as unknown as { calmed: boolean }).calmed) row.fresh++;
    let last = pos(ids);
    for (let k = 0; k < TICKS; k++) {
      l.tick(1);
      const now = pos(ids);
      for (const [id, p] of now) {
        const q = last.get(id);
        if (q && before.has(id)) row.jerk = Math.max(row.jerk, Math.hypot(p.x - q.x, p.y - q.y));
      }
      last = now;
    }
    let most = 0;
    let who = '';
    for (const [id, p] of last) {
      const q = before.get(id);
      if (q && Math.hypot(p.x - q.x, p.y - q.y) > most) [most, who] = [Math.hypot(p.x - q.x, p.y - q.y), id];
    }
    if (process.env.WHO && most > 200) log(`  frame ${story.indexOf(source)}: ${who} moved ${most.toFixed(0)}`);
    row.most = Math.max(row.most, most);
    moved += most;
  }
  row.mean = moved / Math.max(1, row.frames);
  row.crossings = l.quality().crossings;
  l.destroy();
  return row;
}

describe.runIf(process.env.PROBE)('a conversion’s story through the layout', () => {
  it('replays each story, frame by frame', { timeout: 3_600_000 }, () => {
    writeFileSync(process.env.PROBE!, '');
    const files = readdirSync('midi', { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'voices')
      .flatMap((d) =>
        readdirSync(`midi/${d.name}`)
          .filter((f) => f.endsWith('.mid'))
          .slice(0, FILES)
          .map((f) => `midi/${d.name}/${f}`),
      )
      .filter((f) => !process.env.ONLY || f.includes(process.env.ONLY));
    const stories = files.map((f) => {
      const smf = readMidi(new Uint8Array(readFileSync(f)));
      const machine = cellsFromMidi(smf, 'probe', { free: false }).source;
      const made = cellsFromMidi(smf, 'probe', { shorten: true, story: true });
      return { f, story: [machine, ...made.story!.map((s) => s.source)] };
    });
    log(`${stories.length} files, ${stories.reduce((n, s) => n + s.story.length - 1, 0)} frames, seeds ${SEEDS.join(',')}, ${TICKS} ticks a frame`);
    log('');
    log('| variant | fresh frames | most moved in a frame (px, max) | mean of each frame’s most (px) | largest step in a tick (px) | crossings at the end |');
    log('|---|---|---|---|---|---|');
    for (const v of VARIANTS) {
      const rows = stories.flatMap((s) => SEEDS.map((seed) => replay(s.story, v, seed)));
      const avg = (k: keyof Row) => rows.reduce((n, r) => n + r[k], 0) / rows.length;
      log(
        `| ${v.name} | ${rows.reduce((n, r) => n + r.fresh, 0)} | ${Math.max(...rows.map((r) => r.most)).toFixed(0)} | ${avg('mean').toFixed(0)} | ${Math.max(...rows.map((r) => r.jerk)).toFixed(1)} (mean ${avg('jerk').toFixed(1)}) | ${avg('crossings').toFixed(1)} |`,
      );
    }
  });
});
