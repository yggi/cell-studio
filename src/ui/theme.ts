/**
 * The theme, for colours computed in code (SVG fill attributes can't read CSS
 * variables). Mirrors the note settings in app.css: change both together.
 */
export const NOTE_S = 70;
export const NOTE_L = 58;

/** A note's colour by hue (dim: a fainter one, for defaults and locked steps). */
/**
 * A note's colour: its hue the pitch class (C red …). In the natural range (0 … 12, C4 to C5: octave 0)
 * full colour; an octave away, muted — lighter above, darker below, more so the further.
 */
export const noteColour = (hue: number, dim = false, octave = 0) => {
  const o = Math.max(-3, Math.min(3, Math.round(octave)));
  const s = o === 0 ? NOTE_S : Math.round(NOTE_S * (0.6 - 0.1 * (Math.abs(o) - 1)));
  const l = Math.max(18, Math.min(88, (dim ? NOTE_L - 16 : NOTE_L) + o * 11));
  return `hsl(${hue} ${s}% ${l}%)`;
};

/** The sun's twelve blocks round its rim, by how bright their mode is (Lydian 1 … Locrian 0). */
export const blockColour = (light: number) => `hsl(45 ${30 + 60 * light}% ${14 + 62 * light}%)`;

/** A scope's spectrogram: a band at its note's hue, as bright as it is loud; silence the tube's black (`--scope-black`). */
export const SCOPE_BLACK = '#050b08';
export const scopeBand = (hue: number, level: number) => (level > 0.01 ? `hsl(${hue} 80% ${Math.round(8 + level * 52)}%)` : SCOPE_BLACK);
