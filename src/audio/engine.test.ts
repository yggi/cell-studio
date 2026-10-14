import { describe, expect, it } from 'vitest';
import { PRESETS } from '@yggi/cells/engine/presets';
import { createHost, planOf, type FromEngine, type ToEngine } from '@yggi/cells/engine/host';
import { windowAt } from '@yggi/cells/engine/schedule';
import { LocalEngine, WorkerEngine, type Port } from './engine';

/** A worker stand-in: the host behind a structured clone each way, answering after `delay` ms (null: never). */
function fakeWorker(delay: number | null = 0): Port & { sent: ToEngine[] } {
  const host = createHost();
  const port: Port & { sent: ToEngine[] } = {
    sent: [],
    onmessage: null,
    postMessage(m) {
      port.sent.push(m);
      const reply = host(structuredClone(m));
      if (reply && delay !== null) setTimeout(() => port.onmessage?.({ data: structuredClone(reply) } as MessageEvent<FromEngine>), delay);
    },
  };
  return port;
}

const src = PRESETS.bwv847.source;

describe('engines: local and worker give the same windows', () => {
  it('local: the plan here', () => {
    const e = new LocalEngine();
    const p = planOf(src);
    e.load(p);
    expect(e.window(1, 0.25)).toEqual(windowAt(p, 1, 0.25));
    expect(e.stats()).toMatchObject({ kind: 'local', windows: 1 });
  });

  it('worker: the piece compiled there from its source, the same windows come back', async () => {
    const port = fakeWorker();
    const e = new WorkerEngine(port);
    const p = planOf(src);
    e.load(p, { code: src });
    expect(port.sent[0]).toMatchObject({ type: 'load', code: src });
    for (const from of [0, 0.25, 3.5]) expect(await e.window(from, 0.25)).toEqual(windowAt(p, from, 0.25));
    expect(e.stats()).toMatchObject({ kind: 'worker', windows: 3, late: 0 });
  });

  it('a worker too slow to answer: the window is worked out here, and its late answer is ignored', async () => {
    const e = new WorkerEngine(fakeWorker(80), 10);
    const p = planOf(src);
    e.load(p, { code: src });
    expect(await e.window(2, 0.25)).toEqual(windowAt(p, 2, 0.25));
    expect(e.stats().late).toBe(1);
    await new Promise((r) => setTimeout(r, 100));
    expect(e.stats().roundTripMax).toBe(0);
  });

  it('a worker that fails: everything after is worked out here (pending windows included)', async () => {
    const port = fakeWorker(null);
    const e = new WorkerEngine(port, 1000);
    const p = planOf(src);
    e.load(p, { code: src });
    const w = e.window(2, 0.25);
    port.onerror?.(new Error('gone'));
    expect(await w).toEqual(windowAt(p, 2, 0.25));
    expect(e.window(3, 0.25)).toEqual(windowAt(p, 3, 0.25)); // (at once: no promise)
  });

  it('a piece with no source to send: worked out here', () => {
    const e = new WorkerEngine(fakeWorker());
    const p = planOf(src);
    e.load(p, null);
    expect(e.window(1, 0.25)).toEqual(windowAt(p, 1, 0.25));
  });

  it('hands reach both: the plan here (the views, late windows) and the worker', async () => {
    const box = PRESETS.musicbox.source;
    const port = fakeWorker();
    const e = new WorkerEngine(port);
    const p = planOf(box);
    e.load(p, { code: box });
    e.grab('bar', 2, 0);
    e.grab('bar', 2.3, null);
    expect(port.sent.filter((m) => m.type === 'grab')).toHaveLength(2);
    expect(await e.window(2, 1)).toEqual(windowAt(p, 2, 1));
    expect(windowAt(p, 2, 1)).not.toEqual(windowAt(planOf(box), 2, 1));
    e.reset();
    expect(await e.window(2, 1)).toEqual(windowAt(planOf(box), 2, 1));
  });
});
