import { describe, expect, it } from 'vitest';
import { grainOffset, noiseBuffer } from './noise';

/** Just enough of a context: buffers are plain arrays. */
function fakeCtx(): BaseAudioContext {
  return {
    sampleRate: 100,
    createBuffer: (_c: number, length: number, rate: number) => {
      const data = new Float32Array(length);
      return { duration: length / rate, getChannelData: () => data } as unknown as AudioBuffer;
    },
  } as unknown as BaseAudioContext;
}

describe('noise is reproducible', () => {
  it('two contexts make the same noise of a colour, and the colours differ', () => {
    for (const colour of ['white', 'pink', 'brown'] as const)
      expect(noiseBuffer(fakeCtx(), colour).getChannelData(0)).toEqual(noiseBuffer(fakeCtx(), colour).getChannelData(0));
    const ctx = fakeCtx();
    expect(noiseBuffer(ctx, 'white').getChannelData(0)).not.toEqual(noiseBuffer(ctx, 'pink').getChannelData(0));
  });

  it('a note starts at the same place every time, and elsewhere for another seed, voice or time', () => {
    const o = grainOffset(0, 'hat', 1.5, 4);
    expect(grainOffset(0, 'hat', 1.5, 4)).toBe(o);
    expect(o).toBeGreaterThanOrEqual(0);
    expect(o).toBeLessThan(4);
    for (const other of [grainOffset(1, 'hat', 1.5, 4), grainOffset(0, 'snare', 1.5, 4), grainOffset(0, 'hat', 2, 4)]) expect(other).not.toBe(o);
  });
});
