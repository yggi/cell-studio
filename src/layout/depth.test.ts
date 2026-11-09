// A cable's depth (#598): a moving parameter's range set again with its cells kept, as cells' attrValue/setAttr write it
// (yggi/cells#470), on texts from cells' patch.test.ts and Patchbay.
import { describe, expect, it } from 'vitest';
import { attrsOf } from '@yggi/cells/engine/edit';
import { patch } from '@yggi/cells/engine/patch';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { depthsOf, formatEnd, positionOf, setDepth, spanOf, valueAt } from './depth';

const text = '&eg map=adsr .01 .2 .3 .1\n&lfo loop=2 sin(12)\n&wob loop=4 sin(12)\n&v s=saw loop=C2 lpf=70..4800 * &eg lpq=8 # a voice';

describe('a moving parameter’s range, read with its cells', () => {
  it('the ranges a line scales by cells, and nothing else', () => {
    expect(depthsOf(text, 'v').map((d) => [d.key, d.lo, d.hi, d.factors])).toEqual([['lpf', 70, 4800, ['&eg']]]);
    // (a cable patched into a fixed parameter: at zero depth, cells decision 067 §4)
    const zero = patch(text, 'v', 'lpq', 'wob');
    expect(depthsOf(zero, 'v').map((d) => [d.key, d.lo, d.hi, d.factors])).toEqual([
      ['lpf', 70, 4800, ['&eg']],
      ['lpq', 8, 8, ['&wob']],
    ]);
  });

  it('on Patchbay, the hat’s filter once a cable is patched into it; the module’s arguments are no range', () => {
    const hat = patch(EXAMPLES.patchbay.source, 'hat', 'hpf', 'sweep');
    expect(depthsOf(hat, 'hat').map((d) => [d.key, d.lo, d.hi])).toEqual([['hpf', 7500, 7500]]);
    expect(depthsOf(EXAMPLES.patchbay.source, 'vcf')).toEqual([]);
  });
});

describe('its depth set again: the range’s ends moved, its cells kept', () => {
  it('opening a zero-depth cable writes the range before its cells, the rest of the line as it was', () => {
    const zero = patch(text, 'v', 'lpq', 'wob');
    const d = depthsOf(zero, 'v').find((x) => x.key === 'lpq')!;
    const open = setDepth(zero, 'v', d, 2, 14);
    expect(attrsOf(open, 'v').get('lpq')).toBe('2..14 * &wob');
    expect(attrsOf(open, 'v').get('lpf')).toBe('70..4800 * &eg');
    expect(open.split('\n')[3]).toMatch(/# a voice$/);
  });

  it('a frequency written whole, a share to two places', () => {
    const d = depthsOf(text, 'v')[0]!;
    expect(attrsOf(setDepth(text, 'v', d, 400.4, 1600.6), 'v').get('lpf')).toBe('400..1601 * &eg');
    expect(formatEnd(0.25, spanOf('room', 0, 1))).toBe('.25');
    expect(formatEnd(0.256, spanOf('room', 0, 1))).toBe('.26');
  });
});

describe('the sliders’ spans', () => {
  it('a frequency 20 Hz to 20 kHz on a log scale; a resonance 0 to 30; a send 0 to 1', () => {
    expect(spanOf('lpf', 70, 4800)).toEqual({ min: 20, max: 20000, scale: 'log' });
    expect(spanOf('cutoff', 70, 4800).scale).toBe('log');
    expect(spanOf('lpq', 8, 8)).toEqual({ min: 0, max: 30, scale: 'linear' });
    expect(spanOf('room', 0.2, 0.5)).toEqual({ min: 0, max: 1, scale: 'linear' });
    // (a range written past the span widens it)
    expect(spanOf('lpq', 2, 40).max).toBe(40);
  });

  it('a value and its place on the slider go back and forth', () => {
    const log = spanOf('lpf', 0, 0);
    expect(positionOf(20, log)).toBe(0);
    expect(positionOf(20000, log)).toBeCloseTo(1, 9);
    expect(valueAt(positionOf(632, log), log)).toBeCloseTo(632, 6);
    const lin = spanOf('room', 0, 1);
    expect(valueAt(0.25, lin)).toBe(0.25);
  });
});
