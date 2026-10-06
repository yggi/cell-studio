import { createContext } from 'svelte';
import type { CompileResult, Shifts } from '../engine/program';
import type { LiveState } from '../engine/live';
import { nodeStateOf, type Routing, type State } from '../engine/routing';
import type { LiveSource } from '../audio/live';

/**
 * Visual state of a node (engine/routing.ts decides it, for nodes and edges alike):
 *  off      — switched off by the user (hold to toggle)
 *  unrouted — on, but not part of anything that sounds
 *  on       — part of the sound, transport stopped
 *  idle     — part of the sound, but not sounding now
 *  live     — sounding now
 */
export type NodeState = State;

/** The graph's shared state, and the sound (LiveSource: what plays now, hands on it). */
export interface GraphContext extends LiveSource {
  readonly program: CompileResult;
  readonly muted: ReadonlySet<string>;
  /** What can sound (routing.ts). */
  readonly routed: Routing;
  readonly live: LiveState | null;
  /** The edges that carry something now (drawn ids), or null when nothing plays: each edge reads its own, so the edge list isn't remade every step. */
  readonly liveEdges: ReadonlySet<string> | null;
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
  return nodeStateOf(id, ctx.muted, ctx.routed, ctx.live);
}
