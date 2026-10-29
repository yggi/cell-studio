import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { PRESETS } from '@yggi/cells/engine/presets';
import { playedCells, shiftsAt } from '@yggi/cells/engine/clocking';
import { liveAt } from '@yggi/cells/engine/live';
import { cellView } from './cellview';
import { drawnShifts, turningCells } from './turning';

// the moments looked at: 40 s in eighths of a second and a bit (so no step boundary is met twice the same way)
const MOMENTS = Array.from({ length: 300 }, (_, i) => i * 0.13);

describe('one motion per wheel: a played cell its hand, a table nothing plays its ring', () => {
  it('over the library, no played wheel turns while it plays, and the tables nothing plays still do', () => {
    const turned: string[] = [];
    const still: string[] = [];
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compilePiece(p.source);
      const statics = codeShifts(r);
      const played = playedCells(r);
      const moved = new Set<string>();
      for (const t of MOMENTS) {
        const now = shiftsAt(r, statics, t);
        for (const name of r.cells.keys()) if (drawnShifts(r, statics, now, name)(name) !== statics(name)) moved.add(name);
      }
      for (const name of moved) (played.has(name) ? still : turned).push(`${key}.${name}`);
    }
    // (cells v0.6.0 turns every stepped cell in the live state; drawn, a played one stays at its written shift)
    expect(still).toEqual([]);
    // the keys, scales, chords and tapes that turn with nothing playing them (14 when this was written)
    expect(turned).toEqual(expect.arrayContaining(['royal.key', 'coltrane.key', 'prelude.chords', 'idm.lydian', 'bwv847.rhShapes']));
  });

  it("a braid's bulbs stay where they are on its track while it plays: its splices as written too", () => {
    const r = compilePiece(PRESETS.drums.source);
    const statics = codeShifts(r);
    const atRest = cellView(r, 'groove', statics, false)!;
    expect(atRest.bulbs?.length).toBeGreaterThan(0);
    for (const t of [1, 2, 2.25, 7.5]) {
      const v = cellView(r, 'groove', drawnShifts(r, statics, shiftsAt(r, statics, t), 'groove'), false)!;
      expect(v.bulbs).toEqual(atRest.bulbs);
      expect(v.segments.map((s) => s.index)).toEqual(atRest.segments.map((s) => s.index));
    }
  });

  it("the graph's redraw key counts the tables that turn, not the cells that are only played", () => {
    const r = compilePiece(PRESETS.drums.source);
    expect(turningCells(r)).not.toContain('groove');
    expect(turningCells(compilePiece(PRESETS.royal.source))).toContain('key');
  });

  // cells #167: a table both played and read through. Drawn as played (its hand on the chord sounding); its reader
  // sees it turn, as the sound does: &pad lights C D E F, one a beat
  const both = [
    '&bar meter("4/4") step=120bpm',
    '&key scale(ionian, C)',
    '&harm over=&key step=4n [0,2,4] [1,3,5] [2,4,6] [3,5,7]',
    '&pad over=&harm step=4n 0 0 0 0',
    '&compV loop=C3',
    '&readV loop=C4',
    '&read map=midi ~!14 ~ [&harm * &readV]',
    '&out map=midi ~ ~ [&pad * &compV]',
  ].join('\n');

  it('a table that also plays (cells #167): its own ring still, its hand going round; its readers see it turn', () => {
    const r = compilePiece(both);
    expect(r.diagnostics).toEqual([]);
    const statics = codeShifts(r);
    expect(playedCells(r).has('harm')).toBe(true);
    expect(turningCells(r)).toContain('harm');
    const beats = [0.1, 0.6, 1.1, 1.6];
    for (const t of beats) {
      const now = shiftsAt(r, statics, t);
      expect(drawnShifts(r, statics, now, 'harm')('harm')).toBe(statics('harm'));
      expect(drawnShifts(r, statics, now, 'pad')('harm')).toBe(now('harm'));
    }
    // drawn as a braid (its chords in time), its hand a beat further each beat
    expect(cellView(r, 'harm', drawnShifts(r, statics, shiftsAt(r, statics, 1.1), 'harm'), false)?.mode).toBe('braid');
    const live = beats.map((t) => liveAt(r, statics, new Set(), t));
    expect(live.map((l) => Math.floor(l.cells.get('harm')?.local ?? NaN))).toEqual([0, 1, 2, 3]);
    // what is read on &key: each beat's chord, the one the hand is on (its root, C D E F, is what &pad plays)
    expect(live.map((l) => [...(l.cells.get('key')?.entries ?? [])].sort((a, b) => a - b))).toEqual([
      [0, 2, 4],
      [1, 3, 5],
      [2, 4, 6],
      [3, 5, 7],
    ]);
  });
});
