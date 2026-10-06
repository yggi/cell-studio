import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { PRESETS } from '../engine/presets';
import { setAttr } from '../engine/edit';
import { fieldsOf, formatLabel, labelText } from './labels';

describe('label templates', () => {
  const royal = compileSource(PRESETS.royal.source);
  it('fields of a cell: its notes, tonic, mode; steps, tempo, shift', () => {
    const f = fieldsOf(royal, 'scale', codeShifts(royal));
    expect(f).toMatchObject({ notes: 'C D E♭ F G A♭ B♭', tonic: 'C', mode: 'Aeolian', steps: '7' });
    const t = fieldsOf(royal, 'theme', codeShifts(royal));
    expect(t.tempo).toBe('84');
    expect(t.notes!.startsWith('C E♭ G A♭ B')).toBe(true);
  });
  it('fills the template, live: a key that turns renames itself', () => {
    const tpl = '**{mode}** on {tonic}: {notes}';
    expect(formatLabel(royal, 'scale', tpl, codeShifts(royal))).toBe('<b>Aeolian</b> on C: C D E♭ F G A♭ B♭');
    // two turns of the key: a whole tone up — the label follows
    const turned = (n: string) => (n === 'key' ? 2 : codeShifts(royal)(n));
    expect(labelText(royal, 'scale', tpl, turned)).toBe('Aeolian on D: D E F G A B♭ C');
  });
  it('another cell’s fields; formatting; text escaped; unknown fields stay', () => {
    expect(formatLabel(royal, 'nope', 'key {&key:tonic} · *mode* {&scale:mode}\\nnext', codeShifts(royal))).toBe('key C · <i>mode</i> Aeolian<br>next');
    expect(formatLabel(royal, 'scale', '<script> & {what}', codeShifts(royal))).toBe('&lt;script&gt; &amp; {what}');
  });
  it('a label= written with fields, in an example', () => {
    const r = compileSource(setAttr(PRESETS.royal.source, 'scale', 'label', '"{mode}: {notes}"'));
    expect(labelText(r, 'scale', r.cells.get('scale')!.label!, codeShifts(r))).toBe('Aeolian: C D E♭ F G A♭ B♭');
  });
});
