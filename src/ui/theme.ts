import { METER, MIX, QUIET, VOICE } from '../layout/miniature';
/**
 * The theme, for colours computed in code (SVG fill attributes can't read CSS
 * variables). Mirrors the note settings in app.css: change both together.
 */
/** A meter's colour (the ring its cells wear): the first is the accent; four, then round again (app.css: --meter-*). */
export const meterColour = (i: number) => `var(--meter-${((i % 4) + 4) % 4})`;

/** A miniature's node, painted (MiniGraph, tools/graphs.mjs): its fill, and whether it's drawn as a ring (a voice, a mix). */
export function miniPaint(colour: number): { fill: string; ring: boolean } {
  if (colour === VOICE) return { fill: 'var(--text)', ring: true };
  if (colour === MIX) return { fill: 'var(--accent)', ring: true };
  if (colour === METER) return { fill: 'color-mix(in oklab, var(--accent) 45%, var(--wheel-ref))', ring: false };
  if (colour === QUIET) return { fill: 'var(--wheel-ref)', ring: false };
  return { fill: noteColour(colour), ring: false };
}

const NOTE_S = 70;
const NOTE_L = 58;

/** How much an octave away from the natural range mutes a note's colour (its saturation, × this): 1 in it, less further off. */
export const octaveMute = (octave: number) => (octave === 0 ? 1 : 0.6 - 0.1 * (Math.abs(octave) - 1));

/** The octave of a frequency, counted from the natural range (C4 … C5 is 0), within ±3. */
export const octaveOfFreq = (f: number) => {
  const ratio = f / 261.63;
  return Math.max(-3, Math.min(3, ratio <= 2.0001 && ratio >= 1 ? 0 : Math.floor(Math.log2(ratio))));
};

/** A note's colour by hue (dim: a fainter one, for defaults and locked steps). */
/**
 * A note's colour: its hue the pitch class (C red …). In the natural range (0 … 12, C4 to C5: octave 0)
 * full colour; an octave away, muted — lighter above, darker below, more so the further.
 */
export const noteColour = (hue: number, dim = false, octave = 0) => {
  const o = Math.max(-3, Math.min(3, Math.round(octave)));
  const s = Math.round(NOTE_S * octaveMute(o));
  const l = Math.max(18, Math.min(88, (dim ? NOTE_L - 16 : NOTE_L) + o * 11));
  return `hsl(${hue} ${s}% ${l}%)`;
};

/** The sun's twelve blocks round its rim, by how bright their mode is (Lydian 1 … Locrian 0). */
export const blockColour = (light: number) => `hsl(45 ${30 + 60 * light}% ${14 + 62 * light}%)`;

/** A scope's spectrogram: a band at its note's hue, as bright as it is loud; silence the tube's black (`--scope-black`). */
const SCOPE_BLACK = '#050b08';
export const scopeBand = (hue: number, level: number) => (level > 0.01 ? `hsl(${hue} 80% ${Math.round(8 + level * 52)}%)` : SCOPE_BLACK);
