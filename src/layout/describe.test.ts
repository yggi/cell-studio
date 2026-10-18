import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { PRESETS } from '@yggi/cells/engine/presets';
import { connections, summary, type Bit } from './describe';

const text = (bits: Bit[]) => bits.map((b) => (typeof b === 'string' ? b : `&${b.ref}`)).join('');

describe('a cell in words', () => {
  const royal = compileSource(PRESETS.royal.source);
  it('a melody: what it plays, through what, stepped by what, on what', () => {
    expect(text(summary(royal, 'theme'))).toBe('Plays 20 steps through &scale, stepped by &bar, on &lead.');
  });
  it('a scale, a key, a meter, a voice', () => {
    expect(text(summary(royal, 'scale'))).toMatch(/^Aeolian on C, a scale of 7 notes, over &key, read by &theme/);
    expect(text(summary(royal, 'bar'))).toMatch(/^A meter of 4 uneven beats, 84 a minute, stepping /); // scan(27 23 26 24)
    // (the metronome's bar plays its own levels, through a kit: nothing else steps by it)
    expect(text(summary(compileSource(PRESETS.metronome.source), 'bar'))).toMatch(/^A meter of 4 beats, 100 a minute\./);
    expect(text(summary(royal, 'lead'))).toMatch(/^A saw voice at C4, played by &theme/);
    // (a meter's feel by level, cells v0.4.0)
    const feel = compileSource('&bar meter("4/4") step=120bpm swing=8n:2/3 legato=16n:.5\n&a step=8n 0 2\n&v s=sine\n&out map=sample [&a * &v]');
    expect(text(summary(feel, 'bar'))).toBe('A meter of 4 beats, 120 a minute, swinging 8n .67, its notes sounding 16n .5 of their length, stepping &a.');
  });
  it('a melody through the scale(name, tonic) shorthand says it as written', () => {
    expect(text(summary(compileSource(PRESETS.waltz.source), 'tune'))).toBe('Plays 24 steps through scale(major, G), stepped by &bar, on &flute.');
  });
  it('an oscillation: how often, how far, what it moves', () => {
    const r = compileSource((PRESETS as Record<string, { source: string }>).cellscape.source);
    expect(text(summary(r, 'breath'))).toBe('Oscillates every 24 beats, between 0.1 and 1, moving &padv and &bass.');
    const vib = [...royal.cells.values()].find((c) => c.lambda?.startsWith('map=lin loop=5'))!.name;
    expect(text(summary(royal, vib))).toBe('Oscillates 5 times a second, swinging ±0.15, moving &lead.');
  });
  it('a selector and a mix', () => {
    const pop = compileSource(PRESETS.pop.source);
    expect(text(summary(pop, 'song'))).toBe('Arranges 6 parts over 10 sections, once.');
    // a tap: what it is, not a phrase of one step (decision 016)
    expect(text(summary(pop, 'hookBar'))).toBe('A tap of &bar on &sections: what it steps plays while &song has it on.');
    const off = compileSource(PRESETS.pop.source.replace(/^&sections .*$/m, '$&\n&hookBar off'));
    expect(text(summary(off, 'hookBar'))).toBe('A tap of &bar on &sections: switched off, what it steps stands still.');
    const mix = compileSource('&lead s=saw loop=C4\n&tune 0 2 4 step=2\n&hookPart [&tune * &lead * .35]\n&out map=sample [&hookPart]');
    expect(text(summary(mix, 'hookPart'))).toBe('Mixes 1 sound.');
  });
  it('its connections, grouped, every one a cell', () => {
    const c = Object.fromEntries(connections(royal, 'theme').map((x) => [x.relation, x.cells]));
    expect(c).toMatchObject({ reads: ['scale'], 'stepped by': ['bar'], 'plays on': ['lead'] });
    const lead = Object.fromEntries(connections(royal, 'lead').map((x) => [x.relation, x.cells]));
    expect(lead['played by']).toEqual(['theme']);
    expect(lead['shaped by']!.length).toBe(2); // its envelope and its vibrato
    expect(lead['goes to']).toEqual(['mix']);
  });
});
