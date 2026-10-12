/**
 * The MIDI library (docs/ui/midi.md): MIDI files that come with the app, in collections, each a cell of the library
 * beside the tutorial and the examples. For now three of Bach's from the Mutopia Project: the Well-Tempered Clavier,
 * the Inventions and Sinfonias, and the Notebook for Anna Magdalena (midi/<set>/: each file as published, its licence
 * and who typeset it in midi/<set>/index.json and its README). A file is fetched when it opens, as an example's source
 * is; it opens as a MIDI document (text, playing), for Convert to cells to fold.
 */
import wtc from '../midi/wtc/index.json';
import inventions from '../midi/inventions/index.json';
import anna from '../midi/anna/index.json';
import { readMidi, type Smf } from './engine/midifile';

/** A collection: its folder in midi/, and its name (the library's cell, and a tag its files carry). */
export interface MidiSet {
  readonly id: string;
  readonly title: string;
}

/** A file of the library, as its set's index.json lists it. */
export interface MidiInfo {
  /** Its set (`wtc`), and its file there without .mid (`wtc1-02-fugue`): a key unique over the library. */
  readonly set: string;
  readonly key: string;
  /** As the library shows it: `I/2 Fugue in C minor`. */
  readonly title: string;
  /** Its catalogue number: `BWV 847`, `BWV Anh. 114`. */
  readonly opus: string;
  readonly tonality?: string;
  /** Mutopia's id, its typesetter, its licence and where it came from. */
  readonly mutopia: string;
  readonly maintainer: string;
  readonly licence: string;
  readonly source: string;
  /** Its title at Mutopia. */
  readonly original: string;
}

/** The collections, in the order the library shows them. */
export const MIDI_SETS: readonly MidiSet[] = [
  { id: 'wtc', title: 'Well-Tempered Clavier' },
  { id: 'inventions', title: 'Inventions and Sinfonias' },
  { id: 'anna', title: 'Anna Magdalena Notebook' },
];

const INDEX: Readonly<Record<string, readonly Omit<MidiInfo, 'set'>[]>> = { wtc, inventions, anna };

/** Every file of the MIDI library: set by set, each in its own order (the books, the catalogue). */
export const MIDI_FILES: readonly MidiInfo[] = MIDI_SETS.flatMap((s) => INDEX[s.id]!.map((m) => ({ ...m, set: s.id })));

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
  'Creative Commons Attribution-ShareAlike 2.5': 'https://creativecommons.org/licenses/by-sa/2.5/',
  'Creative Commons Attribution-ShareAlike 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'Creative Commons Attribution-ShareAlike 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** A file's credit. */
export const creditOf = (m: MidiInfo): Credit => ({
  piece: `Johann Sebastian Bach, ${m.original}, ${m.opus}`,
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

const urls = import.meta.glob('/midi/*/*.mid', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const loaded = new Map<string, Promise<Smf>>();

/** A file of the MIDI library, read (its name: the library's title; its copyright: its credit); fetched on first use. */
export function loadMidiFile(key: string): Promise<Smf> {
  let p = loaded.get(key);
  if (!p) {
    const info = MIDI_FILES.find((m) => m.key === key);
    const url = info && urls[`/midi/${info.set}/${key}.mid`];
    if (!info || !url) return Promise.reject(new Error(`the MIDI library has no ${key}.mid`));
    p = url()
      .then((u) => fetch(u))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      })
      .then((b) => {
        const smf = readMidi(new Uint8Array(b));
        // (its credit in its copyright field, where it has none of its own: a .mid saved from it carries it)
        return { ...smf, name: `${info.title} (${info.opus})`, copyright: smf.copyright ?? creditLines(info).join(' ') };
      });
    p.catch(() => loaded.delete(key)); // offline, a failed fetch: try again next time
    loaded.set(key, p);
  }
  return p;
}
