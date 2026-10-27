import { describe, expect, it } from 'vitest';
import { clean, heard, switchLevels, type BarLaid } from './session-clicks';

const QUANTUM = 128 / 48000;
/** Levels over 0 to 9 s: 0.25 everywhere, louder in the given spans. */
const levels = (loud: readonly [number, number, number][] = []) =>
  Array.from({ length: Math.floor(9 / QUANTUM) }, (_, i): [number, number] => {
    const at = i * QUANTUM;
    return [at, loud.find(([a, b]) => at + QUANTUM > a && at < b)?.[2] ?? 0.25];
  });
const bars: BarLaid[] = [
  { bar: 7, at: 2, switched: false },
  { bar: 8, at: 4, switched: true },
  { bar: 9, at: 6, switched: false },
];

describe('a click at a switch, by level', () => {
  it('sets the peak round a switch’s start against the bars’ either side', () => {
    const [s] = switchLevels(bars, levels(), QUANTUM);
    expect(s).toMatchObject({ bar: 8 });
    expect(s!.over).toBeCloseTo(0, 9);
    expect(clean(s!)).toBe(true);
  });

  it('finds a step at the switch, not one beside it or at a bar where nothing switched', () => {
    // (a step to twice the level for 1 ms, 2 ms after the switch: 6 dB over)
    const [s] = switchLevels(bars, levels([[4.002, 4.003, 0.5]]), QUANTUM);
    expect(s!.over).toBeCloseTo(6.02, 1);
    expect(clean(s!)).toBe(false);
    // (20 ms after it: outside the 10 ms)
    expect(clean(switchLevels(bars, levels([[4.02, 4.021, 0.5]]), QUANTUM)[0]!)).toBe(true);
    // (as loud at the bar before: the music's own)
    expect(
      clean(
        switchLevels(
          bars,
          levels([
            [4.002, 4.003, 0.5],
            [2, 2.001, 0.5],
          ]),
          QUANTUM,
        )[0]!,
      ),
    ).toBe(true);
  });

  it('says a switch where nothing sounded apart: silence is no level, not a clean one', () => {
    const [s] = switchLevels(
      bars,
      levels().map(([t]) => [t, 0] as [number, number]),
      QUANTUM,
    );
    expect(heard(s!)).toBe(false);
    expect(s!.over).toBe(-Infinity);
    expect(heard(switchLevels(bars, levels(), QUANTUM)[0]!)).toBe(true);
  });

  it('leaves out a switch whose neighbours weren’t laid, or fall outside the levels taken', () => {
    expect(switchLevels(bars.slice(1), levels(), QUANTUM)).toEqual([]);
    expect(switchLevels([...bars.slice(0, 2), { bar: 9, at: 20, switched: false }], levels(), QUANTUM)).toEqual([]);
  });
});
