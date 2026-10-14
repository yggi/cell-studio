import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { compileSource } from '@yggi/cells/engine/compile';
import { PRESETS } from '@yggi/cells/engine/presets';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { scalograms, SIGNALS, type Signal } from '@yggi/cells/engine/time/signals';
import { grid } from '@yggi/cells/engine/time/wavelet';
import { notePixels, ramp, relative, scalogramPixels, waterfallPixels, waveColumns } from './timepictures';
import { frameFor } from './timeview';

/** The theme's colours for the time view (ui/theme.ts `TIME`), as they are today. */
const TIME = {
  mix: { envelope: [255, 40, 40], change: [40, 255, 40], voices: [60, 90, 255] },
  ramp: [
    [0, 0, 0],
    [30, 30, 120],
    [160, 40, 140],
    [240, 120, 40],
    [255, 250, 190],
  ],
} as const;
const px = (d: Uint8ClampedArray, width: number, x: number, y: number) => [...d.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)];
const sha = (d: Uint8ClampedArray) => createHash('sha256').update(d).digest('hex').slice(0, 16);

describe('the time view: its pictures as pixels', () => {
  it('ramps, black where not heard clearly', () => {
    expect(ramp(0, TIME.ramp)).toEqual([0, 0, 0]);
    expect(ramp(1, TIME.ramp)).toEqual([255, 250, 190]);
    expect(ramp(0.5, TIME.ramp)).toEqual([160, 40, 140]);
    expect(ramp(0.625, TIME.ramp)).toEqual([200, 80, 90]);
    expect(ramp(2, TIME.ramp)).toEqual([255, 250, 190]);
    expect(ramp(NaN, TIME.ramp)).toEqual([0, 0, 0]);
  });

  it('measures each row against its mean, in dB, keeping what is not clear', () => {
    const [r] = relative([Float32Array.from([1, 10, NaN, 1])]);
    expect(r![0]).toBeCloseTo(-6.021, 3);
    expect(r![1]).toBeCloseTo(3.979, 3);
    expect(r![2]).toBeNaN();
    expect(relative([new Float32Array(2)])[0]![0]).toBe(-300);
  });

  it('draws the scalogram a row a period: one signal on the ramp, the mix as colours added', () => {
    const rows = { envelope: [Float32Array.from([1, 10])], change: [Float32Array.from([10, 1])], voices: [Float32Array.from([1, 1])] };
    const mix = scalogramPixels({ periods: [1], rows }, 'mix', TIME)!;
    expect([mix.width, mix.height]).toEqual([2, 1]);
    expect(px(mix.data, 2, 0, 0)).toEqual([10, 66, 10, 255]);
    expect(px(mix.data, 2, 1, 0)).toEqual([66, 10, 10, 255]);
    const one = scalogramPixels({ periods: [1], rows }, 'envelope', TIME)!;
    expect(px(one.data, 2, 0, 0)).toEqual([16, 16, 62, 255]);
    expect(px(one.data, 2, 1, 0)).toEqual([202, 82, 88, 255]);
    expect(scalogramPixels({ periods: [], rows }, 'mix', TIME)).toBeNull();
    expect(scalogramPixels({ periods: [1], rows: {} }, 'harmony', TIME)).toBeNull();
  });

  it('Pop: the scalogram as today, in every signal', { timeout: 60000 }, () => {
    const program = compileSource(PRESETS.pop.source);
    if (!program.ok) throw new Error('pop');
    const notes = eventsBetween(plan(program, codeShifts(program)), 0, 96);
    const g = grid(96, undefined, false);
    const rows: Partial<Record<Signal, Float32Array[]>> = {};
    for (const [k, s] of Object.entries(scalograms(notes, g, SIGNALS))) rows[k as Signal] = [...s.rows];
    const pictures = (['mix', ...SIGNALS] as const).map((m) => {
      const p = scalogramPixels({ periods: g.periods, rows }, m, TIME)!;
      return [m, p.width, p.height, sha(p.data)];
    });
    expect(pictures).toMatchInlineSnapshot(`
      [
        [
          "mix",
          4096,
          108,
          "2bec2ee17b82aaea",
        ],
        [
          "impulses",
          4096,
          108,
          "9f73e50e6cc2685a",
        ],
        [
          "envelope",
          4096,
          108,
          "41f9434f14319068",
        ],
        [
          "voices",
          4096,
          108,
          "0c0d7d480fafd397",
        ],
        [
          "change",
          4096,
          108,
          "94ffafc2670617e6",
        ],
        [
          "harmony",
          4096,
          108,
          "1cc34afca27522a8",
        ],
      ]
    `);
  });

  it('draws the waterfall a row a band, the lowest at the bottom, in its owner’s colour as bright as it is loud', () => {
    const fall = { freqs: [100, 200], times: [0, 1], rows: [Float32Array.from([0, -35]), Float32Array.from([-70, -10])], owner: Uint8Array.from([1, 0, 0, 1]) };
    const p = waterfallPixels(
      fall,
      [
        [170, 170, 176],
        [200, 100, 0],
      ],
      [170, 170, 176],
    );
    expect([p.width, p.height]).toEqual([2, 2]);
    // (the top row is the highest band)
    expect(px(p.data, 2, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(px(p.data, 2, 1, 0)).toEqual([159, 79, 0, 255]);
    expect(px(p.data, 2, 0, 1)).toEqual([200, 100, 0, 255]);
    expect(px(p.data, 2, 1, 1)).toEqual([60, 60, 62, 255]);
    // (an owner with no colour: grey)
    expect(px(waterfallPixels({ ...fall, owner: Uint8Array.from([9, 9, 9, 9]) }, [], [1, 2, 3]).data, 2, 0, 1)).toEqual([1, 2, 3, 255]);
  });

  it('draws the notes as pixels at their pitch, from start to end', () => {
    const f = frameFor(10, 100, 200);
    const e = { at: 2, dur: 1, voice: 'v', freq: 440 };
    const p = notePixels([e, { ...e, at: 5, freq: 0 }], 0, 2, f, 100, 200, 3, () => [1, 2, 3]);
    const lit: [number, number][] = [];
    for (let y = 0; y < 200; y++) for (let x = 0; x < 100; x++) if (p.data[(y * 100 + x) * 4 + 3]) lit.push([x, y]);
    expect(lit.length).toBe(44);
    expect(Math.min(...lit.map(([x]) => x))).toBe(20);
    expect(Math.max(...lit.map(([x]) => x))).toBe(30);
    expect([...new Set(lit.map(([, y]) => y))]).toEqual([68, 69, 70, 71]);
    expect(px(p.data, 100, ...lit[0]!)).toEqual([1, 2, 3, 255]);
  });

  it('reads the waveform a column at a time, as far as it was rendered', () => {
    const f = frameFor(4, 4, 100);
    const peaks = Float32Array.from([-0.5, 0.25, -0.1, 0.75, -1, 0.5]);
    expect(waveColumns(f, peaks, 3, 1)).toEqual([
      { x: 0, lo: -0.5, hi: 0.25 },
      { x: 1, lo: Math.fround(-0.1), hi: 0.75 },
      { x: 2, lo: -1, hi: 0.5 },
    ]);
    expect(waveColumns(f, peaks, 1, 2)).toEqual([{ x: 0, lo: -0.5, hi: 0.75 }]);
  });
});
