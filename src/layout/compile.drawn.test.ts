import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts, MAX_SPLICE_DEPTH } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { buildGraph } from './drawn';
import { edgeLabel } from '@yggi/cells/engine/transform';

type R = ReturnType<typeof compileSource>;

describe('moving a reference: &x^n by its table (degrees), &x^$n by the grid (#179)', () => {
  it('the graph labels the reference with it', () => {
    const g = buildGraph(compileSource('&m 0 4\n&t step=1 &m^7\n&u step=1 &m\n&v s=tri\n&mix loop=SAMPLE_RATE map=sample [&t * &v]'));
    expect(edgeLabel(g.edges.find((e) => e.source === 'cell:t' && e.target === 'cell:m')!)).toBe('^7');
  });
});

describe('about=: a note links to the cells it explains', () => {
  const src = `&hint label="the filter opens on every note" about=(&fenv &accent)
&fenv map=adsr .003 .18 .1 .06
&accent map=amp 1 .4`;
  // (a piece with no sound card only warns that nothing plays)
  const errors = (text: string) =>
    compileSource(text)
      .diagnostics.filter((d) => d.severity === 'error')
      .map((d) => d.message);
  it('draws one edge from the note to each cell, and the note stays a note', () => {
    const r = compileSource(src);
    expect(errors(src)).toEqual([]);
    const hint = r.cells.get('hint')!;
    expect([hint.note, hint.about]).toEqual([true, ['fenv', 'accent']]);
    const g = buildGraph(r);
    expect(g.edges.filter((e) => e.port === 'about').map((e) => [e.source, e.target])).toEqual([
      ['cell:hint', 'cell:fenv'],
      ['cell:hint', 'cell:accent'],
    ]);
  });
});

describe('diagnostics: nothing plays, or the wrong thing, without a word (#143)', () => {
  // a played melody, &tune, through a voice into the sound card
  const piece = (tune: string) => `${tune}\n&pluck s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&tune * &pluck]`;
  // what it says (but "Nothing plays yet", which a lone line always gets)
  const said = (src: string) =>
    compileSource(src)
      .diagnostics.filter((d) => !d.message.startsWith('Nothing plays yet'))
      .map((d) => [d.severity, d.span.line, d.span.col, d.message] as const);

  it(`cells splice into each other ${MAX_SPLICE_DEPTH} deep at most: deeper is one error, never a stack overflow (#160)`, () => {
    const chain = (n: number) => [...Array.from({ length: n }, (_, i) => `&c${i} ${i === n - 1 ? '0 1' : `&c${i + 1}`}`), '&tune step=120bpm &c0'].join('\n');
    expect(said(piece(chain(MAX_SPLICE_DEPTH)))).toEqual([]);
    for (const n of [MAX_SPLICE_DEPTH + 1, 5000]) {
      let r: R | undefined;
      expect(() => (r = compileSource(piece(chain(n))))).not.toThrow();
      const errors = r!.diagnostics.filter((d) => d.severity === 'error');
      expect(errors.map((d) => d.message)).toEqual([expect.stringMatching(new RegExp(`^&c0 splices cells into each other more than ${MAX_SPLICE_DEPTH} deep`))]);
      expect(() => eventsBetween(plan(r!, codeShifts(r!)), 0, 4)).not.toThrow();
      expect(() => buildGraph(r!)).not.toThrow();
    }
  });
});
