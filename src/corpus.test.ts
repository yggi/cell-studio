import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { MIDI_FILES } from './corpus';
import { readMidi } from './engine/midifile';
import { cellsFromMidi } from './engine/midiimport';

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
});
