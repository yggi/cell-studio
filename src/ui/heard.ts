/**
 * What a socket into the sound card hears (the tower layout, docs/notes/tower-sky.md), as levels per semitone band
 * (0 … 1, `bands` of them from C0): its source's sound, or a groove's or a kit's drums together, which sound for it.
 * Playing, what sounds now (nothing where it is silent); stopped, its own partials, faint (`rest`). The socket's meter,
 * its spire in the sky and its share of the strip's sum all read it: once a frame (the analysers are the cost).
 */
import type { GraphContext } from './context';
import { bandsFromFFT, restingProfile } from '../layout/spectrum';
import { hslRgb, noteHsl, UNIT_RGB } from './theme';

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

// (what was heard this frame: the socket's meter, the spire and the strip all ask, once each a frame — read the
// analyser once; for as long as the views take to draw again, 30 ms, then read again)
const FRAME = 30;
const memo = new WeakMap<GraphContext['sound'], { at: number; program: GraphContext['program']; got: Map<string, Heard> }>();
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function heard(ctx: GraphContext, source: string, bands: number): Heard {
  const now = clock();
  let m = memo.get(ctx.sound);
  if (!m || now - m.at > FRAME || m.program !== ctx.program) memo.set(ctx.sound, (m = { at: now, program: ctx.program, got: new Map() }));
  const key = `${ctx.state} ${bands} ${source}`;
  const had = m.got.get(key);
  if (had) return had;
  const fresh = hear(ctx, source, bands);
  m.got.set(key, fresh);
  return fresh;
}

function hear(ctx: GraphContext, source: string, bands: number): Heard {
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

/** A source's note now (Hz), playing; its base frequency stopped; null for what has none (drums, noise). */
export function noteHz(ctx: GraphContext, source: string): number | null {
  const f = ctx.state !== 'stopped' ? ctx.sound.note(source) : null;
  const hz = f ?? ctx.program.cells.get(source)?.freq ?? 0;
  return hz > 0 ? hz : null;
}

/**
 * A source's note now (its base frequency stopped) as its colour's hue, saturation and lightness: its pitch class's
 * hue, by its octave (C4 … B4 full, darker below, brighter above: noteHsl); null for what has no note (drums, noise).
 * The one colour of an out: its socket's meter, its spire and its light, its share of the strip's sum.
 */
function noteHslOf(ctx: GraphContext, source: string): [number, number, number] | null {
  const hz = noteHz(ctx, source);
  if (hz === null) return null;
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return noteHsl((((midi % 12) + 12) % 12) * 30, false, Math.floor(midi / 12) - 5);
}

/** noteHslOf as a CSS colour. */
export function noteOf(ctx: GraphContext, source: string): string | null {
  const c = noteHslOf(ctx, source);
  return c ? `hsl(${c[0]} ${c[1]}% ${c[2]}%)` : null;
}

/** An out's colour as rgb, for a canvas: its note's (noteHslOf), white where it has none (decision 036). */
export const outRgb = (ctx: GraphContext, source: string): readonly [number, number, number] => {
  const c = noteHslOf(ctx, source);
  return c ? hslRgb(...c) : UNIT_RGB;
};
