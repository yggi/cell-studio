/**
 * An out's spire (the tower layout, docs/notes/tower-sky.md): what it sounds as one glyph on the tower's scale — a big
 * dot at its fundamental, a hairline up over its range (in its out's colour), and a dot on each of its partials, as
 * big as it is strong (in its note's colour). The same glyph stands in the sky over its socket and marks it on the
 * strip, at another size. Live, the dots are its spectrum now and the big one swells with its level; stopped, its
 * partials at rest.
 */
import { bandFreq, F_HI, F_LO } from '../layout/spectrum';

/** What a spire draws: its fundamental's band, its partials (band, level 0 … 1, the strongest first), its top band. */
export interface Spire {
  readonly root: number;
  readonly level: number;
  readonly partials: readonly { readonly band: number; readonly level: number }[];
  readonly top: number;
}

/** Levels under this are silence. */
const FLOOR = 0.04;

/**
 * A spire from levels per semitone band (both channels together): its partials are the peaks over the floor (a band
 * louder than its neighbours); its fundamental the band of `hz` (its note now) when it sounds there, else its lowest
 * peak; its top the highest band over the floor. null when nothing sounds.
 */
export function spireOf(levels: Float32Array, hz: number | null, bands: number): Spire | null {
  // (a band out of the audible is silence: the lowest audible band can be a peak)
  const at = (b: number) => (bandFreq(b, bands) < 20 || bandFreq(b, bands) > 20000 ? 0 : (levels[b] ?? 0));
  const peaks: { band: number; level: number }[] = [];
  let top = -1;
  for (let b = 0; b < bands; b++) {
    // (the audible only: under 20 Hz is the structure's, and an FFT's rumble)
    if (at(b) <= FLOOR) continue;
    top = b;
    if (at(b) >= at(b - 1) && at(b) >= at(b + 1)) peaks.push({ band: b, level: at(b) });
  }
  if (!peaks.length) return null;
  // (the band nearest the note, if it sounds; else the lowest partial)
  const near = hz && hz > 0 ? Math.round((bands * Math.log(hz / F_LO)) / Math.log(F_HI / F_LO) - 0.5) : -1;
  const own = peaks.find((p) => Math.abs(p.band - near) <= 1);
  const root = own ?? peaks[0]!;
  return { root: root.band, level: root.level, partials: peaks.filter((p) => p !== root && p.band > root.band), top };
}

/**
 * The spire drawn on a canvas at x: `y(band)` its place on the scale, `size` the big dot's most radius (px), `colour`
 * rgb, its hairline's (its out's own: its section's); `dot(band)` a partial's colour (its note's). `alpha` dims it all
 * (an out switched off, or at rest).
 */
export function drawSpire(
  g: CanvasRenderingContext2D,
  x: number,
  y: (band: number) => number,
  s: Spire,
  size: number,
  colour: readonly number[],
  dot: (band: number) => readonly number[],
  alpha = 1,
): void {
  const c = (rgb: readonly number[], a: number) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a * alpha})`;
  const foot = y(s.root);
  // the hairline, over its range
  g.strokeStyle = c(colour, 0.7);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, foot);
  g.lineTo(x, y(s.top));
  g.stroke();
  // a dot a partial, as big as it is strong, in its note's colour
  for (const p of s.partials) {
    g.fillStyle = c(dot(p.band), 0.9);
    g.beginPath();
    g.arc(x, y(p.band), Math.max(1, size * 0.45 * p.level), 0, 2 * Math.PI);
    g.fill();
  }
  // the fundamental: the big dot, swelling with its level
  g.fillStyle = c(dot(s.root), 0.55 + 0.45 * s.level);
  g.beginPath();
  g.arc(x, foot, Math.max(2, size * (0.5 + 0.5 * s.level)), 0, 2 * Math.PI);
  g.fill();
}
