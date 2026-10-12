/**
 * Convert to cells off the main thread (docs/ui/midi.md): a MIDI file's notes as cells, folded (engine/fold), the
 * fold watched as it runs. The piece as it is by then is sent at most every `every` ms of folding (and the first):
 * the graph forms as the folder works. One job a worker; the studio ends one whose answer it no longer wants.
 */
import type { Smf } from '../engine/midifile';
import { cellsFromMidi, type Imported } from '../engine/midiimport';

export interface FoldJob {
  readonly smf: Smf;
  readonly title: string;
  /** The least time between two steps sent (ms). */
  readonly every: number;
}

export type FoldAnswer = { readonly kind: 'step'; readonly source: string; readonly tool: string; readonly round: number } | { readonly kind: 'done'; readonly made: Imported };

self.onmessage = (e: MessageEvent<FoldJob>) => {
  const { smf, title, every } = e.data;
  let last = -Infinity;
  const made = cellsFromMidi(smf, title, {
    shorten: true,
    watch: (source, { tool, round }) => {
      const now = performance.now();
      if (tool !== 'start' && tool !== 'done' && now - last < every) return;
      last = now;
      postMessage({ kind: 'step', source: source(), tool, round } satisfies FoldAnswer);
    },
  });
  postMessage({ kind: 'done', made } satisfies FoldAnswer);
};
