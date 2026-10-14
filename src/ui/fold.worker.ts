/**
 * Convert to cells off the main thread (docs/ui/midi.md): a MIDI file's notes as cells, folded (engine/fold), with the
 * story of the fold taken (engine/fold/story.ts) for the studio to replay (#390). One job a worker; the studio ends one
 * whose answer it no longer wants.
 */
import type { Smf } from '@yggi/cells/engine/midifile';
import { cellsFromMidi, type Imported } from '@yggi/cells/engine/midiimport';

export interface FoldJob {
  readonly smf: Smf;
  readonly title: string;
  /** Where the file came from, said as comments in the piece. */
  readonly credit: readonly string[];
}

export type FoldAnswer = { readonly kind: 'done'; readonly made: Imported };

self.onmessage = (e: MessageEvent<FoldJob>) => {
  const { smf, title, credit } = e.data;
  postMessage({ kind: 'done', made: cellsFromMidi(smf, title, { shorten: true, credit, story: true }) } satisfies FoldAnswer);
};
