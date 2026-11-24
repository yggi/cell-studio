// The time view's whole day, out of the quick tests (#688): 86,400 s and 282,240 notes through the pattern finder is the slow
// tier's kind of work (8 s alone, 22 s beside the rest of the quick tier on CI against its 20 s), and it fails on what it
// finds, not on the clock.
import { describe, expect, it } from 'vitest';
import { patternsOf } from './timelayers';
import { piece } from './timelayers.fixture';

describe('the time view of a whole day', () => {
  it('5 to 12: a day, metered by its sections alone; its foldings alike', () => {
    const p = piece('fiveto12');
    expect(p.length).toBe(86400);
    expect(p.notes.length).toBe(282240);
    expect(p.meter).toEqual([{ period: 7200, label: 'section' }]);
    expect(patternsOf(p.heardNotes, p.spans, p.listened, p.length)?.folded.map((f) => f.name)).toEqual(['2 2 2 1 2 2 1']);
  });
});
