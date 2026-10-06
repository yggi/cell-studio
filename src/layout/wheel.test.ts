import { describe, expect, it } from 'vitest';
import { envelopeNames, HUB, stepText, timeText, wheelGeometry } from './wheel';

describe('wheel geometry', () => {
  it('is as at 128 px from there up', () => {
    const g = wheelGeometry(128);
    expect(g.rInner).toBeCloseTo(128 * HUB);
    expect(g.rOuter).toBe(57);
    expect(g.rDisc).toBe(63);
    expect(g.hand.width).toBe(2.5);
    expect(wheelGeometry(256).margin).toBe(7);
  });

  it('keeps every part in order at any size', () => {
    for (const size of [24, 44, 64, 96, 128, 200, 232]) {
      const g = wheelGeometry(size);
      expect(g.rHub).toBeGreaterThan(0);
      expect(g.rHub).toBeLessThan(g.rInner);
      expect(g.rInner).toBeLessThan(g.rOuter);
      expect(g.tick.r0).toBeGreaterThan(g.rOuter);
      expect(g.tick.r1).toBeLessThanOrEqual(g.rDisc + 1);
      expect(g.hand.r1).toBeLessThanOrEqual(g.rDisc);
    }
  });

  it('names an envelope with units', () => {
    expect(envelopeNames({ attack: 0.003, decay: 0.18, sustain: 0.1, release: 0.06 })).toEqual({ a: 'A 3 ms', d: 'D 180 ms', s: 'S 10 %', r: 'R 60 ms' });
    expect(timeText(1.2)).toBe('1.2 s');
    expect(timeText(0.0125)).toBe('13 ms');
  });

  it('writes a step to three figures, and leaves anything else as written', () => {
    expect(stepText('2.3429')).toBe('2.34');
    expect(stepText('1.1047')).toBe('1.1');
    expect(stepText('1.25')).toBe('1.25');
    expect(stepText('4')).toBe('4');
    expect(stepText('&riff')).toBe('&riff');
    expect(stepText('0.5@2')).toBe('0.5@2');
  });
});
