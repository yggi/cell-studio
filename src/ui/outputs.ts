/**
 * Probe (outputs at 12 o'clock, docs/notes/outputs-top.md): every wire leaves its source at the top of its wheel, and a
 * loom's bundle turns off its ring at 12 rather than towards its reader. Off unless the page is opened with
 * `?outputs=top` (the gallery: `OUTPUTS=top node tools/gallery.mjs golden`).
 */
export const OUTPUTS_TOP = typeof location !== 'undefined' && new URLSearchParams(location.search).get('outputs') === 'top';

/** The direction a loom's bundle leaves its wheel, radians (screen: −π/2 is up), or undefined: towards its reader. */
export const LOOM_EXIT = OUTPUTS_TOP ? -Math.PI / 2 : undefined;

/** The layout's options for the probe (`?outputs=top`): each reader pulled above what it reads, the spread round a node halved. */
export const PROBE_LAYOUT = OUTPUTS_TOP ? { upPull: 0.5, spread: 0.25 } : {};
