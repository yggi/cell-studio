import { describe, expect, it } from 'vitest';
import { drumPlaces } from './kit';

describe('a kit drawn as a drum kit', () => {
  const roles = (names: string[]) => drumPlaces(100, names).map((p) => p.role);

  it('places each member by its General MIDI name', () => {
    expect(roles(['kd', 'sd', 'hh'])).toEqual(['kick', 'snare', 'hihat']);
    expect(roles(['bd', 'oh', 'crash', 'ride'])).toEqual(['kick', 'hihat', 'crash', 'ride']);
    // (the names a MIDI file opened is written with, cells' GM_KIT: the short ones, and General MIDI's as one word)
    expect(roles(['lt', 'mt', 'ht', 'cr', 'rd'])).toEqual(['floor', 'tom', 'tom', 'crash', 'ride']);
    expect(roles(['lowmidtom', 'chinesecymbal', 'ridebell', 'cowbell'])).toEqual(['tom', 'crash', 'ride', 'perc']);
  });

  it('gives a name it does not know a hand percussion, and a role past its places too', () => {
    expect(roles(['shaker'])).toEqual(['perc']);
    expect(roles(['kd', 'bd'])).toEqual(['kick', 'perc']);
  });

  it('puts the kick in the middle, under the cymbals', () => {
    const [kick, crash] = drumPlaces(100, ['kd', 'crash']);
    expect(Math.abs(kick.x)).toBeLessThan(1);
    expect(crash.y).toBeLessThan(kick.y);
  });
});
