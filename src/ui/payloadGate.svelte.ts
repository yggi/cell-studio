/**
 * Whether what travels along the edges is drawn now (EdgePayload): not with reduced motion (it is motion made in code,
 * which app.css's rule can't reach), and not while the page is behind (`eased`, payloadGate.ts). Watched while a piece
 * plays (PulseEdge, for an edge with a payload); stopping starts afresh.
 */
import { prefersReducedMotion } from 'svelte/motion';
import { load, onFrames } from '../audio/ticker';
import { PAYLOAD } from './theme';
import { eased, type Ease } from './payloadGate';

const fresh: Ease = { behind: false, since: 0, hold: 0 };
let ease = $state.raw(fresh);
let watchers = 0;
let stop: (() => void) | null = null;

/** The payload is drawn: motion allowed, and the page keeping up. */
export const payloadShown = (): boolean => !prefersReducedMotion.current && !ease.behind;

/** Watch the page's load while something may draw a payload; returns how to stop watching. */
export function watchLoad(): () => void {
  if (watchers++ === 0)
    stop = onFrames(
      (t) => {
        const next = eased(ease, load.scale, t / 1000, PAYLOAD.ease);
        if (next !== ease) ease = next;
      },
      () => 250,
      'clock',
    );
  return () => {
    if (--watchers > 0) return;
    stop?.();
    stop = null;
    ease = fresh;
  };
}
