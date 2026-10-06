/**
 * How much the page is struggling, so the live views can ease off before the sound starves: when frames
 * come late (the main thread is saturated), `load.scale` rises from 1 towards MAX and every view stretches
 * its refresh interval by it (spectra 15 → ~4 a second at worst); when frames come on time it falls back.
 * The sound doesn't depend on it — only how often the pictures are redrawn.
 */
const MAX = 4;
export const load = { scale: 1 };

let watching = false;
/** Start watching (once, from any view that refreshes by the frame). */
export function watchLoad(): void {
  if (watching || typeof requestAnimationFrame === 'undefined') return;
  watching = true;
  let last = 0;
  let ema = 16.7;
  let since = 0;
  const frame = (t: number) => {
    requestAnimationFrame(frame);
    if (document.hidden) {
      last = 0;
      return;
    }
    if (last) ema += (Math.min(250, t - last) - ema) * 0.1;
    last = t;
    // decide twice a second: 60 fps is ~17 ms a frame; past ~45 ms the page is behind
    if (t - since < 500) return;
    since = t;
    if (ema > 45) load.scale = Math.min(MAX, load.scale * 1.3);
    else if (ema < 26) load.scale = Math.max(1, load.scale / 1.3);
  };
  requestAnimationFrame(frame);
}
