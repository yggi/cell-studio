/**
 * When what travels along the edges is held back for load (EdgePayload, docs/notes/edge-styles.md §2): once frames come
 * late (the ticker's `load.scale` over `PAYLOAD.ease.over`), until the page has kept up for `hold` seconds; each time it
 * falls behind again the hold doubles, up to `most`, so a payload that is itself the load doesn't flicker on and off.
 */
export interface Ease {
  readonly behind: boolean;
  /** When it was last behind (s). */
  readonly since: number;
  /** How long it must keep up before the payload comes back (s). */
  readonly hold: number;
}

export function eased(e: Ease, scale: number, t: number, cfg: { over: number; hold: number; most: number }): Ease {
  if (scale > cfg.over) return { behind: true, since: t, hold: e.behind ? e.hold : e.hold || cfg.hold };
  if (e.behind && t - e.since >= e.hold) return { behind: false, since: e.since, hold: Math.min(cfg.most, e.hold * 2) };
  return e;
}
