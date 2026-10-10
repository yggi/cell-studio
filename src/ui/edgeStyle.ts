/**
 * The edges' colour rule, in one place (docs/notes/edge-styles.md, step 3): a live edge takes the colour of what its
 * source pushes now, one palette for all (palette.ts), whatever kind of edge it is:
 *  - sync (a clock's ticks): the level of the tick;
 *  - audio: the hue of the sound's fundamental on its grid (a mix's, several: neutral);
 *  - CV into a port of notes: the note its source plays now, as the source's own wheel colours it; when the source
 *    shows none (a tape, a generator), the note the voice it feeds sounds now;
 *  - any other CV (an envelope, a gain, lpf=): a level on the neutral hue, the source's now.
 * What PulseEdge reads for each is lazy: only what the band needs is computed, every frame.
 */
import type { Fill } from '../layout/cellview';
import { palette, type PaletteGrid } from './palette';
import { noteColour } from './theme';

/** The CV ports that carry notes (a gate's trigger= is a melody, as a voice's is); any other CV is a level. */
const PITCH_PORTS = new Set(['voice', 'trigger', 'midi', 'pitch', 'play', 'write', 'braid', 'over']);

/** A wheel's fill, coloured as its wheel colours it: a note its pitch colour (its place on its grid found), a level the neutral hue. */
export const fillColour = (f: Fill | undefined) => (f?.kind === 'pitch' ? noteColour(f.hue, false, f.octave ?? 0) : f?.kind === 'level' ? palette('level', f.v) : 'var(--edge)');

/** A position on a grid: a note, or a sound's fundamental (null: none, or several). */
interface Placed {
  readonly position: number | null;
  readonly grid: PaletteGrid | null;
}

/** What an edge carries now, as its colour reads it. */
export interface EdgeNow {
  readonly band: string;
  readonly port: string;
  /** sync: the level of the tick it carries now (0 the bar's first … 3). */
  readonly tick?: () => number;
  /** audio: its sound's fundamental. */
  readonly sound?: () => Placed;
  /** CV: what its source pushes now (a braid's step under its playhead, a table's entry looked up). */
  readonly fill?: () => Fill | undefined;
  /** CV into a port of notes: the note the voice it feeds sounds now (when the source shows none). */
  readonly heard?: () => Placed;
}

/** The colour of a live edge (null: it carries nothing, a note's link). */
export function liveColour(now: EdgeNow): string | null {
  if (now.band === 'none') return null;
  if (now.band === 'sync') return palette('sync', now.tick?.() ?? 1);
  if (now.band === 'audio') {
    const s = now.sound?.() ?? { position: null, grid: null };
    return palette('audio', { position: s.position, loud: 1 }, s.grid);
  }
  const f = now.fill?.();
  if (!PITCH_PORTS.has(now.port)) return palette('level', f?.kind === 'level' ? f.v : 1);
  // (what the source shows, as its wheel colours it; else what the voice sounds; else a level at full)
  if (f?.kind === 'pitch' || f?.kind === 'level') return fillColour(f);
  const h = now.heard?.();
  return h && h.position !== null && h.grid ? palette('pitch', h.position, h.grid) : palette('level', 1);
}
