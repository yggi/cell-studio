/**
 * A followed session's section switches as the page drew them (#493, #478 rung 4), for `tools/session-probe.mjs`: what
 * its page recorded at each switch (the editor's text changed), set against the rung's bounds.
 *
 * At each switch the page keeps where every cell of the graph stood just before (its node's place, as the flow places
 * it) and where each stands 1.5 s after, the editor's scroll before and after (and whether its gutter and its coloured
 * copy are scrolled with it), and, all along, each frame's time and each long task. Over a window round the switch
 * (`WINDOW`), the frames' times and the long tasks are the switch's: its frame time at the 95th percentile, and its
 * main-thread work, the long tasks' time summed (a task under 50 ms the browser doesn't report: the switch is made of
 * longer ones, or it is no work to speak of). A cell's place is its centre, as the flow places it.
 */

/** One switch as the page recorded it: on its clock (ms), the cells' places (`translate(…px, …px)`), the scrolls. */
export interface SwitchRecord {
  readonly at: number;
  readonly before: Readonly<Record<string, string>>;
  readonly after: Readonly<Record<string, string>> | null;
  /** The cells (by id) whose line the new text rewrites: not cells that stay (in the tower layout a cell's height is its line's). */
  readonly rewritten?: readonly string[];
  /** The code's scroll before and after, and the most the new text can be scrolled (a shorter one can't keep it all). */
  readonly scroll: { readonly before: number; readonly after: number | null; readonly max?: number | null; readonly gutter: number | null; readonly paint: number | null };
}

/** The window round a switch its frames and long tasks are counted in (ms, from its moment). */
export const WINDOW = { from: -500, to: 1500 } as const;

/**
 * #493's bounds: main-thread work per switch under `work` ms (chosen: the 350 ms the session's sound is laid ahead,
 * `FEED_LEAD` in `audio/player.ts`, less a 100 ms margin, so a switch never holds the sound past its lead), frame time
 * at the 95th percentile under `frame` ms (a 60 Hz frame) give or take `jitter` (a frame's time is the display's
 * interval, 16.67 ms and its jitter, never under it: chosen, half a millisecond, a frame dropped being 16 ms more), and
 * the cells that stay moved by `moved` px.
 */
export const BOUNDS = { work: 250, frame: 16.7, jitter: 0.5, moved: 0 } as const;

export interface Switch {
  readonly at: number;
  /** The cells that stayed (their lines the same), came and went, and the farthest one that stayed moved (px). */
  readonly stayed: number;
  /** The cells there before and after whose lines were rewritten, and the farthest of them moved (px): no bound. */
  readonly rewritten: number;
  readonly rewrittenMoved: number;
  readonly came: number;
  readonly went: number;
  readonly moved: number;
  /** Those of the cells that stayed that moved, by id. */
  readonly movers: readonly string[];
  /** The long tasks' time in its window, and the longest (ms). */
  readonly work: number;
  readonly longest: number;
  /** Its frames' time at the 95th percentile (ms). */
  readonly frame: number;
  /** The editor's scrolls, as recorded. */
  readonly scroll: SwitchRecord['scroll'];
  /** Whether the editor kept its scroll, its gutter and coloured copy with it (within a pixel). */
  readonly scrollKept: boolean;
}

const place = (t: string): [number, number] | null => {
  const m = /translate\(\s*(-?[\d.e+-]+)px,\s*(-?[\d.e+-]+)px\s*\)/.exec(t);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/** The `p`th percentile (0 to 1) of some numbers, by the nearest rank; 0 for none. */
export function percentile(xs: readonly number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]!;
}

/** Each switch recorded (those whose `after` was taken), with its frames (each frame's time, ms) and long tasks ([start, duration], ms). */
export function switchesOf(records: readonly SwitchRecord[], frames: readonly number[], longTasks: readonly (readonly [number, number])[]): Switch[] {
  return records
    .filter((r) => r.after !== null)
    .map((r) => {
      const [from, to] = [r.at + WINDOW.from, r.at + WINDOW.to];
      const after = r.after!;
      let moved = 0;
      let stayed = 0;
      let rewritten = 0;
      let rewrittenMoved = 0;
      const movers: string[] = [];
      const lines = new Set(r.rewritten ?? []);
      for (const [id, t] of Object.entries(r.before)) {
        const [a, b] = [place(t), after[id] === undefined ? null : place(after[id])];
        if (!a || !b) continue;
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (lines.has(id)) {
          rewritten++;
          rewrittenMoved = Math.max(rewrittenMoved, d);
          continue;
        }
        stayed++;
        if (d > 0) movers.push(id);
        moved = Math.max(moved, d);
      }
      const tasks = longTasks.filter(([s, d]) => s + d > from && s < to).map(([, d]) => d);
      const times = frames.filter((t) => t >= from && t <= to);
      const deltas = times.slice(1).map((t, i) => t - times[i]!);
      const { before, after: scrolled, max, gutter, paint } = r.scroll;
      const near = (x: number | null) => x !== null && scrolled !== null && Math.abs(x - scrolled) <= 1;
      // (kept as far as the new text reaches)
      const keep = max === undefined || max === null ? before : Math.min(before, Math.max(0, max));
      return {
        at: r.at,
        stayed,
        rewritten,
        rewrittenMoved,
        came: Object.keys(after).filter((id) => !(id in r.before)).length,
        went: Object.keys(r.before).filter((id) => !(id in after)).length,
        moved,
        movers,
        work: tasks.reduce((a, d) => a + d, 0),
        longest: Math.max(0, ...tasks),
        frame: percentile(deltas, 0.95),
        scroll: r.scroll,
        scrollKept: scrolled !== null && Math.abs(scrolled - keep) <= 1 && near(gutter) && near(paint),
      };
    });
}

/** Whether every switch is within the bounds. */
export const within = (s: Switch): boolean => s.work < BOUNDS.work && s.frame < BOUNDS.frame + BOUNDS.jitter && s.moved <= BOUNDS.moved && s.scrollKept;
