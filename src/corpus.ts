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

/** Where a file came from and on what terms: the piece, who typeset it, its licence (and where its text is), its page. */
export interface Credit {
  readonly piece: string;
  readonly by: string;
  readonly licence: string;
  readonly licenceUrl: string | null;
  readonly source: string;
  readonly id: string;
}

/** A licence's text, by its name as Mutopia gives it (public domain: none to link). */
const LICENCES: Readonly<Record<string, string>> = {
  'Creative Commons Attribution-ShareAlike 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'Creative Commons Attribution-ShareAlike 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** A file's credit. */
export const creditOf = (m: MidiInfo): Credit => ({
  piece: `Johann Sebastian Bach, ${m.original}, BWV ${m.bwv}`,
  by: m.maintainer,
  licence: m.licence,
  licenceUrl: LICENCES[m.licence] ?? null,
  source: m.source,
  id: m.mutopia,
});

/** A file's credit as lines of text, for comments: what it is, who typeset it, its licence, where it came from (and,
 * share-alike, that what is made from it shares it too). */
export function creditLines(m: MidiInfo): string[] {
  const c = creditOf(m);
  return [
    `${c.piece}.`,
    `Typeset by ${c.by} for the Mutopia Project (${c.id}): ${c.source}`,
    c.licenceUrl
      ? `Licence: ${c.licence} (${c.licenceUrl}); a transcription of it is shared under the same licence, crediting the typesetter and the Mutopia Project.`
      : `Licence: ${c.licence}.`,
  ];
}

const urls = import.meta.glob('/midi/wtc/*.mid', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const loaded = new Map<string, Promise<Smf>>();

/** A file of the MIDI library, read (its name: the library's title; its copyright: its credit); fetched on first use. */
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
      .then((b) => {
        const smf = readMidi(new Uint8Array(b));
        // (its credit in its copyright field, where it has none of its own: a .mid saved from it carries it)
        return { ...smf, name: `${info.title} (BWV ${info.bwv})`, copyright: smf.copyright ?? creditLines(info).join(' ') };
      });
    p.catch(() => loaded.delete(key)); // offline, a failed fetch: try again next time
    loaded.set(key, p);
  }
  return p;
}
