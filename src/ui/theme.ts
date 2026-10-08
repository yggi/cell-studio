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

/** A note's colour as hue, saturation and lightness (s, l in %): noteColour's numbers, for the palette (palette.ts). */
export const noteHsl = (hue: number, dim = false, octave = 0): [number, number, number] => {
  const o = Math.max(-3, Math.min(3, Math.round(octave)));
  return [hue, Math.round(NOTE_S * octaveMute(o)), Math.max(18, Math.min(88, (dim ? NOTE_L - 16 : NOTE_L) + o * 11))];
};

/**
 * A note's colour: its hue the pitch class (C red …). In the natural range (0 … 12, C4 to C5: octave 0)
 * full colour; an octave away, muted — lighter above, darker below, more so the further. (dim: a fainter one, for
 * defaults and locked steps.)
 */
export const noteColour = (hue: number, dim = false, octave = 0) => {
  const [h, s, l] = noteHsl(hue, dim, octave);
  return `hsl(${h} ${s}% ${l}%)`;
};

/**
 * The palette's neutral (palette.ts): one hue for what has a level but no pitch (an envelope, a gain, a filter), and for
 * sound that hears several grids. Hue and saturation are the edge's at rest (app.css --edge, #5f6576: hsl 224 11% 42%);
 * its lightness is the level, from just above the edge at rest (0: 3:1 against --bg, palette.test.ts checks it) to
 * near the ink (1: --text).
 */
export const LEVEL = { hue: 224, s: 11, l0: 46, l1: 86 } as const;

/** Sound in the palette (palette.ts), as the spectrum wheels draw it: saturation in the natural range (%), and the
 * lightness (%) from silence to full — dark when quiet, as bright as it is loud. */
export const SOUND = { s: 90, l0: 6, l1: 56, lo: 3, hi: 85, octave: 6 } as const;

/** The sun's twelve blocks round its rim, by how bright their mode is (Lydian 1 … Locrian 0). */
export const blockColour = (light: number) => `hsl(45 ${30 + 60 * light}% ${14 + 62 * light}%)`;

/** A scope's spectrogram: a band at its note's hue, as bright as it is loud; silence the tube's black (`--scope-black`). */
const SCOPE_BLACK = '#050b08';
export const scopeBand = (hue: number, level: number) => (level > 0.01 ? `hsl(${hue} 80% ${Math.round(8 + level * 52)}%)` : SCOPE_BLACK);
