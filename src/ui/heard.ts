/**
 * What a socket into the sound card hears (the tower layout, docs/notes/tower-sky.md), as levels per semitone band
 * (0 … 1, `bands` of them from C0): its source's sound, or a groove's or a kit's drums together, which sound for it.
 * Playing, what sounds now (nothing where it is silent); stopped, its own partials, faint (`rest`). The socket's meter,
 * its spire in the sky and its share of the strip's sum all read it.
 */
import type { GraphContext } from './context';
import { bandsFromFFT, restingProfile } from '../layout/spectrum';
import { noteColour } from './theme';

export interface Heard {
  readonly left: Float32Array;
  readonly right: Float32Array;
  /** Stopped: its partials at rest, not a live spectrum. */
  readonly rest: boolean;
  /** A kit's drums: no note of their own. */
  readonly drums: boolean;
}

/** The voices that sound for `source`: a kit's drums (the kit, or a pattern read through one), else itself. */
function voicesOf(ctx: GraphContext, source: string): { names: string[]; drums: boolean } {
  const own = ctx.program.cells.get(source);
  const kit = own?.kit ? own : ctx.program.cells.get(own?.over ?? '');
  if (!kit?.kit) return { names: [source], drums: false };
  return { names: kit.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : [])), drums: true };
}

export function heard(ctx: GraphContext, source: string, bands: number): Heard {
  const playing = ctx.state !== 'stopped';
  const { names, drums } = voicesOf(ctx, source);
  const left = new Float32Array(bands);
  const right = new Float32Array(bands);
  const add = (a: Float32Array, b: Float32Array, k = 1) => {
    for (let i = 0; i < bands; i++) a[i] = Math.max(a[i] ?? 0, (b[i] ?? 0) * k);
  };
  let rest = true;
  for (const name of names) {
    const spec = playing ? ctx.sound.spectrum(name) : null;
    if (spec) {
      rest = false;
      add(left, bandsFromFFT(spec.left, spec.sampleRate, bands));
      add(right, bandsFromFFT(spec.right, spec.sampleRate, bands));
    } else if (!playing) {
      const p = restingProfile(ctx.program, name, ctx.shifts, bands);
      add(left, p.left);
      add(right, p.right);
    }
  }
  return { left, right, rest, drums };
}

/** A source's note colour now (its base frequency stopped), by pitch class; null for what has none (drums, noise). */
export function noteOf(ctx: GraphContext, source: string): string | null {
  const f = ctx.state !== 'stopped' ? ctx.sound.note(source) : null;
  const hz = f ?? ctx.program.cells.get(source)?.freq ?? 0;
  return hz > 0 ? noteColour(((((Math.round(12 * Math.log2(hz / 440)) + 9) % 12) + 12) % 12) * 30) : null;
}
