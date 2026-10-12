/**
 * The MIDI library (docs/ui/midi.md): MIDI files that come with the app, a third part of the library beside the
 * tutorial and the examples. For now Bach's Well-Tempered Clavier as the Mutopia Project has it (midi/wtc/: each file
 * as published, its licence and who typeset it in midi/wtc/index.json). A file is fetched when it opens, as an
 * example's source is; it opens as a MIDI document (text, playing), for Convert to cells to fold.
 */
import index from '../midi/wtc/index.json';
import { readMidi, type Smf } from './engine/midifile';

export interface MidiInfo {
  /** Its file in midi/wtc/ (without .mid): `wtc1-02-fugue`. */
  readonly key: string;
  readonly book: number;
  readonly number: number;
  readonly part: 'prelude' | 'fugue';
  readonly bwv: number;
  /** As the library shows it: `I/2 Fugue in C minor`. */
  readonly title: string;
  readonly tonality: string;
  /** Mutopia's id, its typesetter, its licence and where it came from. */
  readonly mutopia: string;
  readonly maintainer: string;
  readonly licence: string;
  readonly source: string;
  /** Its title at Mutopia. */
  readonly original: string;
}

/** Every file of the MIDI library, in the order of the books. */
export const MIDI_FILES = index as readonly MidiInfo[];

const urls = import.meta.glob('/midi/wtc/*.mid', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const loaded = new Map<string, Promise<Smf>>();

/** A file of the MIDI library, read (its name: the library's title); fetched on first use. */
export function loadMidiFile(key: string): Promise<Smf> {
  let p = loaded.get(key);
  if (!p) {
    const info = MIDI_FILES.find((m) => m.key === key);
    const url = urls[`/midi/wtc/${key}.mid`];
    if (!info || !url) return Promise.reject(new Error(`midi/wtc/${key}.mid is missing`));
    p = url()
      .then((u) => fetch(u))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      })
      .then((b) => ({ ...readMidi(new Uint8Array(b)), name: `${info.title} (BWV ${info.bwv})` }));
    p.catch(() => loaded.delete(key)); // offline, a failed fetch: try again next time
    loaded.set(key, p);
  }
  return p;
}
