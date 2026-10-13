import { createContext } from 'svelte';
import type { CompileResult, Shifts } from '../engine/program';
import type { LiveState } from '../engine/live';
import { nodeStateOf, type Routing, type State } from '../engine/routing';
import type { LiveSource } from '../audio/live';
import { cellId } from '../engine/ids';
import type { TransportState } from '../audio/transport';

/**
 * Visual state of a node (engine/routing.ts decides it, for nodes and edges alike):
 *  off      — switched off by the user (hold to toggle)
 *  unrouted — on, but not part of anything that sounds
 *  on       — transport stopped (nothing is dimmed: routed or not)
 *  idle     — part of the sound, but not sounding at the transport's time (paused or playing)
 *  live     — sounding at the transport's time
 */
export type NodeState = State;

/**
 * The graph's shared state. `program`, `shifts`, `muted` and `routed` are one snapshot (`ui/snapshot.ts`), the one the
 * nodes and edges drawn now were made from: swapped together when the piece changes.
 */
export interface GraphContext {
  readonly program: CompileResult;
  readonly muted: ReadonlySet<string>;
  /** What can sound (routing.ts). */
  readonly routed: Routing;
  /** Stopped, paused or playing (audio/transport.ts). */
  readonly state: TransportState;
  readonly playing: boolean;
  /**
   * Where everything is at the transport's time: playheads, lit entries, beats, tables turned. Always there — at
   * rest it is time 0, paused the place paused at, playing the clock — so the heads are drawn in every state.
   */
  readonly heads: LiveState;
  /** `heads` when not stopped (what sounds, what is idle: the routing at that time), else null: stopped dims nothing. */
  readonly lit: LiveState | null;
  /** The edges that carry something now (drawn ids), or null when stopped: each edge reads its own, so the edge list isn't remade every step. */
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
  /** Where each bus's tap comes from (by edge id): null, the trunk, out of the owner; else the reader it comes on from (its centre and its wheel's radius). */
  readonly taps?: ReadonlyMap<string, { from: string; x: number; y: number; r: number } | null>;
  /** (the tower layout) The selectors drawn as pills (TapLooms.svelte): their own wheel left out, the pill draws them. */
  readonly pills?: ReadonlySet<string>;
  /**
   * Where an edge from `other` (its node id, and where that end is) meets `node`, when `node` isn't drawn as a wheel
   * round its centre (the tower layout's selectors, drawn as pills: their ports, their outline); else undefined, the rim.
   */
  anchor?(node: string, other: string, from: { x: number; y: number }, meter?: boolean): { x: number; y: number } | undefined;
  /** (#137) Small wheels with something close under them: their name goes round the rim, under the wheel, not in a pill. */
  readonly rimNamed?: ReadonlySet<string>;
  /** The wheels as they stand now (centres and radii): what an edge's label keeps off (layout/wire.ts wireLabel). */
  readonly wheels?: readonly import('../layout/wire').Disc[];
  /** The tower layout is on: a plain edge runs as a sigmoid, from the lower end's top to the upper end's bottom. */
  readonly towered?: boolean;
  toggle(id: string): void;
  /** Not playing: move where play starts by so many seconds (a turntable turned by hand). */
  nudge(seconds: number): void;
  /** Not playing: where play will start (seconds). */
  readonly cursor: number;
  /** Counts resets (reload from code): hands' traces — tapes' recordings, reels' turns — are gone. */
  readonly epoch: number;
  /** Move a node (held by its axle): start, move, end — where it ends, it stays (pinned). */
  move(id: string, phase: 'start' | 'move' | 'end', x: number, y: number): void;
  /** The sound (the Player): what plays now, and hands on it. */
  readonly sound: LiveSource;
  /** Cells sounding from the keys now (graph ids: state/keys.svelte.ts `lit`): live, as a strike's are. */
  readonly played?: ReadonlySet<string>;
  /** A cell's rows played live (the piano roll's key column, #251), through the keys' path (state/keys.svelte.ts); absent: the keys only light. */
  readonly rows?: RowKeys;
  /**
   * What the margin says about a cell (layout/side.ts): the numbers of the notes about it, and the colours of the scope
   * channels that watch it; absent: nothing.
   */
  marksOf?(name: string): readonly SideMark[];
  /** The margin's entry pointed at (hovered or focused), by its node id: its cells' marks light. */
  readonly sideLit?: string | null;
}

/** A mark a cell wears for the margin: a note's number, or a scope channel's colour. */
export interface SideMark {
  readonly entry: string;
  readonly mark: number;
  readonly colour?: string;
}

/** A row of a cell (a number written in it, with laps) pressed and let go, and the rows down now (pressed or held by the pedal). */
export interface RowKeys {
  press(cell: string, value: number): void;
  release(cell: string, value: number): void;
  held(cell: string): ReadonlySet<number>;
}

export const [getGraphContext, setGraphContext] = createContext<GraphContext>();

/** The cell a pointer met on a wheel when it met a bulb there (CellGlyph's `data-bulb`): its node id; else null. */
export function bulbAt(target: EventTarget | null): string | null {
  const name = (target as Element | null)?.closest?.('[data-bulb]')?.getAttribute('data-bulb');
  return name ? `cell:${name}` : null;
}

/**
 * Is a wheel to show the sound itself (its analyser), not its resting picture? Not while stopped: nothing sounds. Paused or
 * playing: a mix, a read head or the sound card (`signal`) always, whatever it carries; an instrument only when it is part
 * of what sounds (routed), else it keeps its default.
 */
export function hearing(ctx: GraphContext, name: string, signal: boolean): boolean {
  if (ctx.state === 'stopped') return false;
  if (signal) return true;
  const s = nodeState(ctx, cellId(name));
  return s !== 'unrouted' && s !== 'off';
}

export function nodeState(ctx: GraphContext, id: string): NodeState {
  const s = nodeStateOf(id, ctx.muted, ctx.routed, ctx.lit);
  return s === 'idle' && ctx.played?.has(id) ? 'live' : s;
}
