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

/**
 * Recording, beside the three states (#210): a take of a braid left free (`free(0 2 4 ~)`). Record arms it (and starts
 * play); while playing, the next whole pass of the cell's loop is taken; at its end the take is held, and recording is
 * off again. Record pressed again, a pause or a stop calls it off; nothing is held.
 *
 * - **off**: nothing is recorded.
 * - **armed**: record was pressed; the pass to take has not begun (play starting, or the loop on its way round).
 * - **taking**: the pass is being taken.
 */
export type RecordState = 'off' | 'armed' | 'taking';

export type RecordEvent =
  /** The record button: off → armed; armed or taking → off (called off). */
  | 'record'
  /** The pass begins (only while playing): armed → taking. */
  | 'begin'
  /** The pass is over: taking → off (the take is held). */
  | 'done'
  /** Pause, Stop, a piece that ends: anything → off, nothing held. */
  | 'cancel';

export function recordTransition(record: RecordState, event: RecordEvent, transport: TransportState): RecordState {
  switch (event) {
    case 'record':
      return record === 'off' ? 'armed' : 'off';
    case 'begin':
      return record === 'armed' && transport === 'playing' ? 'taking' : record;
    case 'done':
      return record === 'taking' ? 'off' : record;
    case 'cancel':
      return 'off';
  }
}
