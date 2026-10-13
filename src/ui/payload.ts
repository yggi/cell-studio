/**
 * Which payload an edge carries while a piece plays, and what its source sends at each step (docs/notes/edge-styles.md
 * §2). EdgePayload.svelte draws it; PulseEdge decides with these whether there is anything to draw.
 */
import type { Shape } from '../layout/wire';
import type { CellView, Fill } from '../layout/cellview';
import type { CompileResult } from '../engine/program';

/** A voice's waveforms (dough's names) as they look on a wire. */
const SHAPES: Record<string, Shape> = {
  sine: 'sine',
  tri: 'tri',
  triangle: 'tri',
  saw: 'saw',
  sawtooth: 'saw',
  square: 'square',
  pulse: 'square',
  white: 'noise',
  pink: 'noise',
  brown: 'noise',
};

/** What a voice's own sound looks like on a wire (D1): its source's waveform, else (a mix, a sample) a sine. */
export const shapeOf = (program: CompileResult, voice: string | null): Shape => SHAPES[String(voice ? (program.cells.get(voice)?.params.s ?? '') : '')] ?? 'sine';

/**
 * What a source sends at each of its steps, as its wheel colours it (a note, a level), or null when it has nothing to
 * draw there: its wheel's band at the step, else its number as a level — map=lin and amp as written (0 … 1), map=db as
 * a gain. An oscillator (`map=lin loop=…`) has no segments on its wheel, a curve: its units, spread over its steps.
 */
export function valuesOf(program: CompileResult, view: CellView | null, cell: string): ((local: number) => Fill | undefined) | null {
  const c = program.cells.get(cell);
  if (!view || !c) return null;
  const steps = Math.max(1, c.steps);
  const level = c.map?.kind === 'lin' || c.map?.kind === 'amp' ? (v: number) => v : c.map?.kind === 'db' ? (v: number) => 10 ** (v / 20) : null;
  const asLevel = (unit: number): Fill | undefined => {
    const atom = level ? c.units[unit]?.atom : undefined;
    return atom?.kind === 'note' && level ? { kind: 'level', v: Math.max(0, Math.min(1, level(atom.value))) } : undefined;
  };
  const at = (local: number): Fill | undefined => {
    if (!view.segments.length) return asLevel(Math.floor((local * c.units.length) / steps));
    const t = local / steps;
    const sg = view.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9);
    return sg?.bands.find((b) => b.kind === 'pitch' || b.kind === 'level') ?? (sg ? asLevel(sg.index) : undefined);
  };
  for (let i = 0; i < steps; i++) if (at(i)) return at;
  return null;
}

/** Which payload an edge carries while live, or none: a pointer stays still (D6), a note's link carries nothing. */
export type Payload = 'wave' | 'ticks' | 'notes' | 'levels';
const NOTE_PORTS = new Set(['voice', 'trigger', 'midi', 'pitch', 'play', 'write']);
/** A port whose wire carries notes (a melody into its voice, a gate's trigger=). */
export const carriesNotes = (port: string) => NOTE_PORTS.has(port);
export function payloadOf(band: string, port: string, pointer: boolean, groove = false): Payload | null {
  // (a groove reading its kit: its hits, as a melody's notes into its voice — not a pointer, though written over=)
  if (groove) return 'notes';
  // (a reference stays still whatever it points at, D6: a pointer to a sound shows where it comes from, it carries none)
  if (pointer) return null;
  if (band === 'audio') return 'wave';
  if (band === 'sync') return 'ticks';
  if (band !== 'cv') return null;
  return NOTE_PORTS.has(port) ? 'notes' : 'levels';
}
