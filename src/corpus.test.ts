import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { creditLines, creditOf, MIDI_FILES } from './corpus';
import { readMidi, writeMidi } from './engine/midifile';
import { cellsFromMidi } from './engine/midiimport';
import { midiText, parseMidiText } from './engine/miditext';
import { compileSource } from './engine/compile';

describe('the MIDI library (midi/wtc)', () => {
  it('lists every file it has, and has every file it lists, each with where it came from and its licence', () => {
    const files = readdirSync('midi/wtc').filter((f) => f.endsWith('.mid'));
    expect(MIDI_FILES.map((m) => `${m.key}.mid`).sort()).toEqual(files.sort());
    for (const m of MIDI_FILES) {
      expect(m.source, m.key).toMatch(/^https:\/\/www\.mutopiaproject\.org\/ftp\/BachJS\/BWV\d+\//);
      expect(m.licence, m.key).toMatch(/^(Public Domain|Creative Commons Attribution-ShareAlike [34]\.0)$/);
      expect(m.maintainer, m.key).not.toBe('');
      // (the licences and credits written out beside the files, for anyone who takes them from there)
      expect(readFileSync('midi/wtc/README.md', 'utf8'), m.key).toContain(`${m.key}.mid`);
    }
  });
  it('reads every file, and each plays as cells', () => {
    for (const m of MIDI_FILES) {
      const smf = readMidi(new Uint8Array(readFileSync(`midi/wtc/${m.key}.mid`)));
      const notes = smf.tracks.reduce((n, t) => n + t.notes.length, 0);
      expect(notes, m.key).toBeGreaterThan(300);
      expect(cellsFromMidi(smf, m.title, { free: false }).notes, m.key).toBe(notes);
    }
  });
  it('credits each file: in its details, in its copyright field, and as comments in the cells it converts to', () => {
    for (const m of MIDI_FILES) {
      const c = creditOf(m);
      expect(c.piece, m.key).toContain(`BWV ${m.bwv}`);
      // (share-alike: its licence linked, and said to carry over to what is made from it)
      if (m.licence.startsWith('Creative Commons')) expect(creditLines(m).join(' '), m.key).toMatch(/creativecommons\.org\/licenses\/by-sa\/[34]\.0\/.*same licence/);
      else expect(c.licenceUrl, m.key).toBeNull();
    }
    const m = MIDI_FILES.find((f) => f.key === 'wtc1-02-fugue')!;
    const smf = readMidi(new Uint8Array(readFileSync(`midi/wtc/${m.key}.mid`)));
    const lines = creditLines(m);
    // (in its copyright field, as the library opens it: through its text and saved again, the .mid carries it)
    const opened = { ...smf, copyright: lines.join(' ') };
    const text = midiText(opened, `${m.key}.mid`);
    expect(text).toContain(`copyright "${lines.join(' ')}"`);
    const parsed = parseMidiText(text);
    expect(parsed.diagnostics).toEqual([]);
    expect(readMidi(writeMidi(parsed.smf)).copyright).toBe(lines.join(' '));
    const made = cellsFromMidi(smf, m.title, { shorten: true, credit: lines });
    expect(made.source.split('\n').slice(1, 6)).toEqual(['', ...lines.map((l) => `# ${l}`), '']);
    expect(made.folded).toBe(true);
    expect(compileSource(made.source).ok).toBe(true);
  });
});
