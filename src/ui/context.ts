import { createContext } from 'svelte';
import type { CompileResult, Shifts } from '../engine/compile';
import type { LiveState } from '../engine/realize';
import type { LiveSource } from '../audio/live';

/**
 * Visual state of a node:
 *  off      — switched off by the user (hold to toggle)
 *  unrouted — on, but not part of anything that sounds
 *  on       — part of the sound, transport stopped
 *  idle     — part of the sound, but not at the playhead right now
 *  live     — at the playhead right now
 */
export type NodeState = 'off' | 'unrouted' | 'on' | 'idle' | 'live';

/** The graph's shared state, and the sound (LiveSource: what plays now, hands on it). */
export interface GraphContext extends LiveSource {
  readonly program: CompileResult;
  readonly muted: ReadonlySet<string>;
  readonly routed: ReadonlySet<string>;
  readonly live: LiveState | null;
  /** The edges that carry something now (ids): each edge reads its own, so the edge list isn't remade every step. */
  readonly liveEdges: ReadonlySet<string>;
  /**
   * Changes only when what's drawn changes while playing: a table turns, or play
   * starts or stops (the live state itself is new every frame). Read it to redraw
   * wheels and labels when they need it, not every frame.
   */
  readonly turned: string;
  readonly shifts: Shifts;
  turn(name: string, shift: number): void;
  /** Move a free(…) value (a slider): rewrites it in the code. */
  setFree(spec: import('../engine/ast').FreeSpec, value: number | string): void;
  /** Open a cell's sheet (a link in another's: jump to it). */
  open(name: string): void;
  /** Where each edge's spline bends (by edge id), from the layout. */
  readonly bends: ReadonlyMap<string, { x: number; y: number }>;
  toggle(id: string): void;
  /** Stopped: move where play starts by so many seconds (a turntable turned by hand). */
  nudge(seconds: number): void;
  /** Stopped: where play will start (seconds). */
  readonly cursor: number;
  /** Counts resets (reload from code): hands' traces — tapes' recordings, reels' turns — are gone. */
  readonly epoch: number;
  /** Move a node (held by its axle): start, move, end — where it ends, it stays (pinned). */
  move(id: string, phase: 'start' | 'move' | 'end', x: number, y: number): void;
}

export const [getGraphContext, setGraphContext] = createContext<GraphContext>();

export function nodeState(ctx: GraphContext, id: string): NodeState {
  if (ctx.muted.has(id)) return 'off';
  if (!ctx.routed.has(id)) return 'unrouted';
  const live = ctx.live;
  if (!live) return 'on';
  // tapes, their heads, resonators, scopes: working parts — never at rest while anything plays
  const c = ctx.program.cells.get(id.slice('cell:'.length));
  if (c && (typeof c.params.play === 'string' || typeof c.params.write === 'string' || typeof c.params.body === 'string' || typeof c.params.scope === 'string')) return 'live';
  return live.cells.has(id.slice('cell:'.length)) ? 'live' : 'idle';
}
