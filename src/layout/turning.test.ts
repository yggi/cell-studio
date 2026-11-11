import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { playedCells, shiftsAt } from '@yggi/cells/engine/clocking';
import { liveAt } from '@yggi/cells/engine/live';
import { cellView } from './cellview';
import { drawnShifts, shiftsKey, turnKey, turnsSeen, turningCells } from './turning';
import { formatLabel } from './labels';

// the moments looked at: 40 s in eighths of a second and a bit (so no step boundary is met twice the same way)
const MOMENTS = Array.from({ length: 300 }, (_, i) => i * 0.13);

describe('one motion per wheel: a played cell its hand, a table nothing plays its ring', () => {
  it('over the library, no played wheel turns while it plays, and the tables nothing plays still do', () => {
    const turned: string[] = [];
    const still: string[] = [];
    for (const [key, p] of Object.entries(EXAMPLES)) {
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
    // the keys, scales, chords and tapes that turn with nothing playing them (17 at cells v0.16.0, where IDM's &lydian stopped turning: yggi/cells#429)
    expect(turned).toEqual(expect.arrayContaining(['royal.key', 'coltrane.key', 'prelude.chords', 'bwv847.rhShapes']));
  });

  it("a braid's bulbs stay where they are on its track while it plays: its splices as written too", () => {
    const r = compilePiece(EXAMPLES.drums.source);
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
    const r = compilePiece(EXAMPLES.drums.source);
    expect(turningCells(r)).not.toContain('groove');
    expect(turningCells(compilePiece(EXAMPLES.royal.source))).toContain('key');
  });

  it('the redraw key holds what cells reads through, not over= alone: a played motif its relative picks read (#475)', () => {
    // electroswing's &gypsy is played (&call) and read by &chop's picks (&gypsy[0:3]): shiftsAt turns it, its readers'
    // labels follow it
    const r = compilePiece(EXAMPLES.electroswing.source);
    const statics = codeShifts(r);
    expect(MOMENTS.some((t) => shiftsAt(r, statics, t)('gypsy') !== statics('gypsy'))).toBe(true);
    expect(turningCells(r)).toContain('gypsy');
  });

  it('a played wheel nothing reads through is drawn with the live shifts as they are: shiftsAt holds it already (#475)', () => {
    const r = compilePiece(EXAMPLES.drums.source);
    const statics = codeShifts(r);
    const now = shiftsAt(r, statics, 2.25);
    expect(playedCells(r).has('groove')).toBe(true);
    expect(drawnShifts(r, statics, now, 'groove')).toBe(now);
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

describe('what a cell sees turn (turnsSeen): a view keyed by it is never stale', () => {
  it('over the library, a table a cell does not see, turned a step, changes neither its wheel nor its label', () => {
    const stale: string[] = [];
    let checked = 0;
    for (const [key, p] of Object.entries(EXAMPLES)) {
      const r = compilePiece(p.source);
      const statics = codeShifts(r);
      const turning = turningCells(r);
      const drawn = (name: string, now: typeof statics) => {
        const shifts = drawnShifts(r, statics, now, name);
        const label = r.cells.get(name)?.label;
        return JSON.stringify([cellView(r, name, shifts, false), label ? formatLabel(r, name, label, shifts) : null]);
      };
      for (const name of r.cells.keys()) {
        const seen = new Set(turnsSeen(r, name));
        const before = drawn(name, statics);
        for (const t of turning) {
          if (seen.has(t)) continue;
          checked++;
          if (drawn(name, (n) => (n === t ? statics(n) + 1 : statics(n))) !== before) stale.push(`${key}.${name} (${t})`);
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(stale).toEqual([]);
  });

  it("BWV 847: a fugue voice's wheel doesn't wait on the prelude's chord shapes, and the shapes' reader does", () => {
    const r = compilePiece(EXAMPLES.bwv847.source);
    expect(turnsSeen(r, 'rhFigure')).toContain('rhShapes');
    expect(turnsSeen(r, 'subject')).not.toContain('rhShapes');
    const statics = codeShifts(r);
    const turned = (n: string) => (n === 'rhShapes' ? statics(n) + 1 : statics(n));
    expect(turnKey(r, turned, ['subject'])).toBe(turnKey(r, statics, ['subject']));
    expect(turnKey(r, turned, ['rhFigure'])).not.toBe(turnKey(r, statics, ['rhFigure']));
  });
});

describe('cellView kept by shiftsKey: what a cell reaches, nothing else, changes its view', () => {
  it('over the library, a shift changed outside what a cell reaches draws it as the shifts as written', () => {
    const differ: string[] = [];
    let checked = 0;
    for (const [key, p] of Object.entries(EXAMPLES)) {
      const r = compilePiece(p.source);
      // (a second compile: its views made afresh, none kept from the first's)
      const fresh = compilePiece(p.source);
      const statics = codeShifts(r);
      const names = [...r.cells.keys()];
      for (const name of names) {
        const other = names.find((n) => shiftsKey(r, name, (m) => (m === n ? statics(m) + 1 : statics(m))) === shiftsKey(r, name, statics) && n !== name);
        if (!other) continue;
        checked++;
        const moved = (m: string) => (m === other ? statics(m) + 1 : statics(m));
        if (JSON.stringify(cellView(fresh, name, moved, false)) !== JSON.stringify(cellView(r, name, statics, false))) differ.push(`${key}.${name} (${other})`);
      }
    }
    expect(checked).toBeGreaterThan(200);
    expect(differ).toEqual([]);
  });
});
