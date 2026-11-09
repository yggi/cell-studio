import { describe, expect, it } from 'vitest';
import { gmDrumNote } from '@yggi/cells/engine/midi';
import { compilePiece } from '../compile';
import { drumNoteIn, drumPlaces, kitOf } from './kit';

describe('a kit drawn as a drum kit', () => {
  // (a list of names read as General MIDI's, as cells' kitNotes reads a list it saved itself)
  const roles = (names: string[]) => drumPlaces(100, names, gmDrumNote).map((p) => p.role);
  const rolesIn = (text: string) => {
    const r = compilePiece(text);
    const kit = kitOf(r, 'kit') ?? [];
    return drumPlaces(100, kit, drumNoteIn(r)).map((p) => p.role);
  };

  it('places each member by its General MIDI drum note', () => {
    expect(roles(['kd', 'sd', 'hh'])).toEqual(['kick', 'snare', 'hihat']);
    expect(roles(['bd', 'oh', 'crash', 'ride'])).toEqual(['kick', 'hihat', 'crash', 'ride']);
    // (the names a MIDI file opened is written with, cells' GM_KIT: the short ones, and General MIDI's as one word)
    expect(roles(['lt', 'mt', 'ht', 'cr', 'rd'])).toEqual(['floor', 'tom', 'tom', 'crash', 'ride']);
    expect(roles(['lowmidtom', 'chinesecymbal', 'ridebell', 'cowbell'])).toEqual(['tom', 'crash', 'ride', 'perc']);
  });

  it('reads a member’s note= in a piece, not its name (decision 075)', () => {
    expect(rolesIn('&kick note=36 s=sine\n&snare note=38 s=white\n&hat note=42 s=white\n&kit &kick &snare &hat')).toEqual(['kick', 'snare', 'hihat']);
    // (a General MIDI name is only a name: &hh writing the crash's note is the crash)
    expect(rolesIn('&bd note=36 s=sine\n&hh note=49 s=white\n&kit &bd &hh')).toEqual(['kick', 'crash']);
  });

  it('gives a member with no note= the next free note from 36, as MIDI out sends it', () => {
    // (&a 36 the kick; &b, after &c's 38, 37: the side stick, a snare's)
    expect(rolesIn('&a s=sine\n&b s=white\n&c note=38 s=white\n&kit &a &b &c')).toEqual(['kick', 'snare', 'snare']);
  });

  it('gives a note it does not know a hand percussion, and a role past its places too', () => {
    expect(drumPlaces(100, ['shaker'], () => 82).map((p) => p.role)).toEqual(['perc']);
    expect(roles(['kd', 'bd'])).toEqual(['kick', 'perc']);
  });

  it('puts the kick in the middle, under the cymbals', () => {
    const [kick, crash] = drumPlaces(100, ['kd', 'crash'], gmDrumNote);
    expect(Math.abs(kick.x)).toBeLessThan(1);
    expect(crash.y).toBeLessThan(kick.y);
  });
});
