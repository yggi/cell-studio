/**
 * The transport's three states and how they change (pure; `Player` carries out what each one means).
 *
 * - **stopped**: the initial state, and after Stop. Time is 0, no hand has touched anything, nothing is
 *   recorded, nothing sounds.
 * - **paused**: anything that is neither playing nor initial: a place in the piece (a turned wheel, the
 *   slider), a hand on a resonator or a tape, the end of a piece that ends (`laps=`).
 * - **playing**: the clocks run.
 *
 * Stopped is not "time is 0": a touch at time 0 is paused. So the state is kept, not derived.
 */
export type TransportState = 'stopped' | 'paused' | 'playing';

export type TransportEvent =
  /** Play (from stopped or paused). */
  | 'play'
  /** Pause, or a piece that ends: playing → paused. Anything else stays. */
  | 'pause'
  /** Stop: back to the initial state, from anywhere. */
  | 'stop'
  /** A hand on anything, or a move to another place in time: it leaves the initial state, nothing else changes. */
  | 'touch';

export function transition(state: TransportState, event: TransportEvent): TransportState {
  switch (event) {
    case 'play':
      return 'playing';
    case 'pause':
      return state === 'playing' ? 'paused' : state;
    case 'stop':
      return 'stopped';
    case 'touch':
      return state === 'stopped' ? 'paused' : state;
  }
}
