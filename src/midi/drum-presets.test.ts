// Adapted from yggi/jambot apps/web/src/midi/drum-presets.test.ts @ 8cdb6b8.
import { describe, expect, it } from 'vitest';
import { DRUM_PRESETS, deviceNote, presetNameOf } from './drum-presets';

describe('drum presets', () => {
  it('GM sends every General MIDI drum note as it is', () => {
    for (let n = 35; n <= 81; n++) expect(deviceNote(DRUM_PRESETS.GM, n)).toBe(n);
  });

  it('Novation Circuit sends only the four notes its drum tracks answer (60, 62, 64, 65), kick alone on 60', () => {
    const circuit = DRUM_PRESETS['Novation Circuit'];
    for (const note of Object.values(circuit)) expect([60, 62, 64, 65]).toContain(note);
    expect(deviceNote(circuit, 36)).toBe(60);
    expect(Object.entries(circuit).filter(([, v]) => v === 60)).toEqual([['36', 60]]);
    expect([38, 42, 46].map((n) => deviceNote(circuit, n))).toEqual([62, 64, 65]);
  });
});

describe('presetNameOf', () => {
  it('names each preset by its notes', () => {
    for (const [name, map] of Object.entries(DRUM_PRESETS)) expect(presetNameOf(map)).toBe(name);
  });

  it('counts a note listed as itself as not listed: still GM', () => {
    expect(presetNameOf({ 36: 36, 38: 38 })).toBe('GM');
  });

  it('is Custom for a map edited by hand', () => {
    expect(presetNameOf({ 36: 61 })).toBe('Custom');
    expect(presetNameOf({ ...DRUM_PRESETS['Novation Circuit'], 36: 61 })).toBe('Custom');
  });
});
